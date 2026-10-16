import { describe, expect, it } from "vitest";
import { detectCarrier, s10CheckDigit, statusFromCarrierText } from "@/domain/carriers";
import { nextSyncAt } from "@/domain/sync-policy";

describe("carrier detection", () => {
  it("recognises USPS IMpb numbers and strips the 420+ZIP routing prefix", () => {
    expect(detectCarrier("9400111899223197428490")).toMatchObject({ carrier: "USPS", providers: ["usps", "ship24", "trackingmore"] });
    expect(detectCarrier("420902109400111899223197428490")).toMatchObject({ carrier: "USPS", trackingNumber: "9400111899223197428490" });
    // ZIP+4 routing prefix (420 + 9 digits).
    expect(detectCarrier("4209021012349400111899223197428490")).toMatchObject({ trackingNumber: "9400111899223197428490" });
  });

  it("validates UPU S10 check digits and routes by origin country", () => {
    expect(s10CheckDigit("12345678")).toBe(5);
    expect(detectCarrier("RR123456785US")).toMatchObject({ carrier: "USPS", providers: ["usps", "ship24", "trackingmore"] });
    expect(detectCarrier("RR123456785GB")).toMatchObject({ carrier: null, providers: ["ship24", "trackingmore"] });
    // Wrong check digit: not treated as S10.
    expect(detectCarrier("RR123456784US").carrier).toBeNull();
  });

  it("recognises UPS, DHL and FedEx formats", () => {
    expect(detectCarrier("1Z999AA10123456784")).toMatchObject({ carrier: "UPS", providers: ["ship24", "trackingmore"] });
    expect(detectCarrier("1234567890")).toMatchObject({ carrier: "DHL", providers: ["dhl", "ship24", "trackingmore"] });
    expect(detectCarrier("JJD000390007827470").carrier).toBe("DHL");
    expect(detectCarrier("123456789012")).toMatchObject({ carrier: "FedEx", providers: ["ship24", "trackingmore"] });
  });

  it("falls back to the aggregator for anything else, including our own numbers", () => {
    expect(detectCarrier("MP12345678901234567890")).toEqual({ carrier: null, trackingNumber: "MP12345678901234567890", providers: ["ship24", "trackingmore"] });
  });
});

describe("carrier text → status", () => {
  it.each([
    ["Delivered, In/At Mailbox", "DELIVERED"],
    ["Out for Delivery", "OUT_FOR_DELIVERY"],
    ["Shipping Label Created, USPS Awaiting Item", "INFO_RECEIVED"],
    ["USPS picked up item", "ACCEPTED"],
    ["Arrived at USPS Regional Facility", "ARRIVED_AT_FACILITY"],
    ["Departed USPS Facility", "IN_TRANSIT"],
    ["In Transit to Next Facility", "IN_TRANSIT"],
    ["Delivery Attempted - No Access to Delivery Location", "EXCEPTION"],
    ["Undeliverable as Addressed", "EXCEPTION"],
    ["Not delivered - recipient not home", "EXCEPTION"],
    ["Return to Sender Processed", "RETURNED_TO_SENDER"],
    ["Shipping Label Cancelled", "EXCEPTION"],
  ] as const)("%s → %s", (text, status) => {
    expect(statusFromCarrierText(text)).toBe(status);
  });
});

describe("sync schedule", () => {
  const now = new Date("2026-10-16T12:00:00Z");
  const createdAt = new Date("2026-10-15T12:00:00Z");
  const base = { now, createdAt, rand: () => 0.5, failureCount: 0, lastEventAt: new Date("2026-10-16T10:00:00Z") };
  const mins = (d: Date | null) => (d ? (d.getTime() - now.getTime()) / 60_000 : null);

  it("stops polling at a final status", () => {
    expect(nextSyncAt({ ...base, outcome: "ok", status: "DELIVERED" })).toBeNull();
    expect(nextSyncAt({ ...base, outcome: "ok", status: "RETURNED_TO_SENDER" })).toBeNull();
  });

  it("polls faster when out for delivery and slower when idle", () => {
    expect(mins(nextSyncAt({ ...base, outcome: "ok", status: "IN_TRANSIT" }))).toBe(60);
    expect(mins(nextSyncAt({ ...base, outcome: "ok", status: "OUT_FOR_DELIVERY" }))).toBe(20);
    expect(mins(nextSyncAt({ ...base, outcome: "ok", status: "IN_TRANSIT", lastEventAt: new Date("2026-10-10T00:00:00Z") }))).toBe(360);
    expect(nextSyncAt({ ...base, outcome: "ok", status: "IN_TRANSIT", lastEventAt: new Date("2026-08-01T00:00:00Z") })).toBeNull();
  });

  it("backs off exponentially on failure, capped, honouring Retry-After", () => {
    expect(mins(nextSyncAt({ ...base, outcome: "unavailable", status: "IN_TRANSIT", failureCount: 1 }))).toBe(5);
    expect(mins(nextSyncAt({ ...base, outcome: "unavailable", status: "IN_TRANSIT", failureCount: 3 }))).toBe(20);
    expect(mins(nextSyncAt({ ...base, outcome: "unavailable", status: "IN_TRANSIT", failureCount: 20 }))).toBe(720);
    expect(mins(nextSyncAt({ ...base, outcome: "rate_limited", status: "IN_TRANSIT", failureCount: 1, retryAfterMs: 30 * 60_000 }))).toBe(30);
  });

  it("retries pending quickly and gives up on numbers never found after a week", () => {
    expect(mins(nextSyncAt({ ...base, outcome: "pending", status: "INFO_RECEIVED" }))).toBe(2);
    expect(nextSyncAt({ ...base, outcome: "not_found", status: "INFO_RECEIVED", failureCount: 4, createdAt: new Date("2026-10-01T00:00:00Z") })).toBeNull();
  });
});
