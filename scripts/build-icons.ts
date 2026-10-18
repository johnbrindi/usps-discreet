/**
 * Builds the app icons (PWA manifest, Apple home screen) from the logo mark in src/app/icon.svg.
 *   npx tsx scripts/build-icons.ts
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.join(import.meta.dirname, "..");
const MARK = `<path d="M20 8.5 31 14v12l-11 5.5L9 26V14z" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/>
   <path d="m9 14 11 5.5L31 14M20 19.5v12" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/>
   <path d="m14.5 11.3 11 5.5" stroke="#f2b134" stroke-width="2.6" stroke-linecap="round"/>`;

// "any": the rounded logo tile as-is. "full": edge-to-edge navy with the mark inside the maskable safe
// zone (central 80%), for Android adaptive icons and the Apple home screen (which rounds corners itself).
const any = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#12345c"/>${MARK}</svg>`;
const full = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#12345c"/>
  <g transform="translate(20 20) scale(1.05) translate(-20 -20)">${MARK}</g></svg>`;

const out = path.join(root, "public/icons");
mkdirSync(out, { recursive: true });
const render = (svg: string, size: number, file: string) =>
  sharp(Buffer.from(svg), { density: 72 * (size / 40) }).resize(size, size).png().toFile(path.join(root, file));

Promise.all([
  render(any, 192, "public/icons/icon-192.png"),
  render(any, 512, "public/icons/icon-512.png"),
  render(full, 192, "public/icons/maskable-192.png"),
  render(full, 512, "public/icons/maskable-512.png"),
  render(full, 180, "src/app/apple-icon.png"),
])
  .then(() => console.log("✓ icons written to public/icons and src/app/apple-icon.png"))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
