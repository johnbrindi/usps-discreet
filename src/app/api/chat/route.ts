import { after, NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { chatLimiter } from "@/lib/rate-limit";
import { isWithinSupportHours } from "@/lib/support-hours";
import {
  CHAT_COOKIE,
  chatCookieHeaders,
  chatImageUrl,
  chatPreview,
  decodeChatImage,
  hashVisitorToken,
  isSeen,
  newVisitorToken,
  type ChatMessageDTO,
} from "@/server/chat";
import { isBlocked } from "@/server/blocklist";
import { notifyStaff } from "@/server/push";
import { MAX_CHAT_IMAGE_BYTES, chatMessageSchema } from "@/validation/chat";

export const dynamic = "force-dynamic";

// Room for a base64-encoded photo plus the text.
const MAX_BODY_BYTES = 2_100_000;

function ipOf(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

const BLOCKED = { error: "You have been blocked.", blocked: true } as const;

function setChatCookie(res: NextResponse, token: string) {
  for (const c of chatCookieHeaders(token)) res.headers.append("set-cookie", c);
}

/** Loads the visitor's conversation. With `markRead`, the visitor is looking at it, so staff replies count as seen. */
async function loadMessages(token: string | undefined, markRead = false, ip?: string): Promise<ChatMessageDTO[]> {
  if (!token) return [];
  const where = { visitorTokenHash: hashVisitorToken(token) };
  if (markRead) {
    await db.chatConversation.updateMany({ where, data: { visitorReadAt: new Date(), ...(ip && { visitorIp: ip }) } });
  }
  const convo = await db.chatConversation.findUnique({
    where,
    select: {
      visitorReadAt: true,
      agentReadAt: true,
      // The newest messages, so a long conversation never stops showing new ones.
      messages: {
        orderBy: { createdAt: "desc" },
        take: 200,
        select: { id: true, sender: true, body: true, imageType: true, createdAt: true },
      },
    },
  });
  if (!convo) return [];
  return convo.messages.reverse().map(({ imageType, ...m }) => ({
    ...m,
    imageUrl: imageType ? chatImageUrl(m.id) : null,
    seen: isSeen(m, convo),
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function GET(req: NextRequest) {
  try {
    // The widget asks with ?read=1 only while the chat panel is open and the tab is visible.
    const read = req.nextUrl.searchParams.get("read") === "1";
    const token = req.cookies.get(CHAT_COOKIE)?.value;
    const ip = ipOf(req);
    if (await isBlocked({ tokenHash: token ? hashVisitorToken(token) : undefined, ip })) {
      return NextResponse.json(BLOCKED, { status: 403 });
    }
    const messages = await loadMessages(token, read, ip);
    const res = NextResponse.json({ messages, withinSupportHours: isWithinSupportHours() });
    if (token) setChatCookie(res, token);
    return res;
  } catch (err) {
    logger.error("chat.load_failed", err);
    return NextResponse.json({ error: "Chat is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  // CSRF: require same-origin JSON requests.
  const origin = req.headers.get("origin");
  if (!origin || new URL(origin).host !== req.headers.get("host")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Unsupported content type" }, { status: 415 });
  }
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Message too large" }, { status: 413 });
  }
  if (!chatLimiter(`chat:${ipOf(req)}`).allowed) {
    return NextResponse.json({ error: "You're sending messages too quickly. Please wait a minute." }, { status: 429 });
  }

  let json: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return NextResponse.json({ error: "Message too large" }, { status: 413 });
    json = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = chatMessageSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid message" }, { status: 400 });
  }
  const image = parsed.data.image ? decodeChatImage(parsed.data.image, MAX_CHAT_IMAGE_BYTES) : null;
  if (parsed.data.image && !image) {
    return NextResponse.json({ error: "That photo couldn't be sent. Try a JPEG or PNG under 1.5 MB." }, { status: 400 });
  }

  const token = req.cookies.get(CHAT_COOKIE)?.value ?? newVisitorToken();
  const ip = ipOf(req);

  try {
    const tokenHash = hashVisitorToken(token);
    if (await isBlocked({ tokenHash, ip })) return NextResponse.json(BLOCKED, { status: 403 });
    const conversationId = await db.$transaction(async (tx) => {
      // Read the block flag straight from the database too, so a block applies instantly here.
      const existing = await tx.chatConversation.findUnique({ where: { visitorTokenHash: tokenHash }, select: { blockedAt: true } });
      if (existing?.blockedAt) return null;
      const convo = await tx.chatConversation.upsert({
        where: { visitorTokenHash: tokenHash },
        create: { visitorTokenHash: tokenHash, visitorIp: ip },
        update: { lastMessageAt: new Date(), status: "OPEN", visitorIp: ip },
        select: { id: true },
      });
      await tx.chatMessage.create({
        data: {
          conversationId: convo.id,
          sender: "VISITOR",
          body: parsed.data.body,
          ...(image && { imageData: image.data, imageType: image.type }),
        },
      });
      return convo.id;
    });
    if (!conversationId) return NextResponse.json(BLOCKED, { status: 403 });
    // Alert staff devices after the response is sent, so the visitor never waits on it.
    after(() =>
      notifyStaff({
        title: "New chat message",
        body: chatPreview({ body: parsed.data.body, imageType: image?.type }),
        url: `/admin/messages/${conversationId}`,
        tag: `chat-${conversationId}`,
      }),
    );
    const res = NextResponse.json(
      { messages: await loadMessages(token, true, ip), withinSupportHours: isWithinSupportHours() },
      { status: 201 },
    );
    setChatCookie(res, token);
    return res;
  } catch (err) {
    logger.error("chat.send_failed", err);
    return NextResponse.json({ error: "Your message couldn't be sent. Please try again." }, { status: 503 });
  }
}
