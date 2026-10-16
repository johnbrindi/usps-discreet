import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDhlClient, parseDhlTracking } from "@/server/carriers/dhl";
import { requestJson, resetBreakers, type FetchLike } from "@/server/carriers/http";
import { parseCarrierTime } from "@/server/carriers/normalize";
import { createShip24Client, parseShip24Tracking } from "@/server/carriers/ship24";
import { CarrierError } from "@/server/carriers/types";
import { createUspsClient, parseUspsTracking } from "@/server/carriers/usps";

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

/** Queue of canned responses; records each request. */
function fakeFetch(...responses: Array<Response | Error>) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fn: FetchLike = async (url, init) => {
    calls.push({ url, init });
    const next = responses.shift();
    if (!next) throw new Error("unexpected request");
    if (next instanceof Error) throw next;
    return next;
  };
  return Object.assign(vi.fn(fn), { calls });
}

const kindOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return "resolved";
  } catch (err) {
    return err instanceof CarrierError ? err.kind : `other: ${String(err)}`;
  }
};

beforeEach(() => resetBreakers());

// ─── Fixtures shaped like each carrier's documented responses ────────────────

const uspsBody = {
  trackingNumber: "9400111899223197428490",
  mailClass: "USPS Ground Advantage",
  status: "Delivered, In/At Mailbox",
  statusCategory: "Delivered",
  statusSummary: "Your item was delivered in or at the mailbox at 11:02 am on October 14, 2026 in AUSTIN, TX 78701.",
  originCity: "BROOKLYN",
  originState: "NY",
  destinationCity: "AUSTIN",
  destinationState: "TX",
  trackingEvents: [
    {
      eventType: "Delivered, In/At Mailbox",
      eventTimestamp: "2026-10-14T11:02:00",
      GMTTimestamp: "2026-10-14T16:02:00Z",
      GMTOffset: "-05:00",
      eventCity: "AUSTIN",
      eventState: "TX",
      eventZIP: "78701",
      eventCountry: "",
      eventCode: "01",
    },
    {
      eventType: "Out for Delivery",
      eventTimestamp: "2026-10-14T07:10:00",
      GMTTimestamp: "2026-10-14T12:10:00Z",
      GMTOffset: "-05:00",
      eventCity: "AUSTIN",
      eventState: "TX",
      eventCode: "OF",
    },
    {
      eventType: "Arrived at USPS Regional Facility",
      eventTimestamp: "2026-10-12T21:40:00",
      GMTTimestamp: "2026-10-13T02:40:00Z",
      GMTOffset: "-05:00",
      eventCity: "AUSTIN TX DISTRIBUTION CENTER",
      eventState: "",
      eventCode: "10",
    },
    {
      eventType: "Shipping Label Created, USPS Awaiting Item",
      eventTimestamp: "2026-10-10T09:00:00",
      GMTTimestamp: "2026-10-10T13:00:00Z",
      GMTOffset: "-04:00",
      eventCity: "BROOKLYN",
      eventState: "NY",
      eventCode: "MA",
    },
  ],
};

const dhlBody = {
  shipments: [
    {
      id: "1234567890",
      service: "express",
      origin: { address: { addressLocality: "LEIPZIG - GERMANY", countryCode: "DE" } },
      destination: { address: { addressLocality: "NEW YORK - USA", countryCode: "US" } },
      status: {
        timestamp: "2026-10-15T14:30:00+02:00",
        location: { address: { addressLocality: "CINCINNATI HUB - USA" } },
        statusCode: "transit",
        status: "transit",
        description: "Arrived at DHL Sort Facility CINCINNATI HUB - USA",
      },
      estimatedTimeOfDelivery: "2026-10-17T18:00:00Z",
      details: { product: { productName: "EXPRESS WORLDWIDE" } },
      events: [
        {
          timestamp: "2026-10-15T14:30:00+02:00",
          location: { address: { addressLocality: "CINCINNATI HUB - USA" } },
          statusCode: "transit",
          description: "Arrived at DHL Sort Facility CINCINNATI HUB - USA",
        },
        {
          timestamp: "2026-10-14T09:00:00+02:00",
          location: { address: { addressLocality: "LEIPZIG - GERMANY", countryCode: "DE" } },
          statusCode: "pre-transit",
          description: "Shipment information received",
        },
      ],
    },
  ],
};

const ship24Body = {
  data: {
    trackings: [
      {
        tracker: { trackerId: "t-1", trackingNumber: "1Z999AA10123456784", courierCode: ["ups"] },
        shipment: { statusMilestone: "out_for_delivery", originCountryCode: "US", destinationCountryCode: "US", delivery: { estimatedDeliveryDate: "2026-10-16T00:00:00Z", service: "UPS Ground" } },
        events: [
          { eventId: "e-2", status: "Out For Delivery Today", occurrenceDatetime: "2026-10-16T08:01:00-04:00", location: "Atlanta, GA, US", courierCode: "ups", statusMilestone: "out_for_delivery", statusCode: "delivery_today" },
          { eventId: "e-1", status: "Shipper created a label", occurrenceDatetime: "2026-10-13T17:22:00", location: null, courierCode: "ups", statusMilestone: "info_received" },
          { eventId: "e-1", status: "Shipper created a label", occurrenceDatetime: "2026-10-13T17:22:00", location: null, courierCode: "ups", statusMilestone: "info_received" },
        ],
      },
    ],
  },
};

