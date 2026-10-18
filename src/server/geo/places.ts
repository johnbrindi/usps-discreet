import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createGazetteer, type Gazetteer, type GazetteerData } from "./gazetteer";

// Read from disk rather than imported: the file is large and typing it slows the compiler.
// next.config.ts → outputFileTracingIncludes ships it with the routes that draw maps; the path is spelled
// out in full so the bundler traces just this file, not the whole project.
let gazetteer: Gazetteer | undefined;
export function places() {
  gazetteer ??= createGazetteer(
    JSON.parse(readFileSync(path.join(process.cwd(), "src/server/geo/cities.json"), "utf8")) as GazetteerData,
  );
  return gazetteer;
}
