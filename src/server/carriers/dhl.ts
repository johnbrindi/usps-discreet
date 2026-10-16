import { z } from "zod";
import { statusFromCarrierText } from "@/domain/carriers";
import type { ShipmentStatus } from "@/domain/shipment-status";
import { requestJson, type FetchLike } from "./http";
import { cleanText, countryCode, dateOnly, eventHash, parseCarrierTime, sortAndDedupe, tidyPlace } from "./normalize";
import { CarrierError, type CarrierClient, type CarrierEvent } from "./types";

/**
 * DHL Shipment Tracking – Unified API (https://developer.dhl.com/api-reference/shipment-tracking).
 * Free plan: 250 calls/day, 1 call/second. Covers DHL Express, Parcel, eCommerce, Freight.
 */

const addressSchema = z
  .object({ addressLocality: z.string().nullish(), countryCode: z.string().nullish(), postalCode: z.string().nullish() })
  .loose();
const placeSchema = z.object({ address: addressSchema.nullish() }).loose();

const eventSchema = z
  .object({
    timestamp: z.string().nullish(),
    location: placeSchema.nullish(),
    statusCode: z.string().nullish(),
    status: z.string().nullish(),
    description: z.string().nullish(),
  })
  .loose();

const responseSchema = z.object({
  shipments: z
    .array(
      z
        .object({
          id: z.string(),
          service: z.string().nullish(),
          origin: placeSchema.nullish(),
          destination: placeSchema.nullish(),
          status: eventSchema.nullish(),
          estimatedTimeOfDelivery: z.string().nullish(),
          details: z.object({ product: z.object({ productName: z.string().nullish() }).loose().nullish() }).loose().nullish(),
          events: z.array(eventSchema).nullish(),
        })
        .loose(),
    )
    .min(1),
});

const SERVICE_NAMES: Record<string, string> = {
  express: "DHL Express",
  parcel: "DHL Parcel",
  "parcel-de": "DHL Paket",
  "parcel-nl": "DHL Parcel",
  "parcel-pl": "DHL Parcel",
  ecommerce: "DHL eCommerce",
  "ecommerce-europe": "DHL eCommerce",
  freight: "DHL Freight",
  dgf: "DHL Global Forwarding",
};

function mapStatus(code: string | null | undefined, text: string): ShipmentStatus {
  switch (code) {
    case "pre-transit":
      return statusFromCarrierText(text, "INFO_RECEIVED");
    case "delivered":
      return "DELIVERED";
    case "failure": {
      const s = statusFromCarrierText(text, "EXCEPTION");
      return s === "RETURNED_TO_SENDER" ? s : "EXCEPTION";
    }
    case "transit": {
      const s = statusFromCarrierText(text, "IN_TRANSIT");
      // "transit" never means delivered or label-only; trust the code over loose wording.
      return s === "DELIVERED" || s === "INFO_RECEIVED" ? "IN_TRANSIT" : s;
    }
    default:
      return statusFromCarrierText(text);
  }
}

/** DHL often packs "CITY - COUNTRY" or a full address into addressLocality; keep the first part. */
function locality(value: string | null | undefined) {
  return tidyPlace(value?.split(/\s+-\s+|,/)[0]);
}

export function mapDhlEvent(raw: z.infer<typeof eventSchema>): CarrierEvent | null {
  const time = parseCarrierTime(raw.timestamp);
  const description = cleanText(raw.description, 280) ?? cleanText(raw.status, 280);
  if (!time || !description) return null;
  const city = locality(raw.location?.address?.addressLocality);
  const country = countryCode(raw.location?.address?.countryCode);
  const code = cleanText(raw.statusCode, 64);
  return {
    externalId: eventHash("dhl", [time.at.toISOString(), code, description, city]),
    status: mapStatus(code, `${raw.status ?? ""} ${raw.description ?? ""}`),
    carrierStatusCode: code,
    description,
    city,
    region: null,
    country,
    timeZone: time.timeZone,
    occurredAt: time.at,
  };
}

export function parseDhlTracking(trackingNumber: string, body: unknown) {
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) throw new CarrierError("bad_response", "dhl: unexpected response shape");
  const s = parsed.data.shipments[0]!;
  const events = sortAndDedupe((s.events ?? []).map(mapDhlEvent).filter((e): e is CarrierEvent => !!e));
  const current = s.status ? mapDhlEvent(s.status) : null;
  const status = current?.status ?? events[0]?.status ?? "INFO_RECEIVED";
  const place = (p: z.infer<typeof placeSchema> | null | undefined) =>
    p?.address ? { city: locality(p.address.addressLocality), region: null, country: countryCode(p.address.countryCode) } : null;
  const delivered = events.find((e) => e.status === "DELIVERED") ?? (status === "DELIVERED" ? current : null);
  return {
    provider: "dhl" as const,
    carrierName: (s.service && SERVICE_NAMES[s.service]) || "DHL",
    trackingNumber,
    status,
    statusText: cleanText(s.status?.description, 280) ?? cleanText(s.status?.status, 280),
    serviceLevel: cleanText(s.details?.product?.productName, 80),
    origin: place(s.origin),
    destination: place(s.destination),
    estimatedDelivery: dateOnly(s.estimatedTimeOfDelivery),
    deliveredAt: status === "DELIVERED" ? (delivered?.occurredAt ?? null) : null,
    events,
  };
}

export function createDhlClient(cfg: { apiKey: string; baseUrl?: string; fetch?: FetchLike }): CarrierClient {
  const base = (cfg.baseUrl ?? "https://api-eu.dhl.com").replace(/\/+$/, "");
  return {
    id: "dhl",
    async track(trackingNumber) {
      const { body } = await requestJson(
        `${base}/track/shipments?trackingNumber=${encodeURIComponent(trackingNumber)}&language=en`,
        { headers: { "DHL-API-Key": cfg.apiKey } },
        {
          breakerKey: "dhl",
          fetch: cfg.fetch,
          classify: (status) => (status === 404 ? new CarrierError("not_found", "dhl: no shipment found", { httpStatus: 404 }) : undefined),
        },
      );
      return parseDhlTracking(trackingNumber, body);
    },
  };
}