// ─── Parsers ────────────────────────────────────────────────────────────────

describe("USPS parser", () => {
  it("normalizes events, status, places and local time offsets", () => {
    const r = parseUspsTracking("9400111899223197428490", uspsBody);
    expect(r).toMatchObject({ carrierName: "USPS", status: "DELIVERED", serviceLevel: "USPS Ground Advantage" });
    expect(r.origin).toEqual({ city: "Brooklyn", region: "NY", country: "US" });
    expect(r.deliveredAt?.toISOString()).toBe("2026-10-14T16:02:00.000Z");
    expect(r.events.map((e) => e.status)).toEqual(["DELIVERED", "OUT_FOR_DELIVERY", "ARRIVED_AT_FACILITY", "INFO_RECEIVED"]);
    expect(r.events[0]).toMatchObject({ city: "Austin", region: "TX", country: "US", timeZone: "-05:00", carrierStatusCode: "01" });
  });

  it("produces the same event ids on every sync (idempotent upserts)", () => {
    const a = parseUspsTracking("x", uspsBody).events.map((e) => e.externalId);
    const b = parseUspsTracking("x", structuredClone(uspsBody)).events.map((e) => e.externalId);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(a.length);
  });

  it("treats an empty answer as not found and garbage as a bad response", () => {
    expect(() => parseUspsTracking("x", { trackingEvents: [] })).toThrow(expect.objectContaining({ kind: "not_found" }));
    expect(() => parseUspsTracking("x", { trackingEvents: "nope" })).toThrow(expect.objectContaining({ kind: "bad_response" }));
  });
});

describe("DHL parser", () => {
  it("maps codes and service names, keeps the city part of DHL localities", () => {
    const r = parseDhlTracking("1234567890", dhlBody);
    expect(r).toMatchObject({ carrierName: "DHL Express", status: "ARRIVED_AT_FACILITY", estimatedDelivery: "2026-10-17", serviceLevel: "EXPRESS WORLDWIDE" });
    expect(r.origin).toEqual({ city: "Leipzig", region: null, country: "DE" });
    expect(r.events[0]).toMatchObject({ city: "Cincinnati Hub", timeZone: "+02:00" });
    expect(r.events[1]?.status).toBe("INFO_RECEIVED");
    expect(r.deliveredAt).toBeNull();
  });
});

describe("Ship24 parser", () => {
  it("uses milestones, carrier event ids and de-duplicates repeated scans", () => {
    const r = parseShip24Tracking("1Z999AA10123456784", ship24Body);
    expect(r).toMatchObject({ carrierName: "UPS", status: "OUT_FOR_DELIVERY", serviceLevel: "UPS Ground", estimatedDelivery: "2026-10-16" });
    expect(r.events.map((e) => e.externalId)).toEqual(["ship24:e-2", "ship24:e-1"]);
    expect(r.events[0]?.occurredAt.toISOString()).toBe("2026-10-16T12:01:00.000Z");
  });

  it("reports pending while the aggregator is still fetching", () => {
    const pending = { data: { trackings: [{ shipment: { statusMilestone: "pending" }, events: [] }] } };
    expect(() => parseShip24Tracking("x", pending)).toThrow(expect.objectContaining({ kind: "pending" }));
  });
});

describe("timestamps", () => {
  it("handles offsets, Z, explicit offsets and naive values", () => {
    expect(parseCarrierTime("2026-10-14T11:02:00", "-05:00")).toEqual({ at: new Date("2026-10-14T16:02:00Z"), timeZone: "-05:00" });
    expect(parseCarrierTime("2026-10-14T11:02:00+0530")?.timeZone).toBe("+05:30");
    expect(parseCarrierTime("2026-10-14T11:02:00Z")).toEqual({ at: new Date("2026-10-14T11:02:00Z"), timeZone: null });
    expect(parseCarrierTime("2026-10-14T11:02:00")?.at.toISOString()).toBe("2026-10-14T11:02:00.000Z");
    expect(parseCarrierTime("yesterday")).toBeNull();
  });
});

// ─── HTTP resilience ────────────────────────────────────────────────────────

