/**
 * Offline place lookup for the route map. Turns a recorded city/region/country into coordinates using
 * the GeoNames list in cities.json (built by scripts/build-gazetteer.ts). No network calls.
 * Pure — the loader lives in ./places.ts so this can be unit tested with a small fixture.
 */

export type GazetteerData = {
  attribution: string;
  /** "US.TX" → "Texas" */
  admin1: Record<string, string>;
  /** IANA time zones, referenced by index from `cities`. */
  timeZones: string[];
  /** [name, country code, admin1 code, lat, lng, time zone index], most populous first. */
  cities: [string, string, string, number, number, number][];
};

export type PlaceQuery = { city?: string | null; region?: string | null; country?: string | null };
export type Coordinates = { lat: number; lng: number };
export type Place = Coordinates & { timeZone: string | null };

const ABBREVIATIONS: [RegExp, string][] = [
  [/\bst\b/g, "saint"],
  [/\bste\b/g, "sainte"],
  [/\bft\b/g, "fort"],
  [/\bmt\b/g, "mount"],
];

export function normalizePlace(s: string) {
  let out = s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  for (const [re, full] of ABBREVIATIONS) out = out.replace(re, full);
  return out;
}

/** Words carriers append to facility names ("AUSTIN TX DISTRIBUTION CENTER", "CINCINNATI HUB - USA"). */
const FACILITY_WORDS = new Set([
  "distribution", "center", "centre", "network", "processing", "regional", "facility", "hub", "gateway",
  "international", "sort", "sorting", "annex", "terminal", "depot", "station", "post", "office", "usa",
]);

export function createGazetteer(data: GazetteerData) {
  const byName = new Map<string, number[]>();
  const add = (key: string, i: number) => {
    const list = byName.get(key);
    if (list) list.push(i);
    else byName.set(key, [i]);
  };
  data.cities.forEach(([name], i) => {
    const key = normalizePlace(name);
    add(key, i);
    // "New York City" is usually written "New York".
    if (key.endsWith(" city")) add(key.slice(0, -5), i);
  });

  const regionMatches = (i: number, region: string) => {
    const [, cc, a1] = data.cities[i]!;
    const r = normalizePlace(region);
    return r === normalizePlace(a1) || r === normalizePlace(data.admin1[`${cc}.${a1}`] ?? "");
  };

  function pick(name: string, region: string | null, country: string | null) {
    let ids = byName.get(name);
    if (!ids) return null;
    if (country) ids = ids.filter((i) => data.cities[i]![1] === country);
    if (region) {
      const inRegion = ids.filter((i) => regionMatches(i, region));
      // A region that matches nothing is likely free text; fall back to the most populous match.
      if (inRegion.length > 0) ids = inRegion;
    }
    const i = ids[0];
    return i === undefined ? null : data.cities[i]!;
  }

  return {
    attribution: data.attribution,
    lookup(q: PlaceQuery): Place | null {
      if (!q.city?.trim()) return null;
      const country = q.country?.trim().toUpperCase() || null;
      let region = q.region?.trim() || null;
      const words = normalizePlace(q.city).split(" ").filter(Boolean);
      // Drop trailing facility words, then ZIP codes and US state codes the carrier folded into the city.
      while (words.length > 1 && (FACILITY_WORDS.has(words.at(-1)!) || /^\d+$/.test(words.at(-1)!))) words.pop();
      if (!region && words.length > 1 && words.at(-1)!.length === 2) region = words.pop()!;
      for (let n = words.length; n > 0; n--) {
        const hit = pick(words.slice(0, n).join(" "), region, country);
        if (hit) return { lat: hit[3], lng: hit[4], timeZone: data.timeZones[hit[5]] ?? null };
      }
      return null;
    },
  };
}

export type Gazetteer = ReturnType<typeof createGazetteer>;
