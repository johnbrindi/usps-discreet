import { CalendarClock, Copy, FlaskConical, MapPin, Navigation, RadioTower } from "lucide-react";
import { STATUS_META } from "@/domain/shipment-status";
import { formatDateOnly, formatEventTime } from "@/domain/time";
import { formatTrackingNumber } from "@/domain/tracking-number";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import type { PublicTrackingResult } from "@/server/tracking/providers/types";
import { CopyButton } from "./copy-button";
import { ProgressSteps } from "./progress-steps";
import { StatusBadge } from "./status-badge";
import { TrackingTimeline } from "./tracking-timeline";

export function ShipmentSummary({ result }: { result: PublicTrackingResult }) {
  const meta = STATUS_META[result.status];
  const latest = result.events[0];
  const delivered = result.deliveredAt ? formatEventTime(result.deliveredAt, latest?.timeZone) : null;

  return (
    <div className="space-y-6">
      {result.isDemo && (
        <Alert tone="warning" title="Sample record — not a real shipment">
          This tracking number belongs to demonstration data used for development and testing. It does not represent
          a real parcel, and its events were not produced by any carrier.
        </Alert>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-line p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-muted">Tracking number</p>
              <div className="mt-0.5 flex items-center gap-2">
                <h1 className="font-mono text-lg font-semibold tracking-wide break-all text-navy-900 sm:text-xl">
                  {formatTrackingNumber(result.trackingNumber)}
                </h1>
                <CopyButton value={result.trackingNumber} label="Copy tracking number" icon={<Copy className="size-4" aria-hidden />} />
              </div>
            </div>
            <StatusBadge status={result.status} />
          </div>

          <div className="mt-6">
            <p className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
              {result.status === "DELIVERED" && delivered ? `Delivered ${delivered.date}` : meta.label}
            </p>
            <p className="mt-1 text-muted">
              {result.status === "DELIVERED" && delivered ? `at ${delivered.time}` : (result.carrier?.statusText ?? meta.summary)}
            </p>
          </div>

          <div className="mt-6">
            <ProgressSteps status={result.status} history={result.events.map((e) => e.status)} />
          </div>
        </div>

        <dl className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
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
        </dl>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-navy-900">Tracking history</h2>
          {result.serviceLevel && <p className="text-sm text-muted">Service: {result.serviceLevel}</p>}
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

function SummaryItem({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="p-5 sm:p-6">
      <dt className="flex items-center gap-1.5 text-sm text-muted">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-ink">{children}</dd>
    </div>
  );
}
