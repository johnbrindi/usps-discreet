import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Topology } from "topojson-specification";
import { createGazetteer, type Gazetteer, type GazetteerData } from "./gazetteer";

// Read from disk rather than imported: the files are large and typing them slows the compiler.
// next.config.ts → outputFileTracingIncludes ships them with the routes that draw maps.
// Paths are spelled out in full so the bundler traces just these files, not the whole project.
const readJson = <T,>(file: string) => JSON.parse(readFileSync(file, "utf8")) as T;

let gazetteer: Gazetteer | undefined;
export function places() {
  gazetteer ??= createGazetteer(readJson<GazetteerData>(path.join(process.cwd(), "src/server/geo/cities.json")));
  return gazetteer;
}

let world: Topology | undefined;
export function worldTopology() {
  world ??= readJson<Topology>(path.join(process.cwd(), "node_modules/world-atlas/countries-50m.json"));
  return world;
}

let states: Topology | undefined;
export function usStatesTopology() {
  states ??= readJson<Topology>(path.join(process.cwd(), "node_modules/us-atlas/states-10m.json"));
  return states;
}
