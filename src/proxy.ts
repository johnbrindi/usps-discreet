import { NextResponse, type NextRequest } from "next/server";
import { isBlocked } from "@/server/blocklist";
import { CHAT_COOKIE, hashVisitorToken } from "@/server/chat";

function ipOf(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

const BLOCKED_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Access denied</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f5f6f8; color: #1a2233;
         font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; padding: 16px; box-sizing: border-box; }
  main { max-width: 28rem; text-align: center; }
  h1 { font-size: 1.5rem; margin: 0 0 .5rem; }
  p { margin: 0; color: #556070; }
</style>
</head>
<body><main><h1>Access denied</h1><p>You no longer have access to this website.</p></main></body>
</html>`;

/** Refuses blocked chat visitors (see src/server/blocklist.ts) the whole public website. */
export async function proxy(req: NextRequest) {
  const token = req.cookies.get(CHAT_COOKIE)?.value;
  const blocked = await isBlocked({ tokenHash: token ? hashVisitorToken(token) : undefined, ip: ipOf(req) });
  if (!blocked) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "You have been blocked.", blocked: true }, { status: 403 });
  }
  return new NextResponse(BLOCKED_PAGE, {
    status: 403,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

export const config = {
  // Everything except the staff console, staff sign-in, and static build assets, so staff can never lock themselves out.
  matcher: ["/((?!admin|api/auth|_next/static|_next/image|sw\\.js).*)"],
};
