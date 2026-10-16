import "server-only";
import { Prisma } from "@prisma/client";
import type { CarrierProviderId } from "@/domain/carriers";
import { READ_SYNC_MIN_INTERVAL_MS, nextSyncAt, type SyncOutcome } from "@/domain/sync-policy";
import { db } from "@/lib/db";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getCarrierClient } from "@/server/carriers/registry";
import { CarrierError, type CarrierTracking } from "@/server/carriers/types";

export type SyncTrigger = "read" | "cron" | "manual" | "create";
export type SyncResult = { outcome: SyncOutcome | "skipped"; eventsAdded: number; eventsRemoved: number; error?: string };

type Tx = Prisma.TransactionClient;

/** Long enough for a slow carrier call plus the write; short enough that a crashed worker doesn't block for long. */
const LEASE_MS = 45_000;
const LOG_RETENTION_MS = 30 * 24 * 60 * 60_000;

const shipmentForSync = {
  id: true,
  trackingNumber: true,
  carrierProvider: true,
  carrierTrackingNumber: true,
  carrier: true,
  status: true,
  createdAt: true,
  syncFailureCount: true,
  serviceLevel: true,
  originCity: true,
  originCountry: true,
  destinationCity: true,
  destinationCountry: true,
} satisfies Prisma.ShipmentSelect;
type SyncShipment = Prisma.ShipmentGetPayload<{ select: typeof shipmentForSync }>;

function baseIntervalMs() {
  return serverEnv().CARRIER_SYNC_INTERVAL_MINUTES * 60_000;
}

/**
 * Writes a carrier result: reconciles events (insert new, drop ones the carrier no longer reports),
 * updates status/estimate/places and schedules the next poll — all in one transaction, so a
 * shipment never shows half an update.
 */
async function applyTracking(tx: Tx, s: SyncShipment, data: CarrierTracking, trigger: SyncTrigger, durationMs: number): Promise<SyncResult> {
  const now = new Date();
  const existing = await tx.trackingEvent.findMany({
    where: { shipmentId: s.id, source: "CARRIER_API" },
    select: { id: true, externalId: true },
  });
  const known = new Set(existing.map((e) => e.externalId));
  const incoming = new Set(data.events.map((e) => e.externalId));
  const toCreate = data.events.filter((e) => !known.has(e.externalId));
  // An empty event list is treated as a carrier glitch, never as "erase the history".
  const toDelete = data.events.length > 0 ? existing.filter((e) => !e.externalId || !incoming.has(e.externalId)).map((e) => e.id) : [];

  if (toDelete.length) await tx.trackingEvent.deleteMany({ where: { id: { in: toDelete } } });
  if (toCreate.length) {
    await tx.trackingEvent.createMany({
      data: toCreate.map((e) => ({
        shipmentId: s.id,
        status: e.status,
        description: e.description,
        city: e.city,
        region: e.region,
        country: e.country,
        timeZone: e.timeZone,
        occurredAt: e.occurredAt,
        source: "CARRIER_API" as const,
        externalId: e.externalId,
        carrierStatusCode: e.carrierStatusCode,
      })),
      skipDuplicates: true,
    });
  }

  const lastEventAt = data.events[0]?.occurredAt ?? null;
  await tx.shipment.update({
    where: { id: s.id },
    data: {
      status: data.status,
      carrierStatusText: data.statusText,
      deliveredAt: data.deliveredAt,
      // Staff-entered details win; carrier data only fills gaps.
      carrier: s.carrier ?? data.carrierName,
      serviceLevel: s.serviceLevel ?? data.serviceLevel,
      ...(!s.originCity && !s.originCountry && data.origin
        ? { originCity: data.origin.city, originRegion: data.origin.region, originCountry: data.origin.country }
        : {}),
      ...(!s.destinationCity && !s.destinationCountry && data.destination
        ? { destinationCity: data.destination.city, destinationRegion: data.destination.region, destinationCountry: data.destination.country }
        : {}),
      ...(data.estimatedDelivery
        ? { estimatedDeliveryDate: new Date(`${data.estimatedDelivery}T00:00:00Z`), estimateSource: `${data.carrierName} (carrier estimate)` }
        : {}),
      lastSyncedAt: now,
      nextSyncAt: nextSyncAt({ now, outcome: "ok", status: data.status, failureCount: 0, lastEventAt, createdAt: s.createdAt, baseIntervalMs: baseIntervalMs() }),
      syncLeaseUntil: null,
      syncFailureCount: 0,
      lastSyncError: null,
    },
  });
  await tx.carrierSyncLog.create({
    data: {
      shipmentId: s.id,
      provider: data.provider,
      trigger,
      outcome: "ok",
      httpStatus: 200,
      durationMs,
      eventsAdded: toCreate.length,
      eventsRemoved: toDelete.length,
    },
  });
  return { outcome: "ok", eventsAdded: toCreate.length, eventsRemoved: toDelete.length };
}

