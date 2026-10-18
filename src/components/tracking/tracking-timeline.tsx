import { Clock, MapPin, ScanLine } from "lucide-react";
import { STATUS_META, type StatusTone } from "@/domain/shipment-status";
import { formatEventTime } from "@/domain/time";
import { cn } from "@/lib/utils";
import type { PublicTrackingEvent } from "@/server/tracking/providers/types";
import { statusIcons, toneClasses } from "./status-badge";

/** Solid icon colours for the latest event; earlier events use a quieter tint of the same hue. */
const solidTone: Record<StatusTone, string> = {
  neutral: "bg-slate-600 text-white border-slate-600",
  info: "bg-navy-700 text-white border-navy-700",
  progress: "bg-progress-700 text-white border-progress-700",
  success: "bg-success-700 text-white border-success-700",
  warning: "bg-warning-700 text-white border-warning-700",
  danger: "bg-danger-700 text-white border-danger-700",
};

export function TrackingTimeline({ events }: { events: PublicTrackingEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-dashed border-line-strong bg-surface px-6 py-10 text-center">
        <span className="mb-3 inline-flex size-12 items-center justify-center rounded-full bg-white text-navy-700 shadow-card">
          <ScanLine className="size-6" aria-hidden />
        </span>
        <p className="font-semibold text-navy-900">Waiting for the first scan</p>
        <p className="mt-1 max-w-sm text-sm leading-6 text-muted">
          The label exists, but the parcel hasn&apos;t been scanned yet. Each scan will appear here as it happens.
        </p>
      </div>
    );
  }
  return (
    <ol className="relative">
      {events.map((event, i) => {
        const meta = STATUS_META[event.status];
        const Icon = statusIcons[event.status];
        const { date, time } = formatEventTime(event.occurredAt, event.timeZone);
        const prevDate = i > 0 ? formatEventTime(events[i - 1]!.occurredAt, events[i - 1]!.timeZone).date : null;
        const latest = i === 0;
        return (
          <li
            key={event.id}
            className={cn("relative flex gap-4 pb-7 last:pb-0", i < 10 && "fade-up")}
            style={i < 10 ? { animationDelay: `${0.1 + i * 0.07}s` } : undefined}
          >
            {i < events.length - 1 && (
              <span aria-hidden className={cn("absolute top-11 bottom-1 left-[19px] w-0.5", latest ? "bg-gradient-to-b from-navy-600/50 to-line" : "bg-line")} />
            )}
            <span
              className={cn(
                "relative z-[1] inline-flex size-10 shrink-0 items-center justify-center rounded-full border",
                latest ? cn(solidTone[meta.tone], "shadow-[0_0_0_4px_var(--color-navy-50)]") : toneClasses[meta.tone],
              )}
            >
              <Icon className="size-[1.125rem]" aria-hidden />
            </span>
            <div className={cn("min-w-0 flex-1", latest && "rounded-lg bg-navy-50/60 px-3.5 py-2.5 -mt-0.5 ring-1 ring-navy-600/10")}>
              {date !== prevDate && !latest && (
                <p className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{date}</p>
              )}
              <div className="flex flex-col gap-x-4 gap-y-0.5 pt-1 sm:flex-row sm:items-baseline sm:justify-between">
                <p className={cn("font-semibold", latest ? "text-navy-900" : "text-ink")}>
                  {meta.label}
                  {latest && (
                    <span className="ml-2 rounded bg-navy-700 px-1.5 py-0.5 align-middle text-[0.625rem] font-bold tracking-wide text-white uppercase">
                      Latest
                    </span>
                  )}
                </p>
                <p className="inline-flex shrink-0 items-center gap-1 text-sm text-muted tabular-nums">
                  <Clock className="size-3.5" aria-hidden />
                  <time dateTime={event.occurredAt}>
                    {date} · {time}
                  </time>
                </p>
              </div>
              <p className="mt-1 text-sm leading-6 text-ink/85">{event.description}</p>
              {event.location && (
                <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-navy-800">
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
