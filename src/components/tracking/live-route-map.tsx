"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import type * as Leaflet from "leaflet";
import { Crosshair, Layers, Loader2, Play, Satellite } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { mapTiles } from "@/config/map";
import { STATUS_META } from "@/domain/shipment-status";
import { cn } from "@/lib/utils";
import type { RouteData, RouteStop } from "@/server/geo/route-map";

type LatLng = [number, number];
type Basemap = "street" | "satellite";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Points along a gentle arc between two stops, so hops read as hops rather than roads. */
function arcPoints(a: LatLng, b: LatLng, steps = 32): LatLng[] {
  const [dy, dx] = [b[0] - a[0], b[1] - a[1]];
  const bow = 0.12;
  const c: LatLng = [(a[0] + b[0]) / 2 + dx * bow, (a[1] + b[1]) / 2 - dy * bow];
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
  });
}

const joinSegments = (segments: LatLng[][]) => segments.flatMap((seg, i) => (i === 0 ? seg : seg.slice(1)));

function stopPopup(stop: RouteStop, index: number, total: number, latest: boolean) {
  const scans = [...stop.scans]
    .reverse()
    .map(
      (s) => `<li class="rm-scan">
        <p class="rm-scan-status">${esc(STATUS_META[s.status].label)}</p>
        <p class="rm-scan-time">${esc(s.date)} · ${esc(s.time)}</p>
        <p class="rm-scan-desc">${esc(s.description)}</p>
      </li>`,
    )
    .join("");
  return `<div class="rm-popup">
    <p class="rm-popup-eyebrow">${latest ? "Last scanned here" : `Stop ${index + 1} of ${total}`}</p>
    <p class="rm-popup-title">${esc(stop.label)}</p>
    <p class="rm-popup-meta">${stop.scans.length} scan${stop.scans.length === 1 ? "" : "s"} at this location</p>
    <ol class="rm-scans">${scans}</ol>
  </div>`;
}

/**
 * Interactive route map: street/satellite tiles, numbered pins at each recorded scan city (clustered
 * when close together), a "Last scanned here" marker, and a dotted line to the destination. Every
 * position comes from a recorded scan — nothing between scans is estimated or animated as movement.
 */
/** Fired on window once the print variant's tiles have loaded; the summary page waits for it before printing. */
export const ROUTE_MAP_READY = "route-map-ready";

