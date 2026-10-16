import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CarrierClient, CarrierTracking } from "@/server/carriers/types";
import { CarrierError } from "@/server/carriers/types";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => void fn() }));

/** The carrier the code under test talks to; each test sets its behaviour. */
const fake = { track: vi.fn<CarrierClient["track"]>() };
vi.mock("@/server/carriers/registry", () => ({
  getCarrierClient: (id: string | null) => (id === "usps" ? { id: "usps", track: fake.track } : undefined),
  configuredProviders: () => ["usps"],
}));

if (!process.env.INTEGRATION_DATABASE_URL) throw new Error("Set INTEGRATION_DATABASE_URL to a disposable database.");

const { db } = await import("@/lib/db");
const { importCarrierShipment, syncDueShipments, syncShipment } = await import("@/server/tracking/sync");

const ev = (id: string, iso: string, status: CarrierTracking["status"], description: string) => ({
  externalId: id,
  status,
  carrierStatusCode: null,
  description,
  city: "Austin",
  region: "TX",
  country: "US",
  timeZone: "-05:00",
  occurredAt: new Date(iso),
});

const tracking = (events: CarrierTracking["events"], over: Partial<CarrierTracking> = {}): CarrierTracking => ({
  provider: "usps",
  carrierName: "USPS",
  trackingNumber: "9400111899223197428490",
  status: events[0]?.status ?? "INFO_RECEIVED",
  statusText: events[0]?.description ?? null,
  serviceLevel: "Ground Advantage",
  origin: { city: "Brooklyn", region: "NY", country: "US" },
  destination: { city: "Austin", region: "TX", country: "US" },
  estimatedDelivery: "2026-10-18",
  deliveredAt: null,
  events,
  ...over,
});

const E1 = ev("a", "2026-10-10T13:00:00Z", "INFO_RECEIVED", "Shipping Label Created");
const E2 = ev("b", "2026-10-12T02:40:00Z", "ARRIVED_AT_FACILITY", "Arrived at USPS Regional Facility");
const E3 = ev("c", "2026-10-14T12:10:00Z", "OUT_FOR_DELIVERY", "Out for Delivery");

async function newShipment(n = Math.random().toString().slice(2, 24).padEnd(22, "0")) {
  return db.shipment.create({
    data: { trackingNumber: `94${n.slice(0, 20)}`, trackingMode: "CARRIER", carrierProvider: "usps", nextSyncAt: new Date() },
  });
}

beforeEach(async () => {
  fake.track.mockReset();
  await db.shipment.deleteMany({});
});
afterAll(async () => {
  await db.shipment.deleteMany({});
  await db.$disconnect();
});

