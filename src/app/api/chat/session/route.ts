import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { clearBlocklistCache } from "@/server/blocklist";
import { CHAT_COOKIE, chatCookieHeaders, hashVisitorToken } from "@/server/chat";

export const dynamic = "force-dynamic";

function ipOf(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/**
 * Called by the chat widget on every public page load. Conversations started before blocking
 * existed have a cookie scoped to /api/chat (invisible to the site-wide gate) and no saved IP;
 * this is the one URL that still receives that cookie, so it:
 *  - moves the cookie to the whole site and records the visitor's IP, and
 *  - for a conversation staff have blocked, records the IP as blocked and answers 403 so the
 *    widget reloads into the "Access denied" page.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin || new URL(origin).host !== req.headers.get("host")) {
    // Not 403: the widget treats 403 as "blocked" and reloads.
    return NextResponse.json({ error: "Forbidden" }, { status: 400 });
  }
  const token = req.cookies.get(CHAT_COOKIE)?.value;
  if (!token) return new NextResponse(null, { status: 204 });
  const ip = ipOf(req);
  const knownIp = ip !== "unknown" ? ip : undefined;

  try {
    const where = { visitorTokenHash: hashVisitorToken(token) };
    const convo = await db.chatConversation.findUnique({ where, select: { blockedAt: true, blockedIp: true } });
    if (!convo) return new NextResponse(null, { status: 204 });

    let res: NextResponse;
    if (convo.blockedAt) {
      if (!convo.blockedIp && knownIp) {
        await db.chatConversation.update({ where, data: { blockedIp: knownIp, visitorIp: knownIp } });
        clearBlocklistCache();
      }
      res = NextResponse.json({ error: "You have been blocked.", blocked: true }, { status: 403 });
    } else {
      if (knownIp) await db.chatConversation.update({ where, data: { visitorIp: knownIp } });
      res = new NextResponse(null, { status: 204 });
    }
    for (const c of chatCookieHeaders(token)) res.headers.append("set-cookie", c);
    return res;
  } catch (err) {
    logger.error("chat.session_failed", err);
    return new NextResponse(null, { status: 204 });
  }
}
