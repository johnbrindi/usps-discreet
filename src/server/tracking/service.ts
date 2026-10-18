import "server-only";
import { after } from "next/server";
import { detectCarrier } from "@/domain/carriers";
import { db } from "@/lib/db";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createRateLimiter, trackingLimiter } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { getCarrierClient } from "@/server/carriers/registry";
import { CarrierError } from "@/server/carriers/types";
import { trackingNumberSchema } from "@/validation/tracking";
import { databaseProvider } from "./providers/database";
import type { PublicTrackingResult, TrackingProvider } from "./providers/types";
import { importCarrierShipment, syncShipment } from "./sync";

const providers: Record<string, TrackingProvider> = { database: databaseProvider };

export type TrackingLookup =
  | { kind: "found"; result: PublicTrackingResult }
  /** A carrier-tracked number the carrier hasn't returned data for yet. */
  | { kind: "pending"; trackingNumber: string; carrierName: string | null }
  | { kind: "invalid"; message: string }
  | { kind: "not_found"; trackingNumber: string }
  | { kind: "rate_limited" }
  | { kind: "unavailable" };

/** How long a first-ever sync may hold up the page before we show "fetching" instead. */
const FIRST_SYNC_BUDGET_MS = 9_000;

/** Numbers every carrier rejected recently — stops repeated typos from spending API quota. */
const negativeCache = new Map<string, number>();
const NEGATIVE_TTL_MS = 10 * 60_000;
let publicLookupBudget: ReturnType<typeof createRateLimiter> | undefined;

function recentlyNotFound(n: string) {
  const until = negativeCache.get(n);
  if (until && until > Date.now()) return true;
  negativeCache.delete(n);
  return false;
}
function rememberNotFound(n: string) {
  if (negativeCache.size > 5_000) negativeCache.clear();
  negativeCache.set(n, Date.now() + NEGATIVE_TTL_MS);
}

const withBudget = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<"timeout">((r) => setTimeout(() => r("timeout"), ms))]);

/** Validates, rate-limits and resolves a tracking number through the configured provider. */
export async function lookupTracking(raw: string): Promise<TrackingLookup> {
  const parsed = trackingNumberSchema.safeParse(raw);
  if (!parsed.success) return { kind: "invalid", message: parsed.error.issues[0]?.message ?? "Invalid tracking number." };
  const number = parsed.data;

  const ip = await clientIp();
  if (!trackingLimiter(`track:${ip}`).allowed) {
    logger.warn("tracking.rate_limited");
    return { kind: "rate_limited" };
  }

  try {
    const detected = detectCarrier(number);
    const provider = providers[serverEnv().TRACKING_PROVIDER] ?? databaseProvider;
    // Fetch the public view at the same time as the match below. For numbers staff entered (the usual
    // case) it is the right record, which saves a full database round trip.
    const speculative = provider.lookup(number).catch(() => undefined);
    const shipment = await db.shipment.findFirst({
      where: { OR: [{ trackingNumber: number }, { carrierTrackingNumber: { in: [number, detected.trackingNumber] } }] },
      orderBy: { createdAt: "asc" },
      select: { id: true, trackingNumber: true, trackingMode: true, lastSyncedAt: true, nextSyncAt: true, carrier: true },
    });

    if (!shipment) return await lookupUnknownCarrierNumber(number);

    let freshAfterSync = false;

    if (shipment.trackingMode === "CARRIER" && shipment.nextSyncAt && shipment.nextSyncAt <= new Date()) {
      if (shipment.lastSyncedAt) {
        // Stale-while-revalidate: serve stored scans now, refresh after the response is sent.
        after(() => syncShipment(shipment.id, "read").catch((err) => logger.error("tracking.background_sync_failed", err)));
      } else {
        const first = syncShipment(shipment.id, "read").catch((err) => logger.error("tracking.first_sync_failed", err));
        await withBudget(first, FIRST_SYNC_BUDGET_MS);
        freshAfterSync = true;
      }
    }

    const reuse = shipment.trackingNumber === number && !freshAfterSync;
    const result = (reuse && (await speculative)) || (await provider.lookup(shipment.trackingNumber));
    if (!result) return { kind: "not_found", trackingNumber: number };
    if (result.carrier && !result.carrier.checkedAt && result.events.length === 0) {
      return { kind: "pending", trackingNumber: result.trackingNumber, carrierName: shipment.carrier };
    }
    return { kind: "found", result };
  } catch (err) {
    logger.error("tracking.lookup_failed", err);
    return { kind: "unavailable" };
  }
}

/**
 * A number staff never added. When PUBLIC_CARRIER_LOOKUP is on, ask the carrier(s) its format points
 * to; a hit is stored as a carrier-synced shipment so repeat visits cost no API calls.
 */
async function lookupUnknownCarrierNumber(number: string): Promise<TrackingLookup> {
  const env = serverEnv();
  const notFound = { kind: "not_found", trackingNumber: number } as const;
  if (env.PUBLIC_CARRIER_LOOKUP !== "true" || recentlyNotFound(number)) return notFound;

  const detected = detectCarrier(number);
  const candidates = detected.providers.filter((p) => getCarrierClient(p));
  if (candidates.length === 0) return notFound;

  publicLookupBudget ??= createRateLimiter({ limit: env.PUBLIC_CARRIER_LOOKUP_DAILY_LIMIT, windowMs: 24 * 60 * 60_000, maxKeys: 1 });
  if (!publicLookupBudget("global").allowed) {
    logger.warn("tracking.public_lookup_budget_exhausted");
    return { kind: "unavailable" };
  }

  let transientFailure = false;
  for (const providerId of candidates) {
    const started = Date.now();
    try {
      const data = await getCarrierClient(providerId)!.track(detected.trackingNumber);
      const tn = await importCarrierShipment({
        trackingNumber: number,
        carrierTrackingNumber: detected.trackingNumber,
        provider: providerId,
        data,
        durationMs: Date.now() - started,
      });
      const result = await databaseProvider.lookup(tn);
      return result ? { kind: "found", result } : notFound;
    } catch (err) {
      if (!(err instanceof CarrierError)) throw err;
      if (err.kind === "pending") {
        await importCarrierShipment({
          trackingNumber: number,
          carrierTrackingNumber: detected.trackingNumber,
          provider: providerId,
          data: null,
          durationMs: Date.now() - started,
        });
        return { kind: "pending", trackingNumber: number, carrierName: detected.carrier };
      }
      if (err.kind !== "not_found") {
        transientFailure = true;
        logger.warn("tracking.public_lookup_failed", { provider: providerId, kind: err.kind });
      }
    }
  }
  if (transientFailure) return { kind: "unavailable" };
  rememberNotFound(number);
  return notFound;
}
