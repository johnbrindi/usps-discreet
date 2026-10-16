import type { CarrierProviderId } from "@/domain/carriers";
import type { ShipmentStatus } from "@/domain/shipment-status";

export type CarrierPlace = { city: string | null; region: string | null; country: string | null };

/** One scan, normalized from any carrier's format. */
export type CarrierEvent = {
  /** Carrier event id, or a content hash when the carrier has none. Unique per shipment. */
  externalId: string;
  status: ShipmentStatus;
  carrierStatusCode: string | null;
  description: string;
  city: string | null;
  region: string | null;
  country: string | null;
  /** IANA zone or a UTC offset such as "-05:00"; null when the carrier doesn't say. */
  timeZone: string | null;
  occurredAt: Date;
};

export type CarrierTracking = {
  provider: CarrierProviderId;
  /** Who is physically carrying the parcel, e.g. "USPS", "DHL Express", "UPS". */
  carrierName: string;
  trackingNumber: string;
  status: ShipmentStatus;
  /** The carrier's own wording of the current status. */
  statusText: string | null;
  serviceLevel: string | null;
  origin: CarrierPlace | null;
  destination: CarrierPlace | null;
  /** YYYY-MM-DD, only when the carrier supplies one. */
  estimatedDelivery: string | null;
  deliveredAt: Date | null;
  /** Newest first. */
  events: CarrierEvent[];
};

export interface CarrierClient {
  readonly id: CarrierProviderId;
  /** Throws CarrierError; never returns partial or invented data. */
  track(trackingNumber: string): Promise<CarrierTracking>;
}

export type CarrierErrorKind =
  /** The carrier doesn't know this number (yet). */
  | "not_found"
  /** The carrier accepted the number but hasn't returned data yet (aggregators fetch asynchronously). */
  | "pending"
  | "rate_limited"
  /** Credentials missing, wrong or expired. */
  | "auth"
  /** Network failure, timeout, 5xx, or circuit open. */
  | "unavailable"
  /** The carrier answered with something we couldn't parse. */
  | "bad_response";

export class CarrierError extends Error {
  constructor(
    readonly kind: CarrierErrorKind,
    message: string,
    readonly opts: { httpStatus?: number; retryAfterMs?: number } = {},
  ) {
    super(message);
    this.name = "CarrierError";
  }
}
