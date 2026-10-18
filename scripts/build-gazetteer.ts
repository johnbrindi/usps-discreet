/**
 * Builds src/server/geo/cities.json — the offline place list the route map uses to put recorded scan
 * cities on the map. Source: GeoNames (CC BY 4.0), https://download.geonames.org/export/dump/
 *
 *   curl -O https://download.geonames.org/export/dump/cities5000.zip && unzip cities5000.zip
 *   curl -O https://download.geonames.org/export/dump/admin1CodesASCII.txt
 *   npx tsx scripts/build-gazetteer.ts <dir containing both files>
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) throw new Error("Usage: tsx scripts/build-gazetteer.ts <geonames dir>");

const admin1: Record<string, string> = {};
for (const line of readFileSync(path.join(dir, "admin1CodesASCII.txt"), "utf8").split("\n")) {
  const [code, , ascii] = line.split("\t");
  if (code && ascii) admin1[code] = ascii;
}

type Row = [name: string, country: string, admin1: string, lat: number, lng: number, pop: number, timeZone: string];
const rows: Row[] = [];
for (const line of readFileSync(path.join(dir, "cities5000.txt"), "utf8").split("\n")) {
  const f = line.split("\t");
  if (f.length < 15) continue;
  // asciiname, country code, admin1 code, latitude, longitude, population, IANA time zone
  rows.push([f[2]!, f[8]!, f[10]!, Number(Number(f[4]).toFixed(2)), Number(Number(f[5]).toFixed(2)), Number(f[14]) || 0, f[17]!]);
}
// Most populous first, so the first match for an ambiguous name is the likeliest one.
rows.sort((a, b) => b[5] - a[5]);

const usedAdmin1 = new Set(rows.map((r) => `${r[1]}.${r[2]}`));
// Time zones are stored once and referenced by index to keep the file small.
const timeZones = [...new Set(rows.map((r) => r[6]))].sort();
const tzIndex = new Map(timeZones.map((tz, i) => [tz, i]));
const out = {
  attribution: "GeoNames (CC BY 4.0)",
  admin1: Object.fromEntries(Object.entries(admin1).filter(([k]) => usedAdmin1.has(k))),
  timeZones,
  cities: rows.map(([name, cc, a1, lat, lng, , tz]) => [name, cc, a1, lat, lng, tzIndex.get(tz)!]),
};
const file = path.join(import.meta.dirname, "../src/server/geo/cities.json");
writeFileSync(file, JSON.stringify(out));
console.log(`${out.cities.length} places → ${file}`);
