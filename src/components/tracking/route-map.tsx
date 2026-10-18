import { Flag, MapPin } from "lucide-react";
import { STATUS_META } from "@/domain/shipment-status";
import { formatEventTime } from "@/domain/time";
import { cn } from "@/lib/utils";
import { MAP_HEIGHT, MAP_WIDTH, type RouteMapModel } from "@/server/geo/route-map";

/** Keeps a pin's label inside the map: anchor left of the pin near the right edge, right of it elsewhere. */
const labelSide = (x: number) => (x > 0.7 ? "right-full mr-2 text-right" : "left-full ml-2");
const pos = (p: { x: number; y: number }) => ({ left: `${(p.x * 100).toFixed(2)}%`, top: `${(p.y * 100).toFixed(2)}%` });

export function RouteMap({ model, variant = "screen" }: { model: RouteMapModel; variant?: "screen" | "print" }) {
  const animate = variant === "screen";
  const last = model.stops.length - 1;
  return (
    <figure>
      <div
        className="relative overflow-hidden rounded-md border border-line bg-[#eef3f9]"
        style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}
      >
        <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="absolute inset-0 size-full" aria-hidden>
          <path d={model.land} fill="#ffffff" />
          {model.states && <path d={model.states} fill="none" stroke="#dbe3ec" strokeWidth={0.8} />}
          <path d={model.borders} fill="none" stroke="#c3cfdc" strokeWidth={1} />
          {model.remaining && (
            <path d={model.remaining} fill="none" stroke="var(--color-navy-600)" strokeOpacity={0.45} strokeWidth={2} strokeDasharray="2 7" strokeLinecap="round" />
          )}
          {model.route && (
            <path
              d={model.route}
              pathLength={1}
              fill="none"
              stroke="var(--color-navy-700)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={animate ? "route-draw" : undefined}
            />
          )}
        </svg>

        {model.origin && <Pin p={model.origin} label={model.origin.label} caption="Origin" tone="muted" />}
        {model.destination && (
          <Pin p={model.destination} label={model.destination.label} caption="Destination" tone="destination" delay={animate ? model.stops.length : undefined} />
        )}
        {model.stops.map((s, i) => (
          <Pin
            key={`${s.x}-${s.y}-${i}`}
            p={s}
            number={i + 1}
            label={i === 0 || i === last ? s.label : undefined}
            caption={i === last ? STATUS_META[s.status].label : undefined}
            tone={i === last ? (s.status === "DELIVERED" ? "delivered" : "latest") : "past"}
            delay={animate ? i : undefined}
            title={`${i + 1}. ${s.label} — ${STATUS_META[s.status].label}, ${formatEventTime(s.occurredAt, s.timeZone).date}${s.scans > 1 ? ` (${s.scans} scans)` : ""}`}
          />
        ))}
      </div>

      <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-navy-700" aria-hidden /> Scan location
        </span>
        {model.remaining && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0 w-5 border-t-2 border-dotted border-navy-600/60" aria-hidden /> Remaining to destination
          </span>
        )}
        <span className="basis-full leading-5">
          Pins mark the cities where this parcel was scanned, in order. Lines join consecutive scans and are not the
          actual road or flight path.
          {model.unplaced > 0 && ` ${model.unplaced} scan location${model.unplaced === 1 ? "" : "s"} could not be placed on the map.`}{" "}
          Places: {model.attribution}.
        </span>
      </figcaption>
    </figure>
  );
}

type Tone = "past" | "latest" | "delivered" | "destination" | "muted";

function Pin({
  p,
  number,
  label,
  caption,
  tone,
  delay,
  title,
}: {
  p: { x: number; y: number };
  number?: number;
  label?: string;
  caption?: string;
  tone: Tone;
  delay?: number;
  title?: string;
}) {
  const live = tone === "latest";
  return (
    <div
      className={cn("absolute -translate-x-1/2 -translate-y-1/2", delay !== undefined && "pin-pop")}
      style={{ ...pos(p), animationDelay: delay !== undefined ? `${0.25 + delay * 0.18}s` : undefined }}
      title={title}
    >
      <span className="relative flex">
        {live && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-navy-600/40 motion-reduce:hidden print:hidden" />}
        <span
          className={cn(
            "relative inline-flex items-center justify-center rounded-full border-2 font-bold shadow-[0_1px_4px_rgb(16_24_40/0.35)]",
            tone === "destination" ? "border-navy-700 bg-white text-navy-700" : "border-white text-white",
            number !== undefined ? "size-6 text-[0.6875rem]" : "size-7",
            tone === "past" && "bg-navy-600",
            tone === "latest" && "size-7 bg-navy-800 text-xs",
            tone === "delivered" && "size-7 bg-success-700 text-xs",
            tone === "muted" && "bg-slate-500",
          )}
        >
          {number ?? (tone === "destination" ? <Flag className="size-3.5" aria-hidden /> : <MapPin className="size-3.5" aria-hidden />)}
        </span>
      </span>
      {(label || caption) && (
        <span className={cn("absolute top-1/2 -translate-y-1/2 whitespace-nowrap", labelSide(p.x))}>
          <span className="block rounded bg-white/90 px-1.5 py-0.5 leading-tight shadow-[0_1px_2px_rgb(16_24_40/0.12)]">
            {label && <span className="block text-[0.6875rem] font-semibold text-navy-900 sm:text-xs">{label}</span>}
            {caption && <span className="block text-[0.625rem] font-medium text-muted sm:text-[0.6875rem]">{caption}</span>}
          </span>
        </span>
      )}
    </div>
  );
}
