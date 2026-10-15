import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { chatLimiter } from "@/lib/rate-limit";
import { isWithinSupportHours } from "@/lib/support-hours";
import { CHAT_COOKIE, hashVisitorToken, newVisitorToken, type ChatMessageDTO } from "@/server/chat";
import { chatMessageSchema } from "@/validation/chat";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8 * 1024;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function ipOf(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

async function loadMessages(token: string | undefined): Promise<ChatMessageDTO[]> {
  if (!token) return [];
  const convo = await db.chatConversation.findUnique({
    where: { visitorTokenHash: hashVisitorToken(token) },
    select: {
      messages: { orderBy: { createdAt: "asc" }, take: 200, select: { id: true, sender: true, body: true, createdAt: true } },
    },
  });
  return (convo?.messages ?? []).map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }));
}

export async function GET(req: NextRequest) {
  try {
    const messages = await loadMessages(req.cookies.get(CHAT_COOKIE)?.value);
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

  let token = req.cookies.get(CHAT_COOKIE)?.value;
  const isNew = !token;
  token ??= newVisitorToken();

  try {
    const tokenHash = hashVisitorToken(token);
    await db.$transaction(async (tx) => {
      const convo = await tx.chatConversation.upsert({
        where: { visitorTokenHash: tokenHash },
        create: { visitorTokenHash: tokenHash },
        update: { lastMessageAt: new Date(), status: "OPEN" },
        select: { id: true },
      });
      await tx.chatMessage.create({ data: { conversationId: convo.id, sender: "VISITOR", body: parsed.data.body } });
    });
    const res = NextResponse.json(
      { messages: await loadMessages(token), withinSupportHours: isWithinSupportHours() },
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
