import "server-only";
import { headers } from "next/headers";

/** Best-effort client IP for rate limiting. Trust x-forwarded-for only behind a proxy you control. */
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
