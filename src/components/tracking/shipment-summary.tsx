import { CalendarClock, Copy, FileDown, FlaskConical, Map as MapIcon, MapPin, Navigation, Package, RadioTower } from "lucide-react";
import { STATUS_META, type StatusTone } from "@/domain/shipment-status";
import { formatDateOnly, formatEventTime } from "@/domain/time";
import { formatTrackingNumber } from "@/domain/tracking-number";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { resolveRoute } from "@/server/geo/route-map";
import type { PublicTrackingResult } from "@/server/tracking/providers/types";
import { CopyButton } from "./copy-button";
import { ProgressSteps } from "./progress-steps";
import { LiveRouteMap } from "./live-route-map";
import { StatusBadge, statusIcons } from "./status-badge";
import { TrackingTimeline } from "./tracking-timeline";

/** Hero band colour per status tone. */
const heroTone: Record<StatusTone, string> = {
  neutral: "from-navy-900 to-navy-800",
  info: "from-navy-900 to-navy-700",
  progress: "from-navy-900 to-[#0d5a6b]",
  success: "from-[#0f4d2e] to-success-700",
  warning: "from-[#5c3500] to-warning-700",
  danger: "from-[#6b1810] to-danger-700",
};

export function ShipmentSummary({ result }: { result: PublicTrackingResult }) {
  const meta = STATUS_META[result.status];
  const StatusIcon = statusIcons[result.status];
  const latest = result.events[0];
  const delivered = result.deliveredAt ? formatEventTime(result.deliveredAt, latest?.timeZone) : null;
  const updated = latest ? formatEventTime(latest.occurredAt, latest.timeZone) : null;
  const map = safeRouteMap(result);
  const active = result.status !== "DELIVERED" && result.status !== "RETURNED_TO_SENDER";

  return (
    <div className="space-y-6">
      {result.isDemo && (
        <Alert tone="warning" title="Sample record — not a real shipment">
          This tracking number belongs to demonstration data used for development and testing. It does not represent
          a real parcel, and its events were not produced by any carrier.
        </Alert>
      )}

      <Card className="overflow-hidden">
        <div className={cn("relative overflow-hidden bg-gradient-to-br p-5 text-white sm:p-7", heroTone[meta.tone])}>
          {/* Decorative route line — purely visual. */}
          <svg aria-hidden viewBox="0 0 400 160" className="pointer-events-none absolute -right-10 -bottom-6 h-44 w-auto opacity-[0.12]">
            <path d="M10 140 C 90 140, 110 40, 200 60 S 320 20, 390 30" fill="none" stroke="white" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
            <circle cx="10" cy="140" r="7" fill="white" />
            <circle cx="390" cy="30" r="9" fill="none" stroke="white" strokeWidth="3" />
          </svg>

          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wider text-white/70 uppercase">Tracking number</p>
              <div className="mt-1 flex items-center gap-1.5">
                <h1 className="font-mono text-lg font-semibold tracking-wide break-all sm:text-xl">
                  {formatTrackingNumber(result.trackingNumber)}
                </h1>
                <span className="[&_button]:text-white/80 [&_button:hover]:bg-white/10 [&_button:hover]:text-white">
                  <CopyButton value={result.trackingNumber} label="Copy tracking number" icon={<Copy className="size-4" aria-hidden />} />
                </span>
              </div>
            </div>
            <span className="rounded-md bg-white p-px">
              <StatusBadge status={result.status} />
            </span>
          </div>

          <div className="relative mt-6 flex items-center gap-4">
            <span className="relative flex shrink-0">
              {active && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-white/25 motion-reduce:hidden" />}
              <span className="relative inline-flex size-14 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30 sm:size-16">
                <StatusIcon className="size-7 sm:size-8" aria-hidden />
              </span>
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-bold tracking-tight sm:text-3xl">
                {result.status === "DELIVERED" && delivered ? `Delivered ${delivered.date}` : meta.label}
              </p>
              <p className="mt-1 text-white/85">
                {result.status === "DELIVERED" && delivered ? `at ${delivered.time}` : (result.carrier?.statusText ?? meta.summary)}
              </p>
            </div>
          </div>

          {(updated || latest?.location) && (
            <p className="relative mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/75">
              {latest?.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4" aria-hidden /> Last scan: {latest.location}
                </span>
              )}
              {updated && (
                <span>
                  Updated {updated.date} · {updated.time}
                </span>
              )}
            </p>
          )}
        </div>

        <div className="border-b border-line px-3 py-6 sm:px-6">
          <ProgressSteps status={result.status} history={result.events.map((e) => e.status)} />
        </div>

        <dl className="grid grid-cols-2 divide-line max-sm:[&>*:nth-child(-n+2)]:border-b max-sm:[&>*:nth-child(odd)]:border-r sm:grid-cols-4 sm:divide-x">
          <SummaryItem icon={<CalendarClock className="size-4" aria-hidden />} label="Expected delivery">
            {result.status === "DELIVERED" ? (
              "Delivered"
            ) : result.estimatedDelivery ? (
              <>
                {formatDateOnly(result.estimatedDelivery.date)}
                <span className="mt-0.5 block text-xs font-normal text-muted">Source: {result.estimatedDelivery.source}</span>
              </>
            ) : (
              <span className="font-normal text-muted">Not available yet</span>
            )}
          </SummaryItem>
          <SummaryItem icon={<MapPin className="size-4" aria-hidden />} label="From">
            {result.origin ?? <span className="font-normal text-muted">Not provided</span>}
          </SummaryItem>
          <SummaryItem icon={<Navigation className="size-4" aria-hidden />} label="To">
            {result.destination ?? <span className="font-normal text-muted">Not provided</span>}
          </SummaryItem>
          <SummaryItem icon={<Package className="size-4" aria-hidden />} label="Service">
            {result.serviceLevel ?? <span className="font-normal text-muted">Not provided</span>}
          </SummaryItem>
        </dl>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface/60 px-5 py-3 sm:px-6">
          <p className="text-sm text-muted">
            {result.events.length} scan{result.events.length === 1 ? "" : "s"} recorded
          </p>
          <a
            href={`/summary/${encodeURIComponent(result.trackingNumber)}?print=1`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-white px-3 py-1.5 text-sm font-semibold text-navy-900 hover:bg-navy-50"
          >
            <FileDown className="size-4" aria-hidden /> Download summary (PDF)
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </Card>

      {map && (
        <Card className="p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-navy-900">
            <MapIcon className="size-5 text-navy-700" aria-hidden /> {map.stops.length > 0 ? "Route so far" : "Route"}
          </h2>
          <LiveRouteMap route={map} />
        </Card>
      )}

      <Card className="p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-navy-900">Tracking history</h2>
          {(result.serviceLevel || result.packageDescription) && (
            <p className="text-sm text-muted">
              {[result.serviceLevel && `Service: ${result.serviceLevel}`, result.packageDescription && `Package: ${result.packageDescription}`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
        <TrackingTimeline events={result.events} />
        {result.carrier && (
          <p className="mt-6 flex items-start gap-2 rounded-md bg-surface px-3 py-2.5 text-sm text-ink/85">
            <RadioTower className="mt-0.5 size-4 shrink-0 text-navy-700" aria-hidden />
            <span>
              Live tracking from <strong className="font-semibold">{result.carrier.name}</strong>
              {result.carrier.trackingNumber !== result.trackingNumber && (
                <>
                  {" "}(carrier number <span className="font-mono">{formatTrackingNumber(result.carrier.trackingNumber)}</span>)
                </>
              )}
              .{result.carrier.checkedAt && <> Last checked {formatEventTime(result.carrier.checkedAt, null).date} at {formatEventTime(result.carrier.checkedAt, null).time}.</>}
            </span>
          </p>
        )}
        <p className="mt-6 border-t border-line pt-4 text-xs text-muted">
          Times are shown in the local time of each scan location (UTC where the location&apos;s time zone is unknown).
          {result.isDemo && (
            <span className="ml-1 inline-flex items-center gap-1 font-semibold text-warning-700">
              <FlaskConical className="size-3.5" aria-hidden /> Demo data
            </span>
          )}
        </p>
      </Card>
    </div>
  );
}

/** The map is an extra: if it can't be built, the rest of the page still renders. */
function safeRouteMap(result: PublicTrackingResult) {
  try {
    return resolveRoute(result);
  } catch (err) {
    logger.error("tracking.route_map_failed", err);
    return null;
  }
}

function SummaryItem({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="border-line p-4 sm:p-5">
      <dt className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted uppercase">
        {icon}
        {label}
      </dt>
      <dd className="mt-1.5 text-sm font-semibold text-ink sm:text-base">{children}</dd>
    </div>
  );
}