describe("carrier sync against PostgreSQL", () => {
  it("stores carrier events, status, places, estimate and schedules the next poll", async () => {
    const s = await newShipment();
    fake.track.mockResolvedValue(tracking([E2, E1]));
    const r = await syncShipment(s.id, "cron");
    expect(r).toMatchObject({ outcome: "ok", eventsAdded: 2, eventsRemoved: 0 });

    const after = await db.shipment.findUniqueOrThrow({ where: { id: s.id }, include: { events: true, syncLogs: true } });
    expect(after).toMatchObject({
      status: "ARRIVED_AT_FACILITY",
      carrier: "USPS",
      originCity: "Brooklyn",
      destinationCity: "Austin",
      estimateSource: "USPS (carrier estimate)",
      syncFailureCount: 0,
      syncLeaseUntil: null,
    });
    expect(after.events.every((e) => e.source === "CARRIER_API")).toBe(true);
    expect(after.nextSyncAt!.getTime()).toBeGreaterThan(Date.now() + 50 * 60_000);
    expect(after.syncLogs).toHaveLength(1);
  });

  it("is idempotent: re-syncing the same data adds nothing", async () => {
    const s = await newShipment();
    fake.track.mockResolvedValue(tracking([E2, E1]));
    await syncShipment(s.id, "cron");
    const again = await syncShipment(s.id, "manual", { force: true });
    expect(again).toMatchObject({ outcome: "ok", eventsAdded: 0, eventsRemoved: 0 });
    expect(await db.trackingEvent.count({ where: { shipmentId: s.id } })).toBe(2);
  });

  it("reconciles: adds new scans and drops ones the carrier withdrew", async () => {
    const s = await newShipment();
    fake.track.mockResolvedValueOnce(tracking([E2, E1]));
    await syncShipment(s.id, "cron");
    fake.track.mockResolvedValueOnce(tracking([E3, E1]));
    const r = await syncShipment(s.id, "manual", { force: true });
    expect(r).toMatchObject({ eventsAdded: 1, eventsRemoved: 1 });
    const ids = (await db.trackingEvent.findMany({ where: { shipmentId: s.id }, orderBy: { occurredAt: "desc" } })).map((e) => e.externalId);
    expect(ids).toEqual(["c", "a"]);
  });

  it("never wipes history when the carrier briefly returns no events", async () => {
    const s = await newShipment();
    fake.track.mockResolvedValueOnce(tracking([E2, E1]));
    await syncShipment(s.id, "cron");
    fake.track.mockResolvedValueOnce(tracking([], { status: "ARRIVED_AT_FACILITY" }));
    await syncShipment(s.id, "manual", { force: true });
    expect(await db.trackingEvent.count({ where: { shipmentId: s.id } })).toBe(2);
  });

  it("lets exactly one of many concurrent callers hit the carrier", async () => {
    const s = await newShipment();
    fake.track.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 300));
      return tracking([E1]);
    });
    const results = await Promise.all(Array.from({ length: 6 }, () => syncShipment(s.id, "read", { force: true })));
    expect(results.filter((r) => r.outcome === "ok")).toHaveLength(1);
    expect(results.filter((r) => r.outcome === "skipped")).toHaveLength(5);
    expect(fake.track).toHaveBeenCalledTimes(1);
  });

  it("records failures, backs off and releases the lease", async () => {
    const s = await newShipment();
    fake.track.mockRejectedValue(new CarrierError("unavailable", "usps: HTTP 503", { httpStatus: 503 }));
    await syncShipment(s.id, "cron");
    await syncShipment(s.id, "manual", { force: true });
    const after = await db.shipment.findUniqueOrThrow({ where: { id: s.id }, include: { syncLogs: true } });
    expect(after).toMatchObject({ syncFailureCount: 2, lastSyncError: "usps: HTTP 503", syncLeaseUntil: null });
    const mins = (after.nextSyncAt!.getTime() - Date.now()) / 60_000;
    expect(mins).toBeGreaterThan(8);
    expect(mins).toBeLessThan(12);
    expect(after.syncLogs.map((l) => l.outcome)).toEqual(["unavailable", "unavailable"]);

    fake.track.mockResolvedValue(tracking([E1]));
    await syncShipment(s.id, "manual", { force: true });
    expect(await db.shipment.findUniqueOrThrow({ where: { id: s.id } })).toMatchObject({ syncFailureCount: 0, lastSyncError: null });
  });

  it("stops polling once delivered", async () => {
    const s = await newShipment();
    const D = ev("d", "2026-10-14T16:02:00Z", "DELIVERED", "Delivered, In/At Mailbox");
    fake.track.mockResolvedValue(tracking([D, E3, E1], { deliveredAt: D.occurredAt }));
    await syncShipment(s.id, "cron");
    expect(await db.shipment.findUniqueOrThrow({ where: { id: s.id } })).toMatchObject({ status: "DELIVERED", nextSyncAt: null, deliveredAt: D.occurredAt });
  });

  it("only syncs when due unless forced, and the cron picks up due shipments", async () => {
    const due = await newShipment();
    const later = await db.shipment.update({ where: { id: (await newShipment()).id }, data: { nextSyncAt: new Date(Date.now() + 3600_000) } });
    fake.track.mockResolvedValue(tracking([E1]));
    expect((await syncShipment(later.id, "cron")).outcome).toBe("skipped");
    const summary = await syncDueShipments();
    expect(summary).toMatchObject({ due: 1, processed: 1, outcomes: { ok: 1 } });
    expect(fake.track).toHaveBeenCalledTimes(1);
    expect((await db.shipment.findUniqueOrThrow({ where: { id: due.id } })).lastSyncedAt).not.toBeNull();
  });

  it("imports a public lookup once even when two visitors race", async () => {
    const input = { trackingNumber: "9400111899223197428490", carrierTrackingNumber: "9400111899223197428490", provider: "usps" as const, data: tracking([E2, E1]), durationMs: 5 };
    await Promise.all([importCarrierShipment(input), importCarrierShipment(input)]);
    const rows = await db.shipment.findMany({ include: { events: true } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ createdVia: "PUBLIC_LOOKUP", trackingMode: "CARRIER", status: "ARRIVED_AT_FACILITY" });
    expect(rows[0]!.events).toHaveLength(2);
  });
});