describe("requestJson", () => {
  const opts = (fetch: FetchLike) => ({ breakerKey: "test", fetch, backoffMs: 1 });

  it("retries 5xx and network errors, then succeeds", async () => {
    const f = fakeFetch(json(503, {}), new TypeError("fetch failed"), json(200, { ok: true }));
    await expect(requestJson("https://x", {}, opts(f))).resolves.toEqual({ status: 200, body: { ok: true } });
    expect(f).toHaveBeenCalledTimes(3);
  });

  it("does not retry auth failures or definite answers", async () => {
    const f1 = fakeFetch(json(401, {}));
    expect(await kindOf(requestJson("https://x", {}, opts(f1)))).toBe("auth");
    expect(f1).toHaveBeenCalledTimes(1);

    const f2 = fakeFetch(json(404, {}));
    const classify = (s: number) => (s === 404 ? new CarrierError("not_found", "nf") : undefined);
    expect(await kindOf(requestJson("https://x", {}, { ...opts(f2), classify }))).toBe("not_found");
    expect(f2).toHaveBeenCalledTimes(1);
  });

  it("waits out a short Retry-After but surfaces a long one to the scheduler", async () => {
    const short = fakeFetch(json(429, {}, { "retry-after": "0" }), json(200, {}));
    await expect(requestJson("https://x", {}, opts(short))).resolves.toMatchObject({ status: 200 });

    const long = fakeFetch(json(429, {}, { "retry-after": "120" }));
    const err = await requestJson("https://x", {}, opts(long)).catch((e: CarrierError) => e);
    expect(err).toMatchObject({ kind: "rate_limited", opts: { retryAfterMs: 120_000 } });
  });

  it("opens the circuit after repeated outages and stops calling the carrier", async () => {
    const f = fakeFetch(...Array.from({ length: 15 }, () => json(500, {})));
    for (let i = 0; i < 5; i++) expect(await kindOf(requestJson("https://x", {}, opts(f)))).toBe("unavailable");
    const callsBefore = f.mock.calls.length;
    expect(await kindOf(requestJson("https://x", {}, opts(f)))).toBe("unavailable");
    expect(f.mock.calls.length).toBe(callsBefore);
  });

  it("rejects non-JSON success bodies", async () => {
    const f = fakeFetch(new Response("<html>maintenance</html>", { status: 200 }));
    expect(await kindOf(requestJson("https://x", {}, opts(f)))).toBe("bad_response");
  });
});

// ─── Clients end-to-end against a fake network ──────────────────────────────

describe("USPS client", () => {
  it("fetches an OAuth token once, reuses it, and sends it as a bearer token", async () => {
    const f = fakeFetch(json(200, { access_token: "tok-1", expires_in: 28800 }), json(200, uspsBody), json(200, uspsBody));
    const usps = createUspsClient({ clientId: "id", clientSecret: "secret", fetch: f });
    await usps.track("9400111899223197428490");
    await usps.track("9400111899223197428490");
    expect(f.calls.map((c) => new URL(c.url).pathname)).toEqual([
      "/oauth2/v3/token",
      "/tracking/v3/tracking/9400111899223197428490",
      "/tracking/v3/tracking/9400111899223197428490",
    ]);
    expect(new Headers(f.calls[1]!.init!.headers).get("authorization")).toBe("Bearer tok-1");
  });

  it("refreshes a revoked token once", async () => {
    const f = fakeFetch(
      json(200, { access_token: "old", expires_in: 28800 }),
      json(401, {}),
      json(200, { access_token: "new", expires_in: 28800 }),
      json(200, uspsBody),
    );
    const r = await createUspsClient({ clientId: "id", clientSecret: "s", fetch: f }).track("9400111899223197428490");
    expect(r.status).toBe("DELIVERED");
    expect(new Headers(f.calls[3]!.init!.headers).get("authorization")).toBe("Bearer new");
  });

  it("maps 404 to not_found", async () => {
    const f = fakeFetch(json(200, { access_token: "t" }), json(404, { error: { message: "not found" } }));
    expect(await kindOf(createUspsClient({ clientId: "a", clientSecret: "b", fetch: f }).track("9400100000000000000000"))).toBe("not_found");
  });
});

describe("DHL and Ship24 clients", () => {
  it("DHL sends the API key header and maps 404", async () => {
    const f = fakeFetch(json(200, dhlBody), json(404, { title: "No result found" }));
    const dhl = createDhlClient({ apiKey: "k", fetch: f });
    await dhl.track("1234567890");
    expect(new Headers(f.calls[0]!.init!.headers).get("dhl-api-key")).toBe("k");
    expect(f.calls[0]!.url).toContain("trackingNumber=1234567890");
    expect(await kindOf(dhl.track("0000000000"))).toBe("not_found");
  });

  it("Ship24 POSTs the number with a bearer key", async () => {
    const f = fakeFetch(json(200, ship24Body));
    await createShip24Client({ apiKey: "k", fetch: f }).track("1Z999AA10123456784");
    expect(f.calls[0]!.init!.method).toBe("POST");
    expect(JSON.parse(String(f.calls[0]!.init!.body))).toEqual({ trackingNumber: "1Z999AA10123456784" });
    expect(new Headers(f.calls[0]!.init!.headers).get("authorization")).toBe("Bearer k");
  });
});
