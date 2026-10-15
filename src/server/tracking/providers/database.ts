import "server-only";
import { db } from "@/lib/db";
import { demoDataEnabled } from "@/lib/env";
import { formatPlace } from "@/lib/utils";
import type { PublicTrackingResult, TrackingProvider } from "./types";

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
      estimatedDelivery:
        shipment.estimatedDeliveryDate && shipment.estimateSource && !shipment.deliveredAt
          ? { date: shipment.estimatedDeliveryDate.toISOString().slice(0, 10), source: shipment.estimateSource }
          : null,
      deliveredAt: shipment.deliveredAt?.toISOString() ?? null,
      isDemo: shipment.isDemo,
      lastUpdated: (shipment.events[0]?.occurredAt ?? shipment.updatedAt).toISOString(),
      events: shipment.events.map((e) => ({
        id: e.id,
        status: e.status,
        description: e.description,
        location: formatPlace(e) || null,
        timeZone: e.timeZone,
        occurredAt: e.occurredAt.toISOString(),
        source: e.source,
      })),
    };
    return result;
  },
};
