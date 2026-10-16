import { z } from "zod";
import { statusFromCarrierText } from "@/domain/carriers";
import { requestJson, type FetchLike } from "./http";
import { cleanText, countryCode, dateOnly, eventHash, parseCarrierTime, sortAndDedupe, tidyPlace } from "./normalize";
import { CarrierError, type CarrierClient, type CarrierEvent } from "./types";

/**
 * USPS Tracking API v3 (https://developers.usps.com). Free with a USPS developer account (Business
 * Customer Gateway). Auth is OAuth 2.0 client-credentials; tokens last ~8 h and are cached in memory.
 */

const tokenSchema = z.object({ access_token: z.string().min(1), expires_in: z.coerce.number().optional() });

const eventSchema = z
  .object({
    eventType: z.string().nullish(),
    eventTimestamp: z.string().nullish(),
    GMTTimestamp: z.string().nullish(),
    GMTOffset: z.string().nullish(),
    eventCountry: z.string().nullish(),
    eventCity: z.string().nullish(),
    eventState: z.string().nullish(),
    eventZIP: z.string().nullish(),
    eventCode: z.string().nullish(),
  })
  .loose();

const trackingSchema = z
  .object({
    trackingNumber: z.string().nullish(),
    mailClass: z.string().nullish(),
    status: z.string().nullish(),
    statusCategory: z.string().nullish(),
    statusSummary: z.string().nullish(),
    originCity: z.string().nullish(),
    originState: z.string().nullish(),
    originCountry: z.string().nullish(),
    destinationCity: z.string().nullish(),
    destinationState: z.string().nullish(),
    destinationCountryCode: z.string().nullish(),
    expectedDeliveryTimeStamp: z.string().nullish(),
    predictedDeliveryDate: z.string().nullish(),
    predictedDeliveryTimeStamp: z.string().nullish(),
    trackingEvents: z.array(eventSchema).nullish(),
  })
  .loose();

export function mapUspsEvent(raw: z.infer<typeof eventSchema>): CarrierEvent | null {
  const description = cleanText(raw.eventType, 280);
  // GMTTimestamp is the reliable instant; eventTimestamp is local wall time with GMTOffset alongside.
  const local = parseCarrierTime(raw.eventTimestamp, raw.GMTOffset);
  const gmt = parseCarrierTime(raw.GMTTimestamp);
  const at = gmt?.at ?? local?.at;
  if (!description || !at) return null;
  const code = cleanText(raw.eventCode, 64);
  const city = tidyPlace(raw.eventCity);
  const region = cleanText(raw.eventState, 120);
  const country = countryCode(raw.eventCountry) ?? (region ? "US" : null);
  return {
    externalId: eventHash("usps", [at.toISOString(), code, description, city, region]),
    // USPS event descriptions are explicit ("Out for Delivery", "Delivered, In/At Mailbox"); the code is kept for reference.
    status: statusFromCarrierText(description),
    carrierStatusCode: code,
    description,
    city,
    region,
    country,
    timeZone: local?.timeZone ?? null,
    occurredAt: at,
  };
}

export function parseUspsTracking(trackingNumber: string, body: unknown) {
  const parsed = trackingSchema.safeParse(body);
  if (!parsed.success) throw new CarrierError("bad_response", "usps: unexpected response shape");
  const d = parsed.data;
  const events = sortAndDedupe((d.trackingEvents ?? []).map(mapUspsEvent).filter((e): e is CarrierEvent => !!e));
  const statusText = cleanText(d.status, 280) ?? cleanText(d.statusCategory, 280);
  if (events.length === 0 && !statusText) throw new CarrierError("not_found", "usps: no tracking information");

  const latest = events[0];
  const status = latest?.status ?? statusFromCarrierText(statusText ?? "", "INFO_RECEIVED");
  const delivered = events.find((e) => e.status === "DELIVERED");
  return {
    provider: "usps" as const,
    carrierName: "USPS",
    trackingNumber,
    status,
    statusText: cleanText(d.statusSummary, 280) ?? statusText,
    serviceLevel: cleanText(d.mailClass, 80),
    origin: d.originCity ? { city: tidyPlace(d.originCity), region: cleanText(d.originState, 120), country: countryCode(d.originCountry) ?? "US" } : null,
    destination: d.destinationCity
      ? { city: tidyPlace(d.destinationCity), region: cleanText(d.destinationState, 120), country: countryCode(d.destinationCountryCode) ?? "US" }
      : null,
    estimatedDelivery: dateOnly(d.expectedDeliveryTimeStamp) ?? dateOnly(d.predictedDeliveryTimeStamp) ?? dateOnly(d.predictedDeliveryDate),
    deliveredAt: status === "DELIVERED" && delivered ? delivered.occurredAt : null,
    events,
  };
}

export function createUspsClient(cfg: { clientId: string; clientSecret: string; baseUrl?: string; fetch?: FetchLike }): CarrierClient {
  const base = (cfg.baseUrl ?? "https://apis.usps.com").replace(/\/+$/, "");
  let token: { value: string; expiresAt: number } | null = null;
  let inflight: Promise<string> | null = null;

  async function getToken(): Promise<string> {
    if (token && token.expiresAt > Date.now() + 60_000) return token.value;
    // Single-flight: concurrent syncs share one token request.
    inflight ??= (async () => {
      try {
        const { body } = await requestJson(
          `${base}/oauth2/v3/token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ grant_type: "client_credentials", client_id: cfg.clientId, client_secret: cfg.clientSecret }),
          },
          {
            breakerKey: "usps",
            fetch: cfg.fetch,
            classify: (status) =>
              status === 400 || status === 401 ? new CarrierError("auth", "usps: client credentials rejected", { httpStatus: status }) : undefined,
          },
        );
        const parsed = tokenSchema.safeParse(body);
        if (!parsed.success) throw new CarrierError("bad_response", "usps: token response missing access_token");
        token = { value: parsed.data.access_token, expiresAt: Date.now() + (parsed.data.expires_in ?? 3600) * 1000 };
        return token.value;
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  }

  async function fetchTracking(trackingNumber: string, accessToken: string) {
    return requestJson(
      `${base}/tracking/v3/tracking/${encodeURIComponent(trackingNumber)}?expand=DETAIL`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
      {
        breakerKey: "usps",
        fetch: cfg.fetch,
        classify: (status) =>
          status === 400 || status === 404 ? new CarrierError("not_found", "usps: tracking number not found", { httpStatus: status }) : undefined,
      },
    );
  }

  return {
    id: "usps",
    async track(trackingNumber) {
      let res;
      try {
        res = await fetchTracking(trackingNumber, await getToken());
      } catch (err) {
        // Token revoked or expired early: refresh once.
        if (!(err instanceof CarrierError && err.kind === "auth" && err.opts.httpStatus === 401)) throw err;
        token = null;
        res = await fetchTracking(trackingNumber, await getToken());
      }
      return parseUspsTracking(trackingNumber, res.body);
    },
  };
}
