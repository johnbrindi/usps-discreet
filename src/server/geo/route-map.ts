import "server-only";
import { geoMercator, geoPath } from "d3-geo";
import type { GeometryObject, Topology } from "topojson-specification";
import { feature, mesh } from "topojson-client";
import type { ShipmentStatus } from "@/domain/shipment-status";
import type { PublicPlace, PublicTrackingResult } from "@/server/tracking/providers/types";
import type { Coordinates, Gazetteer } from "./gazetteer";
import { places, usStatesTopology, worldTopology } from "./places";

export const MAP_WIDTH = 800;
export const MAP_HEIGHT = 440;
const PAD = 56;
/** Smallest area shown, in degrees, so a single-city route still shows its surroundings. */
const MIN_SPAN = { lng: 9, lat: 5 };

export type MapStop = {
  /** Position as a fraction of the map's width/height, for the HTML pin overlay. */
  x: number;
  y: number;
  label: string;
  status: ShipmentStatus;
  occurredAt: string;
  timeZone: string | null;
  scans: number;
};

export type RouteMapModel = {
  land: string;
  borders: string;
  states: string | null;
  /** SVG path joining the stops in scan order. */
  route: string | null;
  /** Dashed path from the latest stop to the destination, while not yet delivered. */
  remaining: string | null;
  stops: MapStop[];
  destination: { x: number; y: number; label: string } | null;
  /** Origin pin, shown only before any scan location is known. */
  origin: { x: number; y: number; label: string } | null;
  unplaced: number;
  attribution: string;
};

const placeLabel = (p: PublicPlace) => [p.city, p.region].filter(Boolean).join(", ");
const near = (a: Coordinates, b: Coordinates) => Math.abs(a.lat - b.lat) < 0.15 && Math.abs(a.lng - b.lng) < 0.15;

/** Gentle arc between two projected points; reads as a hop between scans rather than a road. */
function arc(a: [number, number], b: [number, number]) {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const bow = Math.min(0.18 * Math.hypot(dx, dy), 60);
  const len = Math.hypot(dx, dy) || 1;
  const c: [number, number] = [(a[0] + b[0]) / 2 - (dy / len) * bow, (a[1] + b[1]) / 2 + (dx / len) * bow];
  const f = (n: number) => n.toFixed(1);
  return `M${f(a[0])},${f(a[1])}Q${f(c[0])},${f(c[1])} ${f(b[0])},${f(b[1])}`;
}

/**
 * Builds the route map from recorded scan locations only: one pin per city where scans happened, in
 * order. Nothing is interpolated — there is no estimated "current position" between scans.
 * Returns null when no recorded place can be located.
 */
export function buildRouteMap(result: PublicTrackingResult, gazetteer: Gazetteer = places()): RouteMapModel | null {
  const chronological = [...result.events].reverse();
  const stops: (Omit<MapStop, "x" | "y"> & { at: Coordinates })[] = [];
  let unplaced = 0;
  for (const e of chronological) {
    if (!e.place.city) continue;
    const at = gazetteer.lookup(e.place);
    if (!at) {
      unplaced++;
      continue;
    }
    const last = stops.at(-1);
    if (last && near(last.at, at)) {
      Object.assign(last, { status: e.status, occurredAt: e.occurredAt, timeZone: e.timeZone, scans: last.scans + 1 });
    } else {
      stops.push({ at, label: placeLabel(e.place), status: e.status, occurredAt: e.occurredAt, timeZone: e.timeZone, scans: 1 });
    }
  }

  const destAt = gazetteer.lookup(result.destinationPlace);
  const finished = result.status === "DELIVERED" || result.status === "RETURNED_TO_SENDER";
  const showDestination = destAt && !(finished || (stops.length > 0 && near(stops.at(-1)!.at, destAt)));
  const originAt = stops.length === 0 ? gazetteer.lookup(result.originPlace) : null;

  const coords = [...stops.map((s) => s.at), ...(showDestination ? [destAt] : []), ...(originAt ? [originAt] : [])];
  if (coords.length === 0) return null;

  // Fit the view to the points, never tighter than MIN_SPAN.
  const lngs = coords.map((c) => c.lng);
  const lats = coords.map((c) => c.lat);
  const mid = { lng: (Math.min(...lngs) + Math.max(...lngs)) / 2, lat: (Math.min(...lats) + Math.max(...lats)) / 2 };
  const half = {
    lng: Math.max(Math.max(...lngs) - Math.min(...lngs), MIN_SPAN.lng) / 2,
    lat: Math.max(Math.max(...lats) - Math.min(...lats), MIN_SPAN.lat) / 2,
  };
  const projection = geoMercator()
    .fitExtent(
      [[PAD, PAD], [MAP_WIDTH - PAD, MAP_HEIGHT - PAD]],
      {
        type: "MultiPoint",
        coordinates: [
          [mid.lng - half.lng, Math.max(mid.lat - half.lat, -80)],
          [mid.lng + half.lng, Math.min(mid.lat + half.lat, 80)],
        ],
      },
    )
    .clipExtent([[0, 0], [MAP_WIDTH, MAP_HEIGHT]]);
  const path = geoPath(projection).digits(1);
  const project = (c: Coordinates) => projection([c.lng, c.lat]) as [number, number];
  const frac = (p: [number, number]) => ({ x: p[0] / MAP_WIDTH, y: p[1] / MAP_HEIGHT });

  const world = worldTopology() as Topology<{ countries: GeometryObject }>;
  const countries = world.objects.countries;
  const inUs = [...stops.map((s) => s.at), destAt].some((c) => c && c.lng < -60 && c.lng > -170 && c.lat > 18 && c.lat < 72);
  const statesTopo = inUs ? (usStatesTopology() as Topology<{ states: GeometryObject }>) : null;

  const projected = stops.map((s) => project(s.at));
  const route = projected.length > 1 ? projected.slice(1).map((p, i) => arc(projected[i]!, p)).join("") : null;
  const destP = showDestination ? project(destAt) : null;

  return {
    land: path(feature(world, countries)) ?? "",
    borders: path(mesh(world, countries, (a, b) => a !== b)) ?? "",
    states: statesTopo ? path(mesh(statesTopo, statesTopo.objects.states, (a, b) => a !== b)) : null,
    route,
    remaining: destP && projected.length > 0 ? arc(projected.at(-1)!, destP) : null,
    stops: stops.map(({ at: _at, ...s }, i) => ({ ...s, ...frac(projected[i]!) })),
    destination: destP ? { ...frac(destP), label: placeLabel(result.destinationPlace) } : null,
    origin: originAt ? { ...frac(project(originAt)), label: placeLabel(result.originPlace) } : null,
    unplaced,
    attribution: gazetteer.attribution,
  };
}
