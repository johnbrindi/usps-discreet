import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createGazetteer, normalizePlace, type GazetteerData } from "@/server/geo/gazetteer";

const fixture: GazetteerData = {
  attribution: "test",
  admin1: { "US.TX": "Texas", "US.MO": "Missouri", "US.NY": "New York", "US.IL": "Illinois", "GB.ENG": "England" },
  cities: [
    ["New York City", "US", "NY", 40.71, -74.01],
    ["London", "GB", "ENG", 51.51, -0.13],
    ["Austin", "US", "TX", 30.27, -97.74],
    ["Saint Louis", "US", "MO", 38.63, -90.2],
    ["Paris", "US", "TX", 33.66, -95.56],
    ["Paris", "US", "IL", 39.61, -87.7],
  ],
};
const g = createGazetteer(fixture);

describe("gazetteer", () => {
  it("normalizes case, accents and abbreviations", () => {
    expect(normalizePlace("  St. Louis ")).toBe("saint louis");
    expect(normalizePlace("Zürich")).toBe("zurich");
  });

  it("matches city with region code or name", () => {
    expect(g.lookup({ city: "Austin", region: "TX", country: "US" })).toEqual({ lat: 30.27, lng: -97.74 });
    expect(g.lookup({ city: "paris", region: "Illinois" })).toEqual({ lat: 39.61, lng: -87.7 });
    expect(g.lookup({ city: "St Louis", region: "MO" })).toEqual({ lat: 38.63, lng: -90.2 });
  });

  it("understands carrier facility strings", () => {
    expect(g.lookup({ city: "AUSTIN TX DISTRIBUTION CENTER" })).toEqual({ lat: 30.27, lng: -97.74 });
    expect(g.lookup({ city: "AUSTIN, TX 78701" })).toEqual({ lat: 30.27, lng: -97.74 });
    expect(g.lookup({ city: "New York", country: "US" })).toEqual({ lat: 40.71, lng: -74.01 });
  });

  it("returns null rather than guessing when nothing matches", () => {
    expect(g.lookup({ city: "Atlantis" })).toBeNull();
    expect(g.lookup({ city: "London", country: "US" })).toBeNull();
    expect(g.lookup({ city: "" })).toBeNull();
  });
});

describe("bundled place list", () => {
  const data = JSON.parse(readFileSync(path.join(process.cwd(), "src/server/geo/cities.json"), "utf8")) as GazetteerData;
  const real = createGazetteer(data);
  it.each([
    [{ city: "Brooklyn", region: "NY", country: "US" }, 40.6, -73.9],
    [{ city: "Austin", region: "TX", country: "US" }, 30.3, -97.7],
    [{ city: "Newark", region: "NJ", country: "US" }, 40.7, -74.2],
    [{ city: "CINCINNATI HUB - USA" }, 39.1, -84.5],
    [{ city: "Leipzig", country: "DE" }, 51.3, 12.4],
  ])("places %o", (q, lat, lng) => {
    const hit = real.lookup(q);
    expect(hit).not.toBeNull();
    expect(Math.abs(hit!.lat - lat)).toBeLessThan(0.5);
    expect(Math.abs(hit!.lng - lng)).toBeLessThan(0.5);
  });
});
