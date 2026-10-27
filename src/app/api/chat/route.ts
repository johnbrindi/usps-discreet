import { after, NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { chatLimiter } from "@/lib/rate-limit";
import { isWithinSupportHours } from "@/lib/support-hours";
import {
  CHAT_COOKIE,
  chatImageUrl,
  chatPreview,
  decodeChatImage,
  hashVisitorToken,
  isSeen,
  newVisitorToken,
  type ChatMessageDTO,
} from "@/server/chat";
import { notifyStaff } from "@/server/push";
import { MAX_CHAT_IMAGE_BYTES, chatMessageSchema } from "@/validation/chat";

export const dynamic = "force-dynamic";

// Room for a base64-encoded photo plus the text.
const MAX_BODY_BYTES = 2_100_000;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function ipOf(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Loads the visitor's conversation. With `markRead`, the visitor is looking at it, so staff replies count as seen. */
async function loadMessages(token: string | undefined, markRead = false): Promise<ChatMessageDTO[]> {
  if (!token) return [];
  const where = { visitorTokenHash: hashVisitorToken(token) };
  if (markRead) await db.chatConversation.updateMany({ where, data: { visitorReadAt: new Date() } });
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
    const messages = await loadMessages(req.cookies.get(CHAT_COOKIE)?.value, read);
    return NextResponse.json({ messages, withinSupportHours: isWithinSupportHours() });
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

  let token = req.cookies.get(CHAT_COOKIE)?.value;
  const isNew = !token;
  token ??= newVisitorToken();

  try {
    const tokenHash = hashVisitorToken(token);
    const conversationId = await db.$transaction(async (tx) => {
      const convo = await tx.chatConversation.upsert({
        where: { visitorTokenHash: tokenHash },
        create: { visitorTokenHash: tokenHash },
        update: { lastMessageAt: new Date(), status: "OPEN" },
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
      { messages: await loadMessages(token, true), withinSupportHours: isWithinSupportHours() },
      { status: 201 },
    );
    if (isNew) {
      res.cookies.set(CHAT_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/api/chat",
        maxAge: COOKIE_MAX_AGE,
      });
    }
    return res;
  } catch (err) {
    logger.error("chat.send_failed", err);
    return NextResponse.json({ error: "Your message couldn't be sent. Please try again." }, { status: 503 });
  }
}
