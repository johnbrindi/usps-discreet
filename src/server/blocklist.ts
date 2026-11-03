import "server-only";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Visitors staff have blocked from the chat. A blocked visitor is refused the whole website,
 * matched by their chat cookie (token hash) or by the IP address they last chatted from.
 *
 * Checked on every public request, so the list is cached in memory for a few seconds; blocking
 * or unblocking clears it on this instance, and other instances pick it up within CACHE_MS.
 */
const CACHE_MS = 15_000;

type Blocklist = { tokenHashes: Set<string>; ips: Set<string> };

let cached: { list: Blocklist; at: number } | null = null;
let inflight: Promise<Blocklist> | null = null;

async function fetchBlocklist(): Promise<Blocklist> {
  const rows = await db.chatConversation.findMany({
    where: { blockedAt: { not: null } },
    select: { visitorTokenHash: true, blockedIp: true },
  });
  return {
    tokenHashes: new Set(rows.map((r) => r.visitorTokenHash)),
    ips: new Set(rows.flatMap((r) => (r.blockedIp && r.blockedIp !== "unknown" ? [r.blockedIp] : []))),
  };
}

async function getBlocklist(): Promise<Blocklist | null> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.list;
  inflight ??= fetchBlocklist().finally(() => (inflight = null));
  try {
    const list = await inflight;
    cached = { list, at: Date.now() };
    return list;
  } catch (err) {
    logger.error("blocklist.load_failed", err);
    // Keep using the last known list rather than letting blocked visitors back in on a DB hiccup.
    return cached?.list ?? null;
  }
}

export function clearBlocklistCache() {
  cached = null;
}

export async function isBlocked({ tokenHash, ip }: { tokenHash?: string; ip?: string }) {
  const list = await getBlocklist();
  if (!list) return false;
  return (!!tokenHash && list.tokenHashes.has(tokenHash)) || (!!ip && ip !== "unknown" && list.ips.has(ip));
}
