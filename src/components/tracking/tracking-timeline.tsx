import { MapPin } from "lucide-react";
import { STATUS_META } from "@/domain/shipment-status";
import { formatEventTime } from "@/domain/time";
import { cn } from "@/lib/utils";
import type { PublicTrackingEvent } from "@/server/tracking/providers/types";
import { statusIcons, toneClasses } from "./status-badge";

export function TrackingTimeline({ events }: { events: PublicTrackingEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-line-strong bg-surface px-4 py-6 text-center text-sm text-muted">
        No scan events have been recorded for this parcel yet. Events appear here as soon as the parcel is scanned.
      </p>
    );
  }
  return (
    <ol className="relative">
      {events.map((event, i) => {
        const meta = STATUS_META[event.status];
        const Icon = statusIcons[event.status];
        const { date, time } = formatEventTime(event.occurredAt, event.timeZone);
        const latest = i === 0;
        return (
          <li key={event.id} className="relative flex gap-4 pb-7 last:pb-0">
            {i < events.length - 1 && <span aria-hidden className="absolute top-9 bottom-0 left-[17px] w-0.5 bg-line" />}
            <span
              className={cn(
                "relative z-[1] inline-flex size-9 shrink-0 items-center justify-center rounded-full border",
                latest ? toneClasses[meta.tone] : "border-line bg-white text-muted",
              )}
            >
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-col gap-x-4 gap-y-0.5 sm:flex-row sm:items-baseline sm:justify-between">
                <p className={cn("font-semibold", latest ? "text-navy-900" : "text-ink")}>{meta.label}</p>
                <p className="shrink-0 text-sm text-muted tabular-nums">
                  <time dateTime={event.occurredAt}>
                    {date} · {time}
                  </time>
                </p>
              </div>
              <p className="mt-1 text-sm leading-6 text-ink/85">{event.description}</p>
              {event.location && (
                <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted">
                  <MapPin className="size-3.5" aria-hidden />
                  {event.location}
                </p>
              )}
              {event.source === "DEMO" && (
                <p className="mt-1 text-xs font-semibold tracking-wide text-warning-700 uppercase">Sample event</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
