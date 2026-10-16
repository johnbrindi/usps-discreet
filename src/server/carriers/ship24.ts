import { z } from "zod";
import { statusFromCarrierText } from "@/domain/carriers";
import type { ShipmentStatus } from "@/domain/shipment-status";
import { requestJson, type FetchLike } from "./http";
import { cleanText, countryCode, dateOnly, eventHash, parseCarrierTime, sortAndDedupe } from "./normalize";
import { CarrierError, type CarrierClient, type CarrierEvent } from "./types";

/**
 * Ship24 tracking aggregator (https://docs.ship24.com) — one API for 1,500+ carriers, including UPS,
 * FedEx and national posts. Has a free plan. Carrier data is fetched asynchronously, so the first call
 * for a new number can come back with no events ("pending"); the scheduler retries after 2 minutes.
 */

const eventSchema = z
  .object({
    eventId: z.string().nullish(),
    status: z.string().nullish(),
    occurrenceDatetime: z.string().nullish(),
    location: z.string().nullish(),
    courierCode: z.string().nullish(),
    statusCode: z.string().nullish(),
    statusMilestone: z.string().nullish(),
  })
  .loose();

const responseSchema = z.object({
  data: z.object({
    trackings: z
      .array(
        z
          .object({
            tracker: z.object({ courierCode: z.array(z.string()).nullish() }).loose().nullish(),
            shipment: z
              .object({
                statusMilestone: z.string().nullish(),
                originCountryCode: z.string().nullish(),
                destinationCountryCode: z.string().nullish(),
                delivery: z.object({ estimatedDeliveryDate: z.string().nullish(), service: z.string().nullish() }).loose().nullish(),
              })
              .loose()
              .nullish(),
            events: z.array(eventSchema).nullish(),
          })
          .loose(),
      )
      .min(1),
  }),
});

function mapMilestone(milestone: string | null | undefined, text: string): ShipmentStatus {
  switch (milestone) {
    case "info_received":
      return "INFO_RECEIVED";
    case "in_transit": {
      const s = statusFromCarrierText(text, "IN_TRANSIT");
      return s === "DELIVERED" || s === "INFO_RECEIVED" ? "IN_TRANSIT" : s;
    }
    case "out_for_delivery":
      return "OUT_FOR_DELIVERY";
    case "available_for_pickup":
      return "ARRIVED_AT_FACILITY";
    case "failed_attempt":
      return "EXCEPTION";
    case "exception": {
      const s = statusFromCarrierText(text, "EXCEPTION");
      return s === "RETURNED_TO_SENDER" ? s : "EXCEPTION";
    }
    case "delivered":
      return "DELIVERED";
    default:
      return statusFromCarrierText(text);
  }
}

/** Ship24 courier codes are slugs ("us-post", "dhl", "ups", "fedex", "royal-mail"); make them readable. */
export function courierName(code: string | null | undefined): string | null {
  if (!code) return null;
  const known: Record<string, string> = { "us-post": "USPS", ups: "UPS", fedex: "FedEx", dhl: "DHL", "royal-mail": "Royal Mail", "canada-post": "Canada Post" };
  return known[code] ?? code.split("-").map((w) => (w.length <= 3 ? w.toUpperCase() : w[0]!.toUpperCase() + w.slice(1))).join(" ");
}

export function mapShip24Event(raw: z.infer<typeof eventSchema>): CarrierEvent | null {
  const time = parseCarrierTime(raw.occurrenceDatetime);
  const description = cleanText(raw.status, 280);
  if (!time || !description) return null;
  const location = cleanText(raw.location, 120);
  const code = cleanText(raw.statusCode, 64);
  return {
    externalId: raw.eventId ? `ship24:${raw.eventId.slice(0, 100)}` : eventHash("ship24", [time.at.toISOString(), code, description, location]),
    status: mapMilestone(raw.statusMilestone, description),
    carrierStatusCode: code,
    description,
    // Ship24 gives a single free-text location; it's shown as-is.
    city: location,
    region: null,
    country: null,
    timeZone: time.timeZone,
    occurredAt: time.at,
  };
}

export function parseShip24Tracking(trackingNumber: string, body: unknown) {
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) throw new CarrierError("bad_response", "ship24: unexpected response shape");
  const t = parsed.data.data.trackings[0]!;
  const events = sortAndDedupe((t.events ?? []).map(mapShip24Event).filter((e): e is CarrierEvent => !!e));
  const milestone = t.shipment?.statusMilestone;
  if (events.length === 0) {
    if (!milestone || milestone === "pending") throw new CarrierError("pending", "ship24: carrier data not available yet");
  }
  const latest = events[0];
  const status = latest?.status ?? mapMilestone(milestone, "");
  const delivered = events.find((e) => e.status === "DELIVERED");
  const courier = courierName(t.tracker?.courierCode?.[0] ?? t.events?.find((e) => e.courierCode)?.courierCode);
  const country = (c: string | null | undefined) => {
    const code = countryCode(c);
    return code ? { city: null, region: null, country: code } : null;
  };
  return {
    provider: "ship24" as const,
    carrierName: courier ?? "Carrier",
    trackingNumber,
    status,
    statusText: latest?.description ?? null,
    serviceLevel: cleanText(t.shipment?.delivery?.service, 80),
    origin: country(t.shipment?.originCountryCode),
    destination: country(t.shipment?.destinationCountryCode),
    estimatedDelivery: dateOnly(t.shipment?.delivery?.estimatedDeliveryDate),
    deliveredAt: status === "DELIVERED" ? (delivered?.occurredAt ?? null) : null,
    events,
  };
}

const errorBodySchema = z.object({ errors: z.array(z.object({ code: z.string() }).loose()) }).loose();

/** Ship24 error codes (docs: "Error management") take precedence over the HTTP status. */
export function classifyShip24Error(status: number, body: unknown): CarrierError | undefined {
  const codes = errorBodySchema.safeParse(body).data?.errors.map((e) => e.code) ?? [];
  if (codes.includes("quota_limit_reached")) {
    // Plan quota used up for the billing period: back off for a day, the sync engine fails over meanwhile.
    return new CarrierError("rate_limited", "ship24: plan quota reached", { httpStatus: status, retryAfterMs: 24 * 60 * 60_000 });
  }
  if (codes.includes("no_active_subscription")) return new CarrierError("auth", "ship24: no active subscription", { httpStatus: status });
  if (codes.includes("parcel_not_found")) return new CarrierError("pending", "ship24: carrier has no data yet", { httpStatus: status });
  if (status === 400 || status === 404 || status === 422) return new CarrierError("not_found", "ship24: tracking number not accepted", { httpStatus: status });
  return undefined;
}

export function createShip24Client(cfg: { apiKey: string; baseUrl?: string; fetch?: FetchLike }): CarrierClient {
  const base = (cfg.baseUrl ?? "https://api.ship24.com").replace(/\/+$/, "");
  return {
    id: "ship24",
    async track(trackingNumber) {
      // Creates the tracker if needed (idempotent per number) and returns current results.
      const { body } = await requestJson(
        `${base}/public/v1/trackers/track`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ trackingNumber }),
        },
        {
          breakerKey: "ship24",
          fetch: cfg.fetch,
          timeoutMs: 12_000,
          classify: classifyShip24Error,
        },
      );
      return parseShip24Tracking(trackingNumber, body);
    },
  };
}
