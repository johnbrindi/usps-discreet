import "server-only";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { trackingLimiter } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { trackingNumberSchema } from "@/validation/tracking";
import { databaseProvider } from "./providers/database";
import type { PublicTrackingResult, TrackingProvider } from "./providers/types";

const providers: Record<string, TrackingProvider> = { database: databaseProvider };

export type TrackingLookup =
  | { kind: "found"; result: PublicTrackingResult }
  | { kind: "invalid"; message: string }
  | { kind: "not_found"; trackingNumber: string }
  | { kind: "rate_limited" }
  | { kind: "unavailable" };

/** Validates, rate-limits and resolves a tracking number through the configured provider. */
export async function lookupTracking(raw: string): Promise<TrackingLookup> {
  const parsed = trackingNumberSchema.safeParse(raw);
  if (!parsed.success) return { kind: "invalid", message: parsed.error.issues[0]?.message ?? "Invalid tracking number." };

  const ip = await clientIp();
  if (!trackingLimiter(`track:${ip}`).allowed) {
    logger.warn("tracking.rate_limited");
    return { kind: "rate_limited" };
  }

  try {
    const provider = providers[serverEnv().TRACKING_PROVIDER] ?? databaseProvider;
    const result = await provider.lookup(parsed.data);
    return result ? { kind: "found", result } : { kind: "not_found", trackingNumber: parsed.data };
  } catch (err) {
    logger.error("tracking.lookup_failed", err);
    return { kind: "unavailable" };
  }
}
