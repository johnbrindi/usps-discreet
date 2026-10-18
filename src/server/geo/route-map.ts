import "server-only";
import type { ShipmentStatus } from "@/domain/shipment-status";
import { formatEventTime } from "@/domain/time";
import type { PublicPlace, PublicTrackingResult } from "@/server/tracking/providers/types";
import type { Coordinates, Gazetteer } from "./gazetteer";
import { places } from "./places";

export type RouteScan = { status: ShipmentStatus; description: string; occurredAt: string; date: string; time: string };

/** A city where one or more consecutive scans happened. Coordinates come from the recorded place only. */
export type RouteStop = { lat: number; lng: number; label: string; status: ShipmentStatus; scans: RouteScan[] };

export type RouteData = {
  /** In scan order, oldest first. */
  stops: RouteStop[];
  /** Shown until the parcel is delivered or returned (and not already at the last stop). */
  destination: { lat: number; lng: number; label: string } | null;
  /** Where the route starts. Omitted when the first scan is already there. */
  origin: { lat: number; lng: number; label: string } | null;
  /** The shipment's current status, shown at its latest known point. */
  status: ShipmentStatus;
  unplaced: number;
  attribution: string;
};

const placeLabel = (p: PublicPlace) => [p.city, p.region].filter(Boolean).join(", ");
const near = (a: Coordinates, b: Coordinates) => Math.abs(a.lat - b.lat) < 0.15 && Math.abs(a.lng - b.lng) < 0.15;

/**
 * Resolves the route from recorded scan locations only: one stop per city where scans happened, in
 * order. Nothing is interpolated — there is no estimated "current position" between scans.
 * Returns null when no recorded place can be located.
 */
export function resolveRoute(result: PublicTrackingResult, gazetteer: Gazetteer = places()): RouteData | null {
  const stops: RouteStop[] = [];
  let unplaced = 0;
  for (const e of [...result.events].reverse()) {
    if (!e.place.city) continue;
    const at = gazetteer.lookup(e.place);
    if (!at) {
      unplaced++;
      continue;
    }
    const t = formatEventTime(e.occurredAt, e.timeZone);
    const scan: RouteScan = { status: e.status, description: e.description, occurredAt: e.occurredAt, date: t.date, time: t.time };
    const last = stops.at(-1);
    if (last && near(last, at)) {
      last.status = e.status;
      last.scans.push(scan);
    } else {
      stops.push({ ...at, label: placeLabel(e.place), status: e.status, scans: [scan] });
    }
  }

  const destAt = gazetteer.lookup(result.destinationPlace);
  const finished = result.status === "DELIVERED" || result.status === "RETURNED_TO_SENDER";
  const showDestination = destAt && !(finished || (stops.length > 0 && near(stops.at(-1)!, destAt)));
  const originLookup = gazetteer.lookup(result.originPlace);
  const originAt = originLookup && !(stops.length > 0 && near(stops[0]!, originLookup)) ? originLookup : null;
  if (stops.length === 0 && !showDestination && !originAt) return null;

  return {
    stops,
    destination: showDestination ? { ...destAt, label: placeLabel(result.destinationPlace) } : null,
    origin: originAt ? { ...originAt, label: placeLabel(result.originPlace) } : null,
    status: result.status,
    unplaced,
    attribution: gazetteer.attribution,
  };
}