async function recordFailure(
  s: SyncShipment,
  provider: string,
  trigger: SyncTrigger,
  outcome: Exclude<SyncOutcome, "ok">,
  err: { message: string; httpStatus?: number; retryAfterMs?: number },
  durationMs: number,
): Promise<SyncResult> {
  const now = new Date();
  // "pending" and "not_configured" aren't the carrier failing, so they don't grow the backoff.
  const failureCount = outcome === "pending" || outcome === "not_configured" ? s.syncFailureCount : s.syncFailureCount + 1;
  const error = err.message.slice(0, 280);
  await db.$transaction([
    db.shipment.update({
      where: { id: s.id },
      data: {
        syncLeaseUntil: null,
        syncFailureCount: failureCount,
        lastSyncError: error,
        nextSyncAt: nextSyncAt({
          now,
          outcome,
          status: s.status,
          failureCount,
          lastEventAt: null,
          createdAt: s.createdAt,
          baseIntervalMs: baseIntervalMs(),
          retryAfterMs: err.retryAfterMs,
        }),
      },
    }),
    db.carrierSyncLog.create({
      data: { shipmentId: s.id, provider, trigger, outcome, httpStatus: err.httpStatus ?? null, durationMs, error },
    }),
  ]);
  const fields = { shipmentId: s.id, provider, outcome, httpStatus: err.httpStatus ?? null };
  // Credential or parsing problems need a developer; the rest are routine and retried automatically.
  if (outcome === "auth" || outcome === "bad_response") logger.error("carrier.sync_failed", undefined, fields);
  else logger.warn("carrier.sync_failed", fields);
  return { outcome, eventsAdded: 0, eventsRemoved: 0, error };
}

/** Calls the carrier for an already-loaded shipment and stores the outcome. Caller holds the lease. */
async function runSync(s: SyncShipment, trigger: SyncTrigger): Promise<SyncResult> {
  const provider = s.carrierProvider ?? "unknown";
  const client = getCarrierClient(s.carrierProvider);
  if (!client) {
    return recordFailure(s, provider, trigger, "not_configured", { message: `No credentials configured for provider "${provider}".` }, 0);
  }
  const started = Date.now();
  let data: CarrierTracking;
  try {
    data = await client.track(s.carrierTrackingNumber ?? s.trackingNumber);
  } catch (err) {
    const ms = Date.now() - started;
    if (err instanceof CarrierError) {
      return recordFailure(s, provider, trigger, err.kind, { message: err.message, ...err.opts }, ms);
    }
    logger.error("carrier.sync_crashed", err, { shipmentId: s.id, provider });
    return recordFailure(s, provider, trigger, "bad_response", { message: "Unexpected error while reading the carrier response." }, ms);
  }
  const ms = Date.now() - started;
  const result = await db.$transaction((tx) => applyTracking(tx, s, data, trigger, ms));
  logger.info("carrier.sync_ok", { shipmentId: s.id, provider, trigger, added: result.eventsAdded, removed: result.eventsRemoved, ms });
  return result;
}

/**
 * Polls the carrier for one shipment. A database lease makes this safe to call from many places at
 * once (page views, cron, the admin button): only one caller does the work, the rest get "skipped".
 * Without `force`, it only runs when the shipment is due.
 */
