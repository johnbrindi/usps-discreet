/**
 * Live check of the carrier integrations — no database writes.
 *
 *   npm run carriers:check                     # which providers have credentials
 *   npm run carriers:check -- 9400111899223197428490          # detect + query the real API
 *   npm run carriers:check -- 1Z999AA10123456784 --provider ship24
 */
import "./load-env";
import { CARRIER_PROVIDERS, PROVIDER_LABELS, detectCarrier, type CarrierProviderId } from "@/domain/carriers";
import { STATUS_META } from "@/domain/shipment-status";
import { normalizeTrackingNumber } from "@/domain/tracking-number";
import { configuredProviders, getCarrierClient } from "@/server/carriers/registry";
import { CarrierError } from "@/server/carriers/types";

async function main() {
  const args = process.argv.slice(2);
  const pIdx = args.indexOf("--provider");
  const forced = pIdx >= 0 ? (args[pIdx + 1] as CarrierProviderId) : undefined;
  const number = args.find((a, i) => !a.startsWith("--") && (pIdx < 0 || i !== pIdx + 1));

  const available = configuredProviders();
  for (const p of CARRIER_PROVIDERS) console.log(`${available.includes(p) ? "✓" : "·"} ${PROVIDER_LABELS[p]}${available.includes(p) ? "" : " — no credentials"}`);
  if (!number) return;

  const detected = detectCarrier(normalizeTrackingNumber(number));
  console.log(`\nNumber ${detected.trackingNumber} looks like: ${detected.carrier ?? "unknown carrier"} → try ${detected.providers.join(", ")}`);
  const order = forced ? [forced] : detected.providers;

  for (const id of order) {
    const client = getCarrierClient(id);
    if (!client) {
      console.log(`  ${id}: skipped (not configured)`);
      continue;
    }
    const started = Date.now();
    try {
      const r = await client.track(detected.trackingNumber);
      console.log(`  ${id}: ✓ ${Date.now() - started} ms — ${r.carrierName}, ${STATUS_META[r.status].label}${r.statusText ? ` ("${r.statusText}")` : ""}`);
      if (r.estimatedDelivery) console.log(`    estimated delivery ${r.estimatedDelivery}`);
      for (const e of r.events.slice(0, 8)) {
        const place = [e.city, e.region, e.country].filter(Boolean).join(", ");
        console.log(`    ${e.occurredAt.toISOString()}  ${e.status.padEnd(19)} ${e.description}${place ? ` — ${place}` : ""}`);
      }
      if (r.events.length > 8) console.log(`    … ${r.events.length - 8} more`);
      return;
    } catch (err) {
      const why = err instanceof CarrierError ? `${err.kind}: ${err.message}` : String(err);
      console.log(`  ${id}: ✗ ${Date.now() - started} ms — ${why}`);
    }
  }
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
