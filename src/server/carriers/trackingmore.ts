import { z } from "zod";
import { detectCarrier, statusFromCarrierText } from "@/domain/carriers";
import type { ShipmentStatus } from "@/domain/shipment-status";
import { requestJson, type FetchLike } from "./http";
import { cleanText, countryCode, dateOnly, eventHash, parseCarrierTime, sortAndDedupe, tidyPlace } from "./normalize";
import { CarrierError, type CarrierClient, type CarrierEvent, type CarrierTracking } from "./types";

/**
 * TrackingMore aggregator, API v4 (https://www.trackingmore.com/docs/trackingmore). Free plan included.
 * A tracking is registered per (number, courier); one credit is used per new pair, and re-querying an
 * existing pair is free. `POST /trackings/create` returns results in real time; for a number already
 * registered we read it back with `GET /trackings/get`.
 */

const checkpointSchema = z
  .object({
    checkpoint_date: z.string().nullish(),
    checkpoint_delivery_status: z.string().nullish(),
    checkpoint_delivery_substatus: z.string().nullish(),
    tracking_detail: z.string().nullish(),
    location: z.string().nullish(),
    country_iso2: z.string().nullish(),
    state: z.string().nullish(),
    city: z.string().nullish(),
  })
  .loose();

const legSchema = z.object({ courier_code: z.string().nullish(), trackinfo: z.array(checkpointSchema).nullish() }).loose().nullish();

const trackingSchema = z
  .object({
    tracking_number: z.string().nullish(),
    courier_code: z.string().nullish(),
    delivery_status: z.string().nullish(),
    substatus: z.string().nullish(),
    latest_event: z.string().nullish(),
    service_code: z.string().nullish(),
    origin_country: z.string().nullish(),
    origin_city: z.string().nullish(),
    origin_state: z.string().nullish(),
    destination_country: z.string().nullish(),
    destination_city: z.string().nullish(),
    destination_state: z.string().nullish(),
    scheduled_delivery_date: z.string().nullish(),
    origin_info: legSchema,
    destination_info: legSchema,
  })
  .loose();

const envelopeSchema = z.object({ meta: z.object({ code: z.coerce.number() }).loose(), data: z.unknown() }).loose();

/** Our carrier guess → TrackingMore courier code. Anything else is resolved with /couriers/detect. */
const COURIER_CODES: Record<string, string> = { USPS: "usps", DHL: "dhl", UPS: "ups", FedEx: "fedex" };

const COURIER_NAMES: Record<string, string> = { usps: "USPS", dhl: "DHL", ups: "UPS", fedex: "FedEx", "royal-mail": "Royal Mail", "canada-post": "Canada Post" };

export function courierName(code: string | null | undefined): string | null {
  if (!code) return null;
  return COURIER_NAMES[code] ?? code.split("-").map((w) => (w.length <= 3 ? w.toUpperCase() : w[0]!.toUpperCase() + w.slice(1))).join(" ");
}

/** TrackingMore statuses and sub-statuses (docs: "Courier Delivery Status") → our lifecycle. */
export function mapTrackingMoreStatus(status: string | null | undefined, substatus: string | null | undefined, text: string): ShipmentStatus {
  switch (status) {
    case "inforeceived":
      return "INFO_RECEIVED";
    case "transit": {
      if (substatus === "transit002" || substatus === "transit003") return "ARRIVED_AT_FACILITY";
      const s = statusFromCarrierText(text, "IN_TRANSIT");
      return s === "DELIVERED" || s === "INFO_RECEIVED" || s === "OUT_FOR_DELIVERY" ? "IN_TRANSIT" : s;
    }
    case "pickup":
      // pickup002 = ready for collection at a counter/locker; the rest are out for delivery.
      return substatus === "pickup002" ? "ARRIVED_AT_FACILITY" : "OUT_FOR_DELIVERY";
    case "undelivered":
      return "EXCEPTION";
    case "delivered":
      return "DELIVERED";
    case "exception":
      return substatus === "exception010" || substatus === "exception011" ? "RETURNED_TO_SENDER" : "EXCEPTION";
    default:
      return statusFromCarrierText(text);
  }
}

