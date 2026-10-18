/**
 * Map tile sources for the interactive route map. Override with NEXT_PUBLIC_MAP_* variables to use a
 * keyed provider (MapTiler, Stadia, Mapbox…) in production — the free defaults below are fine for
 * development and light traffic, but their usage policies don't cover a busy commercial site.
 * next.config.ts allows these hosts in the Content-Security-Policy automatically.
 */
const env = (value: string | undefined, fallback: string) => value?.trim() || fallback;

// Referenced as literal process.env.NEXT_PUBLIC_* so Next inlines them into the client bundle.
export const mapTiles = {
  street: {
    url: env(process.env.NEXT_PUBLIC_MAP_STREET_URL, "https://tile.openstreetmap.org/{z}/{x}/{y}.png"),
    attribution: env(
      process.env.NEXT_PUBLIC_MAP_STREET_ATTRIBUTION,
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    ),
    maxZoom: 19,
  },
  satellite: {
    url: env(
      process.env.NEXT_PUBLIC_MAP_SATELLITE_URL,
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    ),
    attribution: env(
      process.env.NEXT_PUBLIC_MAP_SATELLITE_ATTRIBUTION,
      "Imagery &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    ),
    maxZoom: 18,
  },
} as const;

/** CSP origins for a tile URL template, e.g. "https://{s}.tile.example.com/…" → "https://*.tile.example.com". */
export function tileOrigin(template: string) {
  const m = /^(https:\/\/[^/]+)/.exec(template.replace(/\{s\}/g, "*"));
  return m?.[1] ?? null;
}
