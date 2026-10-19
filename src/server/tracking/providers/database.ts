import "server-only";
import { db } from "@/lib/db";
import { demoDataEnabled } from "@/lib/env";
import { formatPlace } from "@/lib/utils";
import type { PublicTrackingResult, TrackingProvider } from "./types";
import { places } from "@/server/geo/places";

/** Reads shipments recorded by authorized staff (or synced from a carrier) in our own database. */
export const databaseProvider: TrackingProvider = {
  id: "database",
  async lookup(trackingNumber) {
    const shipment = await db.shipment.findUnique({
      where: { trackingNumber },
      select: {
        trackingNumber: true,
        status: true,
        serviceLevel: true,
        originCity: true,
        originRegion: true,
        originCountry: true,
        destinationCity: true,
        destinationRegion: true,
        destinationCountry: true,
        estimatedDeliveryDate: true,
        estimateSource: true,
        deliveredAt: true,
        isDemo: true,
        updatedAt: true,
        trackingMode: true,
        carrier: true,
        carrierTrackingNumber: true,
        carrierStatusText: true,
        lastSyncedAt: true,
        events: {
          orderBy: { occurredAt: "desc" },
          take: 200,
          select: {
            id: true,
            status: true,
            description: true,
            city: true,
            region: true,
            country: true,
            timeZone: true,
            occurredAt: true,
            source: true,
          },
        },
      },
    });
    if (!shipment) return null;
    if (shipment.isDemo && !demoDataEnabled()) return null;

    const result: PublicTrackingResult = {
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      serviceLevel: shipment.serviceLevel,
      origin:
        formatPlace({ city: shipment.originCity, region: shipment.originRegion, country: shipment.originCountry }) ||
        null,
      destination:
        formatPlace({
          city: shipment.destinationCity,
          region: shipment.destinationRegion,
          country: shipment.destinationCountry,
        }) || null,
      originPlace: { city: shipment.originCity, region: shipment.originRegion, country: shipment.originCountry },
      destinationPlace: {
        city: shipment.destinationCity,
        region: shipment.destinationRegion,
        country: shipment.destinationCountry,
      },
      estimatedDelivery:
        shipment.estimatedDeliveryDate && shipment.estimateSource && !shipment.deliveredAt
          ? { date: shipment.estimatedDeliveryDate.toISOString().slice(0, 10), source: shipment.estimateSource }
          : null,
      deliveredAt: shipment.deliveredAt?.toISOString() ?? null,
      isDemo: shipment.isDemo,
      lastUpdated: (shipment.events[0]?.occurredAt ?? shipment.updatedAt).toISOString(),
      carrier:
        shipment.trackingMode === "CARRIER"
          ? {
              name: shipment.carrier ?? "the carrier",
              trackingNumber: shipment.carrierTrackingNumber ?? shipment.trackingNumber,
              statusText: shipment.carrierStatusText,
              checkedAt: shipment.lastSyncedAt?.toISOString() ?? null,
            }
          : null,
      events: shipment.events.map((e) => ({
        id: e.id,
        status: e.status,
        description: e.description,
        location: formatPlace(e) || null,
        place: { city: e.city, region: e.region, country: e.country },
        // Staff-entered scans are shown in the scanned city's own time zone, never the viewer's or the
        // operator's. Carrier events keep the offset the carrier reported.
        timeZone: (e.source === "CARRIER_API" ? null : places().lookup(e)?.timeZone) ?? e.timeZone,
        occurredAt: e.occurredAt.toISOString(),
        source: e.source,
      })),
    };
    return result;
  },
};