export function LiveRouteMap({ route, variant = "screen" }: { route: RouteData; variant?: "screen" | "print" }) {
  const print = variant === "print";
  const el = useRef<HTMLDivElement>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const tiles = useRef<Leaflet.TileLayer | null>(null);
  const layers = useRef<Leaflet.LayerGroup | null>(null);
  const drawn = useRef<{ points: number; key: string } | null>(null);
  const markers = useRef<Leaflet.Marker[]>([]);
  const replaying = useRef(false);
  const [ready, setReady] = useState(false);
  const [basemap, setBasemap] = useState<Basemap>("street");
  const [busy, setBusy] = useState(false);

  const allPoints = useCallback((): LatLng[] => {
    const pts: LatLng[] = route.stops.map((s) => [s.lat, s.lng]);
    if (route.destination) pts.push([route.destination.lat, route.destination.lng]);
    if (route.origin) pts.push([route.origin.lat, route.origin.lng]);
    return pts;
  }, [route]);

  const fit = useCallback(
    (animate: boolean) => {
      const m = map.current;
      const lf = L.current;
      if (!m || !lf) return;
      const pts = allPoints();
      if (pts.length === 1) {
        m.setView(pts[0]!, 9, { animate });
        return;
      }
      // Leaves room for the controls along the top and the "last scanned" card at the bottom.
      const small = m.getSize().x < 480;
      m.fitBounds(lf.latLngBounds(pts), {
        paddingTopLeft: small ? [28, 64] : [56, 72],
        paddingBottomRight: small ? [56, 96] : [96, 112],
        maxZoom: 9,
        animate,
      });
    },
    [allPoints],
  );

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lf = (await import("leaflet")).default;
      (window as unknown as { L: typeof Leaflet }).L = lf;
      await import("leaflet.markercluster");
      if (cancelled || !el.current) return;
      L.current = lf;
      const m = lf.map(el.current, {
        zoomControl: false,
        scrollWheelZoom: false,
        worldCopyJump: true,
        attributionControl: true,
        // The printed map is a still picture.
        ...(print && { dragging: false, touchZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, zoomAnimation: false, fadeAnimation: false }),
      });
      if (!print) lf.control.zoom({ position: "bottomright" }).addTo(m);
      m.attributionControl.setPrefix(false);
      // Scroll-zoom only after the visitor engages with the map, so the page still scrolls past it.
      m.on("click focus", () => m.scrollWheelZoom.enable());
      m.on("mouseout blur", () => m.scrollWheelZoom.disable());
      map.current = m;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, [print]);

  // Basemap.
  useEffect(() => {
    const m = map.current;
    const lf = L.current;
    if (!ready || !m || !lf) return;
    tiles.current?.remove();
    const t = mapTiles[basemap];
    // "{r}" in the URL requests @2x tiles on high-density screens.
    tiles.current = lf.tileLayer(t.url, { attribution: t.attribution, maxZoom: t.maxZoom }).addTo(m);
    if (print) tiles.current.once("load", () => window.dispatchEvent(new Event(ROUTE_MAP_READY)));
  }, [ready, basemap, print]);

  // Route, pins and the animation when new scans arrive.
  useEffect(() => {
    const m = map.current;
    const lf = L.current;
    if (!ready || !m || !lf) return;
    const key = JSON.stringify(route);
    if (drawn.current?.key === key) return;
    // The route runs origin → each scan city. `path` indexes are offset from stop indexes by `off`.
    const off = route.origin ? 1 : 0;
    const path: LatLng[] = [
      ...(route.origin ? [[route.origin.lat, route.origin.lng] as LatLng] : []),
      ...route.stops.map((s) => [s.lat, s.lng] as LatLng),
    ];
    const previousPoints = drawn.current?.points ?? 0;
    const firstDraw = drawn.current === null;
    drawn.current = { points: path.length, key };
    const animate = !print && !reducedMotion();

    layers.current?.remove();
    const group = lf.layerGroup().addTo(m);
    layers.current = group;
    const lastIndex = route.stops.length - 1;
    const segments = path.slice(1).map((p, i) => arcPoints(path[i]!, p));

    // Planned leg from the latest known point to the destination: thick but lighter and dashed, so it
    // reads as "still to go" rather than as distance already covered.
    if (route.destination && path.length > 0) {
      const remaining = arcPoints(path.at(-1)!, [route.destination.lat, route.destination.lng], 48);
      lf.polyline(remaining, { color: "#ffffff", weight: 9, opacity: 0.85, lineCap: "round", interactive: false }).addTo(group);
      lf.polyline(remaining, {
        className: "rm-remaining",
        color: "#3b82f6",
        weight: 5,
        opacity: 0.75,
        dashArray: "10 9",
        lineCap: "round",
        interactive: false,
      }).addTo(group);
    }

    // Covered route: a white casing under a thick solid blue line, drawn progressively.
    const casing = lf.polyline([], { color: "#ffffff", weight: 11, opacity: 0.95, lineCap: "round", interactive: false }).addTo(group);
    const line = lf.polyline([], { color: "#1d4ed8", weight: 6, opacity: 1, lineCap: "round", lineJoin: "round", interactive: false }).addTo(group);
    const keep = firstDraw ? 0 : Math.max(0, Math.min(previousPoints - 1, segments.length));
    const shown = joinSegments(segments.slice(0, keep));
    line.setLatLngs(shown);
    casing.setLatLngs(shown);

    // Pins. The latest stop sits outside the cluster so it is always visible.
    // Print shows every pin; on screen, nearby pins fold into clusters.
    const cluster = print ? lf.layerGroup() : lf.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 36,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (c) =>
        lf.divIcon({ html: `<span class="rm-cluster">${c.getChildCount()} stops</span>`, className: "rm-icon", iconSize: [64, 30] }),
    });
    group.addLayer(cluster);
    markers.current = [];
    const makeIcon = (i: number, state: "hidden" | "pop" | "shown") => {
      const stop = route.stops[i]!;
      const cls = state === "hidden" ? "rm-hidden" : state === "pop" ? "rm-pop" : "";
      if (i !== lastIndex) {
        return lf.divIcon({ className: "rm-icon", iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -12], html: `<span class="rm-pin ${cls}">${i + 1}</span>` });
      }
      const delivered = stop.status === "DELIVERED";
      return lf.divIcon({
        className: "rm-icon",
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -18],
        html: `<span class="rm-latest ${delivered ? "rm-delivered" : ""} ${cls}">
          ${delivered ? "" : '<span class="rm-pulse"></span>'}
          <span class="rm-latest-dot">${i + 1}</span>
          <span class="rm-latest-label">${delivered ? "Delivered here" : "Last scanned here"}<b>${esc(stop.label)}</b><i>${esc(STATUS_META[route.status].label)}</i></span>
        </span>`,
      });
    };
    route.stops.forEach((stop, i) => {
      const latest = i === lastIndex;
      const hidden = animate && (firstDraw ? i + off > 0 : i + off >= previousPoints);
      const icon = makeIcon(i, hidden ? "hidden" : "shown");
      const marker = lf.marker([stop.lat, stop.lng], {
        icon,
        title: `${i + 1}. ${stop.label}`,
        alt: `${stop.label}, ${STATUS_META[stop.status].label}`,
        riseOnHover: true,
        zIndexOffset: latest ? 1000 : 0,
      });
      marker.bindPopup(stopPopup(stop, i, route.stops.length, latest), { maxWidth: 280, minWidth: 220, autoPanPadding: [24, 24] });
      if (latest) marker.addTo(group);
      else cluster.addLayer(marker);
      markers.current.push(marker);
    });

    const flagIcon = (cls: string, label: string, caption: string) =>
      lf.divIcon({
        className: "rm-icon",
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        html: `<span class="${cls}"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.33 2q2 0 3.67-.67a1 1 0 0 1 1 .17 1 1 0 0 1 .33.75v9.53a1 1 0 0 1-.4.8A6 6 0 0 1 16 14c-3 0-5-2-8-2a8 8 0 0 0-4 1"/></svg><span class="rm-flag-label">${esc(label)}<b>${caption}</b></span></span>`,
      });
    if (route.destination) {
      lf.marker([route.destination.lat, route.destination.lng], { icon: flagIcon("rm-dest", route.destination.label, "Destination"), keyboard: false })
        .bindTooltip(`Destination: ${esc(route.destination.label)}`, { direction: "top", offset: [0, -14] })
        .addTo(group);
    }
    if (route.origin && route.stops.length > 0) {
      lf.marker([route.origin.lat, route.origin.lng], { icon: flagIcon("rm-origin", route.origin.label, "Origin"), keyboard: false }).addTo(group);
    } else if (route.origin) {
      // No scans yet: the shipment's status sits at its origin.
      lf.marker([route.origin.lat, route.origin.lng], {
        keyboard: false,
        zIndexOffset: 1000,
        icon: lf.divIcon({
          className: "rm-icon",
          iconSize: [44, 44],
          iconAnchor: [22, 22],
          html: `<span class="rm-latest rm-awaiting"><span class="rm-pulse"></span>
            <span class="rm-latest-dot"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 8.7 5 8.7-5"/></svg></span>
            <span class="rm-latest-label">Origin · awaiting first scan<b>${esc(route.origin.label)}</b><i>${esc(STATUS_META[route.status].label)}</i></span>
          </span>`,
        }),
      }).addTo(group);
    }

    if (firstDraw) fit(false);

    const revealed = new Set<number>(
      route.stops.map((_, i) => i).filter((i) => !(animate && (firstDraw ? i + off > 0 : i + off >= previousPoints))),
    );
    const reveal = (i: number) => {
      if (revealed.has(i) || !markers.current[i]) return;
      revealed.add(i);
      // A fresh icon also covers pins currently folded into a cluster.
      markers.current[i].setIcon(makeIcon(i, "pop"));
    };
    const finish = () => {
      line.setLatLngs(joinSegments(segments));
      casing.setLatLngs(joinSegments(segments));
      route.stops.forEach((_, i) => reveal(i));
    };
    if (!animate || segments.length === keep) {
      finish();
      if (!firstDraw && path.length > previousPoints && route.stops[lastIndex]) {
        m.flyTo([route.stops[lastIndex].lat, route.stops[lastIndex].lng], Math.max(m.getZoom(), 6), { duration: 1.2 });
      }
      return;
    }

    // Draw the remaining segments one after another, revealing each pin as the line reaches it.
    let raf = 0;
    let cancelled = false;
    (async () => {
      if (firstDraw) await wait(350);
      else if (route.stops[lastIndex]) {
        const target = route.stops[lastIndex];
        m.flyToBounds(lf.latLngBounds([[target.lat, target.lng], ...(segments[keep]?.slice(0, 1) ?? [])]), { padding: [80, 80], maxZoom: 8, duration: 1 });
        await wait(1000);
      }
      if (firstDraw) reveal(0 - off);
      const perSegment = Math.max(450, Math.min(900, 1800 / segments.length));
      for (let s = keep; s < segments.length && !cancelled; s++) {
        const seg = segments[s]!;
        const base = line.getLatLngs().length;
        await new Promise<void>((done) => {
          const start = performance.now();
          const step = (now: number) => {
            if (cancelled) return done();
            const n = Math.max(1, Math.round(((now - start) / perSegment) * (seg.length - 1)));
            const pts = [...(line.getLatLngs() as Leaflet.LatLng[]).slice(0, base), ...seg.slice(base === 0 ? 0 : 1, n + 1)];
            line.setLatLngs(pts);
            casing.setLatLngs(pts);
            if (n < seg.length - 1) raf = requestAnimationFrame(step);
            else done();
          };
          raf = requestAnimationFrame(step);
        });
        reveal(s + 1 - off);
      }
      if (!cancelled) finish();
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [ready, route, fit, print]);

  /** Flies from stop to stop, opening each stop's card, then returns to the full route. */
  async function replay() {
    const m = map.current;
    if (!m || replaying.current || route.stops.length === 0) return;
    replaying.current = true;
    setBusy(true);
    const stopOnInteract = () => (replaying.current = false);
    m.once("mousedown touchstart wheel", stopOnInteract);
    const duration = reducedMotion() ? 0 : 1.3;
    for (let i = 0; i < route.stops.length && replaying.current; i++) {
      const s = route.stops[i]!;
      m.closePopup();
      m.flyTo([s.lat, s.lng], 8, { duration });
      await wait(duration * 1000 + 150);
      if (!replaying.current) break;
      markers.current[i]?.openPopup();
      await wait(1400);
    }
    m.closePopup();
    m.off("mousedown touchstart wheel", stopOnInteract);
    if (replaying.current) fit(true);
    replaying.current = false;
    setBusy(false);
  }

  const last = route.stops.at(-1);
  return (
    <div>
      <div
        className={cn(
          "relative isolate overflow-hidden rounded-lg border border-line bg-[#e8eef5]",
          // Fixed size that fits an A4 page, so the map doesn't re-lay out between screen and paper.
          print ? "mx-auto h-[360px] w-[660px] max-w-full break-inside-avoid" : "h-[22rem] sm:h-[28rem]",
        )}
      >
        <div ref={el} className="absolute inset-0 z-0" role="region" aria-label="Interactive route map" />
        {!ready && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Loading map…
          </div>
        )}

        {!print && (
          <div className="absolute top-3 left-3 z-[500] flex overflow-hidden rounded-md border border-line bg-white text-sm font-semibold shadow-float">
            {(["street", "satellite"] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBasemap(b)}
                aria-pressed={basemap === b}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 transition-colors",
                  basemap === b ? "bg-navy-800 text-white" : "text-navy-900 hover:bg-navy-50",
                )}
              >
                {b === "street" ? <Layers className="size-4" aria-hidden /> : <Satellite className="size-4" aria-hidden />}
                {b === "street" ? "Map" : "Satellite"}
              </button>
            ))}
          </div>
        )}

        {!print && (
          <div className="absolute top-3 right-3 z-[500] flex gap-2">
            {route.stops.length > 1 && (
              <button
                type="button"
                onClick={replay}
                disabled={busy || !ready}
                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-sm font-semibold text-navy-900 shadow-float hover:bg-navy-50 disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Play className="size-4" aria-hidden />}
                <span className="max-sm:sr-only">Replay route</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => fit(true)}
              disabled={!ready}
              className="inline-flex size-[34px] items-center justify-center rounded-md border border-line bg-white text-navy-900 shadow-float hover:bg-navy-50"
            >
              <Crosshair className="size-4" aria-hidden />
              <span className="sr-only">Show whole route</span>
            </button>
          </div>
        )}

        {!last && route.origin && (
          <div className="absolute bottom-3 left-3 z-[500] flex max-w-[calc(100%-5.5rem)] items-center gap-2.5 rounded-lg border border-line bg-white/95 px-3 py-2 shadow-float backdrop-blur">
            <span className="relative flex size-2.5 shrink-0">
              <span className="absolute inset-0 animate-ping rounded-full bg-slate-500/50 motion-reduce:hidden" />
              <span className="relative size-2.5 rounded-full bg-slate-600" />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.6875rem] font-semibold tracking-wide text-muted uppercase">Awaiting first scan</span>
              <span className="block truncate text-sm font-semibold text-navy-900">{route.origin.label}</span>
              <span className="block truncate text-xs text-muted">{STATUS_META[route.status].label}</span>
            </span>
          </div>
        )}
        {last && (
          <button
            type="button"
            onClick={() => {
              map.current?.flyTo([last.lat, last.lng], 10, { duration: reducedMotion() ? 0 : 1.2 });
              setTimeout(() => markers.current.at(-1)?.openPopup(), reducedMotion() ? 0 : 1250);
            }}
            className="absolute bottom-3 left-3 z-[500] flex max-w-[calc(100%-5.5rem)] items-center gap-2.5 rounded-lg border border-line bg-white/95 px-3 py-2 text-left shadow-float backdrop-blur hover:bg-white"
          >
            <span className="relative flex size-2.5 shrink-0">
              {last.status !== "DELIVERED" && <span className="absolute inset-0 animate-ping rounded-full bg-navy-600/50 motion-reduce:hidden" />}
              <span className={cn("relative size-2.5 rounded-full", last.status === "DELIVERED" ? "bg-success-700" : "bg-navy-700")} />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.6875rem] font-semibold tracking-wide text-muted uppercase">
                {last.status === "DELIVERED" ? "Delivered here" : "Last scanned here"}
              </span>
              <span className="block truncate text-sm font-semibold text-navy-900">{last.label}</span>
              <span className="block truncate text-xs text-muted">
                {STATUS_META[last.status].label} · {last.scans.at(-1)!.date}, {last.scans.at(-1)!.time}
              </span>
            </span>
          </button>
        )}
      </div>

      <p className="mt-3 text-xs leading-5 text-muted">
        The solid line joins the cities where this parcel was scanned, in order{print ? "." : "; select a pin to see its scans."}
        The dashed line shows what remains to the destination. Lines are not the actual road or flight path.
        {route.unplaced > 0 && ` ${route.unplaced} scan location${route.unplaced === 1 ? "" : "s"} could not be placed on the map.`}{" "}
        Places: {route.attribution}.
      </p>
    </div>
  );
}
