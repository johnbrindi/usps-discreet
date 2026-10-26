import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/layout/logo";
import { PrintButton } from "@/components/tracking/print-button";
import { LiveRouteMap } from "@/components/tracking/live-route-map";
import { siteConfig } from "@/config/site";
import { STATUS_META } from "@/domain/shipment-status";
import { formatDateOnly, formatEventTime } from "@/domain/time";
import { formatTrackingNumber, normalizeTrackingNumber } from "@/domain/tracking-number";
import { logger } from "@/lib/logger";
import { resolveRoute } from "@/server/geo/route-map";
import { lookupTracking } from "@/server/tracking/service";

type Props = { params: Promise<{ trackingNumber: string }>; searchParams: Promise<{ print?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tn = normalizeTrackingNumber(decodeURIComponent((await params).trackingNumber)).slice(0, 40);
  // Also the default PDF file name in most browsers.
  return { title: { absolute: `Tracking summary ${tn} — ${siteConfig.name}` }, robots: { index: false, follow: false } };
}

/**
 * Printable tracking summary. It restates what the public tracking page shows — nothing more — and says
 * plainly that it is a printout, not a receipt, waybill or proof of delivery.
 */
export default async function TrackingSummaryPage({ params, searchParams }: Props) {
  const raw = decodeURIComponent((await params).trackingNumber);
  const { print } = await searchParams;
  const lookup = await lookupTracking(raw);

  if (lookup.kind !== "found") {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-navy-900">No summary available</h1>
        <p className="mt-3 text-muted">
          {lookup.kind === "rate_limited"
            ? "Too many requests — please wait a minute and try again."
            : "We couldn't find tracking information for this number."}
        </p>
        <Link href={`/track/${encodeURIComponent(normalizeTrackingNumber(raw))}`} className="mt-6 inline-block font-semibold text-navy-700 underline">
          Back to tracking
        </Link>
      </main>
    );
  }

  const r = lookup.result;
  const meta = STATUS_META[r.status];
  let map = null;
  try {
    map = resolveRoute(r);
  } catch (err) {
    logger.error("tracking.route_map_failed", err);
  }
  const printed = formatEventTime(new Date().toISOString(), null);
  const delivered = r.deliveredAt ? formatEventTime(r.deliveredAt, r.events[0]?.timeZone) : null;

  return (
    <main className="mx-auto w-full max-w-[52rem] px-4 py-6 print:max-w-none print:p-0 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 print:hidden">
        <p className="text-sm text-muted">Choose &ldquo;Save as PDF&rdquo; as the printer to download this summary.</p>
        <div className="flex items-center gap-4">
          <Link href={`/track/${encodeURIComponent(r.trackingNumber)}`} className="text-sm font-semibold text-navy-700 hover:underline">
            Back to tracking
          </Link>
          <PrintButton auto={print === "1"} waitForMap={map !== null} />
        </div>
      </div>

      <article className="rounded-lg border border-line bg-white p-6 shadow-card print:border-0 print:p-0 print:shadow-none sm:p-10">
        <header className="flex items-start justify-between gap-4 border-b-2 border-navy-900 pb-5">
          <div className="flex items-center gap-3">
            <LogoMark className="size-11 shrink-0" />
            <div>
              <p className="text-lg font-bold text-navy-900">{siteConfig.name}</p>
              <p className="text-xs text-muted">{siteConfig.url.replace(/^https?:\/\//, "")} · {siteConfig.supportEmail}</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-xl font-bold text-navy-900">Tracking summary</h1>
            <p className="mt-0.5 text-xs text-muted">Printed {printed.date}, {printed.time}</p>
          </div>
        </header>

        {r.isDemo && (
          <p className="mt-5 rounded border border-warning-700/40 bg-warning-50 px-3 py-2 text-sm font-semibold text-warning-700">
            SAMPLE RECORD — demonstration data, not a real shipment.
          </p>
        )}

        <section className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2 print:grid-cols-2">
          <Fact label="Tracking number" value={<span className="font-mono">{formatTrackingNumber(r.trackingNumber)}</span>} />
          <Fact
            label="Current status"
            value={r.status === "DELIVERED" && delivered ? `Delivered ${delivered.date} at ${delivered.time}` : meta.label}
          />
          <Fact label="From" value={r.origin ?? "Not provided"} />
          <Fact label="To" value={r.destination ?? "Not provided"} />
          <Fact label="Service" value={r.serviceLevel ?? "Not provided"} />
          <Fact label="Package description" value={r.packageDescription ?? "Not provided"} />
          <Fact label="Shipper" value={[r.shipper.name, r.shipper.email, r.shipper.phone].filter(Boolean).join(" · ") || "Not provided"} />
          <Fact label="Receiver" value={[r.recipient.name, r.recipient.email, r.recipient.phone].filter(Boolean).join(" · ") || "Not provided"} />
          {r.details.paymentMode && <Fact label="Payment mode" value={r.details.paymentMode} />}
          {r.details.pickupDate && (
            <Fact label="Pick-up" value={[formatDateOnly(r.details.pickupDate), r.details.pickupTime].filter(Boolean).join(" at ")} />
          )}
          {r.details.departureTime && <Fact label="Departure time" value={r.details.departureTime} />}
          {r.details.shipmentType && <Fact label="Type of shipment" value={r.details.shipmentType} />}
          {r.details.shipmentMode && <Fact label="Shipment mode" value={r.details.shipmentMode} />}
          {r.details.product && <Fact label="Product" value={r.details.product} />}
          {r.details.quantity && <Fact label="Qty" value={r.details.quantity} />}
          {r.details.weight && <Fact label="Weight" value={r.details.weight} />}
          {r.details.totalFreight && <Fact label="Total freight" value={r.details.totalFreight} />}
          {r.details.comments && <Fact label="Comments" value={r.details.comments} />}
          <Fact
            label="Expected delivery"
            value={
              r.status === "DELIVERED"
                ? "Delivered"
                : r.estimatedDelivery
                  ? `${formatDateOnly(r.estimatedDelivery.date)} (source: ${r.estimatedDelivery.source})`
                  : "Not available"
            }
          />
          {r.carrier && <Fact label="Carrier" value={r.carrier.name} />}
        </section>

        {map && (
          <section className="mt-8 break-inside-avoid">
            <h2 className="mb-3 text-sm font-bold tracking-wide text-navy-900 uppercase">{map.stops.length > 0 ? "Route so far" : "Route"}</h2>
            <LiveRouteMap route={map} variant="print" />
          </section>
        )}

        <section className="mt-8">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-navy-900 uppercase">Tracking history</h2>
          {r.events.length === 0 ? (
            <p className="text-sm text-muted">No scans have been recorded yet.</p>
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line-strong text-xs tracking-wide text-muted uppercase">
                  <th className="py-2 pr-3 font-semibold">Date &amp; local time</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 pr-3 font-semibold">Details</th>
                  <th className="py-2 font-semibold">Location</th>
                </tr>
              </thead>
              <tbody>
                {r.events.map((e) => {
                  const t = formatEventTime(e.occurredAt, e.timeZone);
                  return (
                    <tr key={e.id} className="break-inside-avoid border-b border-line align-top">
                      <td className="py-2 pr-3 whitespace-nowrap tabular-nums">
                        {t.date}
                        <span className="block text-xs text-muted">{t.time}</span>
                      </td>
                      <td className="py-2 pr-3 font-semibold">{STATUS_META[e.status].label}</td>
                      <td className="py-2 pr-3">{e.description}</td>
                      <td className="py-2">{e.location ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <footer className="mt-10 border-t border-line pt-4 text-xs leading-5 text-muted">
          This is a printout of the tracking information shown at {siteConfig.url.replace(/^https?:\/\//, "")}/track at the
          time of printing. It is not a receipt, invoice, waybill, customs document or proof of delivery. For current
          status, look up the tracking number online. {siteConfig.name} never asks for payment by chat, WhatsApp or text
          message.
        </footer>
      </article>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-0.5 font-semibold text-ink">{value}</p>
    </div>
  );
}
