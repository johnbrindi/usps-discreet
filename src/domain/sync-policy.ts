import { isTerminal, type ShipmentStatus } from "./shipment-status";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** A read never triggers a carrier call more often than this per shipment (protects API quotas). */
export const READ_SYNC_MIN_INTERVAL_MS = 5 * MINUTE;
/** Stop polling a number the carrier has never recognised after this long. */
export const NOT_FOUND_GIVE_UP_MS = 7 * 24 * HOUR;
/** Stop polling a shipment with no new carrier activity after this long (labels that never ship). */
export const INACTIVE_GIVE_UP_MS = 45 * 24 * HOUR;
const MAX_BACKOFF_MS = 12 * HOUR;

export type SyncOutcome =
  | "ok"
  | "pending"
  | "not_found"
  | "rate_limited"
  | "auth"
  | "unavailable"
  | "bad_response"
  | "not_configured";

/** ±10% jitter so shipments created together don't all poll in the same second. */
function jitter(ms: number, rand: () => number) {
  return Math.round(ms * (0.9 + rand() * 0.2));
}

/**
 * When to poll the carrier next, or null to stop. Pure so the schedule is unit-tested.
 * - Delivered / returned: stop.
 * - Out for delivery: every 20 min (status changes within hours).
 * - Otherwise: the base interval (default 60 min), stretching to 6 h once nothing has moved for 3 days.
 * - Failures: exponential backoff from 5 min, capped at 12 h; the carrier's Retry-After wins if longer.
 */
export function nextSyncAt(input: {
  now: Date;
  outcome: SyncOutcome;
  status: ShipmentStatus;
  failureCount: number; // after this attempt
  lastEventAt: Date | null;
  createdAt: Date;
  baseIntervalMs?: number;
  retryAfterMs?: number;
  rand?: () => number;
}): Date | null {
  const { now, outcome, status } = input;
  const rand = input.rand ?? Math.random;
  const base = input.baseIntervalMs ?? HOUR;
  const at = (ms: number) => new Date(now.getTime() + jitter(ms, rand));

  if (outcome === "ok") {
    if (isTerminal(status)) return null;
    const lastActivity = input.lastEventAt ?? input.createdAt;
    const idleMs = now.getTime() - lastActivity.getTime();
    if (idleMs > INACTIVE_GIVE_UP_MS) return null;
    if (status === "OUT_FOR_DELIVERY") return at(Math.min(base, 20 * MINUTE));
    if (idleMs > 3 * 24 * HOUR) return at(Math.max(base, 6 * HOUR));
    return at(base);
  }

  if (outcome === "pending") return at(2 * MINUTE);
  if (outcome === "not_configured") return at(6 * HOUR);
  if (outcome === "not_found" && now.getTime() - input.createdAt.getTime() > NOT_FOUND_GIVE_UP_MS) return null;

  const backoff = Math.min(5 * MINUTE * 2 ** Math.max(0, input.failureCount - 1), MAX_BACKOFF_MS);
  return at(Math.max(backoff, input.retryAfterMs ?? 0));
}
