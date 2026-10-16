import type { ShipmentStatus } from "@/domain/shipment-status";

/** Public-safe tracking view. Contains no recipient names, street addresses or internal notes. */
export type PublicTrackingEvent = {
  id: string;
  status: ShipmentStatus;
  description: string;
  location: string | null;
  timeZone: string | null;
  occurredAt: string; // ISO-8601
  source: "MANUAL" | "CARRIER_API" | "DEMO";
};

export type PublicTrackingResult = {
  trackingNumber: string;
  status: ShipmentStatus;
  serviceLevel: string | null;
  origin: string | null;
  destination: string | null;
  estimatedDelivery: { date: string; source: string } | null;
  deliveredAt: string | null;
  isDemo: boolean;
  lastUpdated: string;
  /** Present when events come from a carrier API; used for attribution on the public page. */
  carrier: {
    name: string;
    trackingNumber: string;
    statusText: string | null;
    /** Last successful carrier check (ISO-8601). */
    checkedAt: string | null;
  } | null;
  events: PublicTrackingEvent[]; // newest first
};

/**
 * Contract for tracking data sources. A real carrier integration implements this
 * server-side (credentials stay on the server) and is selected via TRACKING_PROVIDER.
 */
export interface TrackingProvider {
  readonly id: string;
  lookup(trackingNumber: string): Promise<PublicTrackingResult | null>;
}
