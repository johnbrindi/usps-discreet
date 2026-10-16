import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetBreakers, type FetchLike } from "@/server/carriers/http";
import { classifyShip24Error } from "@/server/carriers/ship24";
import { createTrackingMoreClient, parseTrackingMoreTracking } from "@/server/carriers/trackingmore";
import { CarrierError } from "@/server/carriers/types";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function fakeFetch(...responses: Response[]) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fn: FetchLike = async (url, init) => {
    calls.push({ url, init });
    const next = responses.shift();
    if (!next) throw new Error("unexpected request");
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

// Shaped like the v4 "Tracking" model (docs: MODEL → Tracking, Checkpoint).
const tracking = {
  tracking_number: "9400111899223197428490",
  courier_code: "usps",
  delivery_status: "pickup",
  substatus: "pickup001",
  latest_event: "Out for Delivery,AUSTIN, TX 78701,2026-10-14 07:10:00",
  service_code: "USPS Ground Advantage",
  origin_country: "US",
  destination_country: "US",
  destination_city: "AUSTIN",
  destination_state: "TX",
  scheduled_delivery_date: "2026-10-14",
  origin_info: {
    courier_code: "usps",
    trackinfo: [
      {
        checkpoint_date: "2026-10-14T07:10:00-05:00",
        tracking_detail: "Out for Delivery",
        location: "AUSTIN, TX 78701",
        city: "AUSTIN",
        state: "TX",
        country_iso2: "US",
        checkpoint_delivery_status: "pickup",
        checkpoint_delivery_substatus: "pickup001",
      },
      {
        checkpoint_date: "2026-10-12 02:40:00",
        tracking_detail: "Arrived at USPS Regional Facility",
        location: "AUSTIN TX DISTRIBUTION CENTER",
        checkpoint_delivery_status: "transit",
        checkpoint_delivery_substatus: "transit002",
      },
      { checkpoint_date: "2026-10-10", tracking_detail: "Shipping Label Created", checkpoint_delivery_status: "inforeceived" },
    ],
  },
  destination_info: null,
};

describe("TrackingMore parser", () => {
  it("maps statuses, sub-statuses, places and all three date formats", () => {
    const r = parseTrackingMoreTracking("9400111899223197428490", tracking);
    expect(r).toMatchObject({ provider: "trackingmore", carrierName: "USPS", status: "OUT_FOR_DELIVERY", estimatedDelivery: "2026-10-14" });
    expect(r.destination).toEqual({ city: "Austin", region: "TX", country: "US" });
    expect(r.events.map((e) => [e.status, e.occurredAt.toISOString()])).toEqual([
      ["OUT_FOR_DELIVERY", "2026-10-14T12:10:00.000Z"],
      ["ARRIVED_AT_FACILITY", "2026-10-12T02:40:00.000Z"],
      ["INFO_RECEIVED", "2026-10-10T00:00:00.000Z"],
    ]);
    expect(r.events[0]).toMatchObject({ city: "Austin", region: "TX", country: "US", timeZone: "-05:00" });
    expect(r.events[1]!.city).toBe("Austin TX Distribution Center");
    // Stable ids across syncs.
    expect(parseTrackingMoreTracking("x", tracking).events.map((e) => e.externalId)).toEqual(r.events.map((e) => e.externalId));
  });

  it("recognises returns, pending and not-found", () => {
    const returned = { ...tracking, delivery_status: "exception", substatus: "exception011" };
    expect(parseTrackingMoreTracking("x", returned).status).toBe("RETURNED_TO_SENDER");
    expect(() => parseTrackingMoreTracking("x", { delivery_status: "pending", origin_info: { trackinfo: [] } })).toThrow(/not available yet/);
    expect(() => parseTrackingMoreTracking("x", { delivery_status: "notfound" })).toThrow(/no tracking information/);
    expect(() => parseTrackingMoreTracking("x", "garbage")).toThrow(/unexpected response shape/);
  });
});

describe("TrackingMore client", () => {
  const client = (fetch: FetchLike) => createTrackingMoreClient({ apiKey: "tm-key", fetch });

  it("creates the tracking with the detected courier and returns the real-time result", async () => {
    const f = fakeFetch(json(200, { meta: { code: 200 }, data: tracking }));
    const r = await client(f).track("9400111899223197428490");
    expect(r.status).toBe("OUT_FOR_DELIVERY");
    expect(f.calls[0]!.url).toBe("https://api.trackingmore.com/v4/trackings/create");
    expect(JSON.parse(String(f.calls[0]!.init!.body))).toEqual({ tracking_number: "9400111899223197428490", courier_code: "usps" });
    expect((f.calls[0]!.init!.headers as Record<string, string>)["Tracking-Api-Key"]).toBe("tm-key");
  });

  it("reads an already-registered number back without using a credit", async () => {
    const f = fakeFetch(json(400, { meta: { code: 4101, message: "Tracking No. already exists." }, data: null }), json(200, { meta: { code: 200 }, data: [tracking] }));
    const r = await client(f).track("9400111899223197428490");
    expect(r.events).toHaveLength(3);
    expect(f.calls[1]!.url).toBe("https://api.trackingmore.com/v4/trackings/get?tracking_numbers=9400111899223197428490&courier_code=usps");
  });

  it("asks TrackingMore to detect couriers it can't infer, and maps quota and bad numbers", async () => {
    const f = fakeFetch(json(200, { meta: { code: 200 }, data: [{ courier_code: "royal-mail" }] }), json(200, { meta: { code: 200 }, data: { ...tracking, courier_code: "royal-mail" } }));
    expect((await client(f).track("AB123456789XX")).carrierName).toBe("Royal Mail");
    expect(f.calls[0]!.url).toBe("https://api.trackingmore.com/v4/couriers/detect");

    const quota = fakeFetch(json(400, { meta: { code: 4190 }, data: null }));
    expect(await kindOf(client(quota).track("9400111899223197428490"))).toBe("rate_limited");
    const undetectable = fakeFetch(json(200, { meta: { code: 200 }, data: [] }));
    expect(await kindOf(client(undetectable).track("ZZZ"))).toBe("not_found");
    const badKey = fakeFetch(json(401, { meta: { code: 401 }, data: null }));
    expect(await kindOf(client(badKey).track("9400111899223197428490"))).toBe("auth");
  });
});

describe("Ship24 error codes", () => {
  it("treats an exhausted plan as rate limiting so the sync fails over", () => {
    const quota = classifyShip24Error(429, { errors: [{ code: "quota_limit_reached", message: "…" }], data: null });
    expect(quota).toMatchObject({ kind: "rate_limited", opts: { retryAfterMs: 86_400_000 } });
    expect(classifyShip24Error(403, { errors: [{ code: "no_active_subscription" }] })?.kind).toBe("auth");
    expect(classifyShip24Error(404, { errors: [{ code: "parcel_not_found" }] })?.kind).toBe("pending");
    expect(classifyShip24Error(400, { errors: [{ code: "validation_error" }] })?.kind).toBe("not_found");
    expect(classifyShip24Error(500, null)).toBeUndefined();
  });
});