export async function syncShipment(shipmentId: string, trigger: SyncTrigger, opts: { force?: boolean } = {}): Promise<SyncResult> {
  const now = new Date();
  const due: Prisma.ShipmentWhereInput[] = opts.force
    ? []
    : [
        { nextSyncAt: { lte: now } },
        ...(trigger === "read"
          ? [{ OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: new Date(now.getTime() - READ_SYNC_MIN_INTERVAL_MS) } }] }]
          : []),
      ];
  const claimed = await db.shipment.updateMany({
    where: {
      id: shipmentId,
      trackingMode: "CARRIER",
      OR: [{ syncLeaseUntil: null }, { syncLeaseUntil: { lt: now } }],
      AND: due,
    },
    data: { syncLeaseUntil: new Date(now.getTime() + LEASE_MS) },
  });
  if (claimed.count === 0) return { outcome: "skipped", eventsAdded: 0, eventsRemoved: 0 };

  const s = await db.shipment.findUniqueOrThrow({ where: { id: shipmentId }, select: shipmentForSync });
  try {
    return await runSync(s, trigger);
  } catch (err) {
    // Database failure mid-sync: release the lease so the next caller can retry.
    await db.shipment.update({ where: { id: shipmentId }, data: { syncLeaseUntil: null } }).catch(() => {});
    throw err;
  }
}

/** Cron entry point: syncs shipments whose next poll is due, a few at a time, within a time budget. */
export async function syncDueShipments(opts: { limit?: number; concurrency?: number; budgetMs?: number } = {}) {
  const limit = opts.limit ?? 25;
  const deadline = Date.now() + (opts.budgetMs ?? 50_000);
  const now = new Date();
  const due = await db.shipment.findMany({
    where: { trackingMode: "CARRIER", nextSyncAt: { lte: now }, OR: [{ syncLeaseUntil: null }, { syncLeaseUntil: { lt: now } }] },
    orderBy: { nextSyncAt: "asc" },
    take: limit,
    select: { id: true },
  });

  const counts: Record<string, number> = {};
  const queue = [...due];
  const worker = async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      if (Date.now() > deadline) break;
      try {
        const r = await syncShipment(next.id, "cron");
        counts[r.outcome] = (counts[r.outcome] ?? 0) + 1;
      } catch (err) {
        counts.error = (counts.error ?? 0) + 1;
        logger.error("carrier.cron_item_failed", err, { shipmentId: next.id });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(opts.concurrency ?? 3, due.length) }, worker));

  const pruned = await db.carrierSyncLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - LOG_RETENTION_MS) } } });
  return { due: due.length, processed: Object.values(counts).reduce((a, b) => a + b, 0), outcomes: counts, prunedLogs: pruned.count };
}

/**
 * Stores a carrier number found by a public lookup as a carrier-synced shipment, so later lookups
 * are served from the database and kept fresh by the scheduler. `data` is null when the carrier
 * accepted the number but has no results yet. Returns the shipment's tracking number.
 */
export async function importCarrierShipment(input: {
  trackingNumber: string;
  carrierTrackingNumber: string;
  provider: CarrierProviderId;
  data: CarrierTracking | null;
  durationMs: number;
}): Promise<string> {
  const now = new Date();
  try {
    return await db.$transaction(async (tx) => {
      const s = await tx.shipment.create({
        data: {
          trackingNumber: input.trackingNumber,
          trackingMode: "CARRIER",
          createdVia: "PUBLIC_LOOKUP",
          carrierProvider: input.provider,
          carrierTrackingNumber: input.carrierTrackingNumber,
          syncLeaseUntil: new Date(now.getTime() + LEASE_MS),
          nextSyncAt: now,
        },
        select: shipmentForSync,
      });
      if (input.data) {
        await applyTracking(tx, s, input.data, "read", input.durationMs);
      } else {
        await tx.shipment.update({
          where: { id: s.id },
          data: {
            syncLeaseUntil: null,
            nextSyncAt: nextSyncAt({ now, outcome: "pending", status: s.status, failureCount: 0, lastEventAt: null, createdAt: now }),
          },
        });
        await tx.carrierSyncLog.create({
          data: { shipmentId: s.id, provider: input.provider, trigger: "read", outcome: "pending", durationMs: input.durationMs },
        });
      }
      return s.trackingNumber;
    });
  } catch (err) {
    // Two visitors looked up the same new number at once; the other request already stored it.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return input.trackingNumber;
    throw err;
  }
}