/** Checkpoint dates come as YYYY-MM-DD, YYYY-MM-DD HH:MM:SS or ISO with an offset. */
function checkpointTime(value: string | null | undefined) {
  const v = value?.trim().replace(" ", "T");
  if (!v) return null;
  return parseCarrierTime(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00` : v);
}

export function mapTrackingMoreEvent(raw: z.infer<typeof checkpointSchema>): CarrierEvent | null {
  const time = checkpointTime(raw.checkpoint_date);
  const description = cleanText(raw.tracking_detail, 280);
  if (!time || !description) return null;
  const city = tidyPlace(raw.city) ?? tidyPlace(raw.location);
  const region = raw.city ? cleanText(raw.state, 120) : null;
  const code = cleanText(raw.checkpoint_delivery_substatus ?? raw.checkpoint_delivery_status, 64);
  return {
    externalId: eventHash("trackingmore", [time.at.toISOString(), code, description, raw.location ?? raw.city ?? null]),
    status: mapTrackingMoreStatus(raw.checkpoint_delivery_status, raw.checkpoint_delivery_substatus, description),
    carrierStatusCode: code,
    description,
    city,
    region,
    country: countryCode(raw.country_iso2),
    timeZone: time.timeZone,
    occurredAt: time.at,
  };
}

export function parseTrackingMoreTracking(trackingNumber: string, body: unknown): CarrierTracking {
  const parsed = trackingSchema.safeParse(body);
  if (!parsed.success) throw new CarrierError("bad_response", "trackingmore: unexpected response shape");
  const d = parsed.data;
  const raw = [...(d.origin_info?.trackinfo ?? []), ...(d.destination_info?.trackinfo ?? [])];
  const events = sortAndDedupe(raw.map(mapTrackingMoreEvent).filter((e): e is CarrierEvent => !!e));
  if (events.length === 0) {
    if (d.delivery_status === "notfound") throw new CarrierError("not_found", "trackingmore: no tracking information");
    if (!d.delivery_status || d.delivery_status === "pending") throw new CarrierError("pending", "trackingmore: carrier data not available yet");
  }

  const latest = events[0];
  // The shipment-level status is TrackingMore's own summary and is more reliable than the newest scan alone.
  const status = d.delivery_status && d.delivery_status !== "expired" ? mapTrackingMoreStatus(d.delivery_status, d.substatus, latest?.description ?? "") : (latest?.status ?? "IN_TRANSIT");
  const delivered = events.find((e) => e.status === "DELIVERED");
  const place = (city: string | null | undefined, state: string | null | undefined, country: string | null | undefined) => {
    const c = countryCode(country);
    return city || c ? { city: tidyPlace(city), region: cleanText(state, 120), country: c } : null;
  };
  return {
    provider: "trackingmore",
    carrierName: courierName(d.courier_code ?? d.origin_info?.courier_code) ?? "Carrier",
    trackingNumber,
    status,
    statusText: latest?.description ?? cleanText(d.latest_event, 280),
    serviceLevel: cleanText(d.service_code, 80),
    origin: place(d.origin_city, d.origin_state, d.origin_country),
    destination: place(d.destination_city, d.destination_state, d.destination_country),
    estimatedDelivery: dateOnly(d.scheduled_delivery_date),
    deliveredAt: status === "DELIVERED" ? (delivered?.occurredAt ?? null) : null,
    events,
  };
}

/** Meta code 4101: the (number, courier) pair exists already, so its results are read instead. */
class AlreadyRegistered extends CarrierError {}

/** Maps TrackingMore's meta codes (docs: "Response Code") to our error kinds. */
function classifyMeta(status: number, body: unknown): CarrierError | undefined {
  const code = envelopeSchema.safeParse(body).data?.meta.code;
  if (code === 4190) {
    // Monthly plan quota used up: back off for a day, the sync engine fails over meanwhile.
    return new CarrierError("rate_limited", "trackingmore: plan quota reached", { httpStatus: status, retryAfterMs: 24 * 60 * 60_000 });
  }
  if (code === 4110 || code === 4120 || code === 4121) return new CarrierError("not_found", "trackingmore: tracking number not recognised", { httpStatus: status });
  return undefined;
}

export function createTrackingMoreClient(cfg: { apiKey: string; baseUrl?: string; fetch?: FetchLike }): CarrierClient {
  const base = (cfg.baseUrl ?? "https://api.trackingmore.com/v4").replace(/\/+$/, "");
  const headers = { "Tracking-Api-Key": cfg.apiKey, "Content-Type": "application/json" };
  const opts = (classify: (status: number, body: unknown) => CarrierError | undefined) => ({ breakerKey: "trackingmore", fetch: cfg.fetch, timeoutMs: 15_000, classify });
  const data = (body: unknown) => envelopeSchema.safeParse(body).data?.data;

  async function courierFor(trackingNumber: string): Promise<string> {
    const known = detectCarrier(trackingNumber).carrier;
    if (known && COURIER_CODES[known]) return COURIER_CODES[known]!;
    const { body } = await requestJson(`${base}/couriers/detect`, { method: "POST", headers, body: JSON.stringify({ tracking_number: trackingNumber }) }, opts(classifyMeta));
    const first = z.array(z.object({ courier_code: z.string().min(1) }).loose()).safeParse(data(body)).data?.[0];
    if (!first) throw new CarrierError("not_found", "trackingmore: courier could not be detected");
    return first.courier_code;
  }

  return {
    id: "trackingmore",
    async track(trackingNumber) {
      const courier = await courierFor(trackingNumber);
      try {
        const { body } = await requestJson(
          `${base}/trackings/create`,
          { method: "POST", headers, body: JSON.stringify({ tracking_number: trackingNumber, courier_code: courier }) },
          opts((status, b) =>
            envelopeSchema.safeParse(b).data?.meta.code === 4101 ? new AlreadyRegistered("pending", "trackingmore: already registered", { httpStatus: status }) : classifyMeta(status, b),
          ),
        );
        return parseTrackingMoreTracking(trackingNumber, data(body));
      } catch (err) {
        if (!(err instanceof AlreadyRegistered)) throw err;
      }

      // Registered by an earlier sync: read the latest results, which costs no credit.
      const query = new URLSearchParams({ tracking_numbers: trackingNumber, courier_code: courier });
      const { body } = await requestJson(`${base}/trackings/get?${query}`, { headers }, opts(classifyMeta));
      const found = z.array(z.unknown()).safeParse(data(body)).data?.[0];
      if (!found) throw new CarrierError("pending", "trackingmore: carrier data not available yet");
      return parseTrackingMoreTracking(trackingNumber, found);
    },
  };
}
