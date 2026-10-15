/** Offset (ms) of `timeZone` from UTC at instant `date`. */
function zoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Interpret a wall-clock "YYYY-MM-DDTHH:mm" in `timeZone` (default UTC) as an absolute instant. */
export function zonedLocalToUtc(local: string, timeZone?: string | null) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) return new Date(local);
  const naive = Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!);
  if (!timeZone) return new Date(naive);
  // Two passes handle DST boundaries.
  let utc = naive - zoneOffsetMs(new Date(naive), timeZone);
  utc = naive - zoneOffsetMs(new Date(utc), timeZone);
  return new Date(utc);
}

/** e.g. "Oct 14, 2026" / "3:42 pm CDT". Falls back to UTC when the zone is unknown. */
export function formatEventTime(iso: string, timeZone?: string | null) {
  const date = new Date(iso);
  const tz = timeZone || "UTC";
  return {
    date: new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", year: "numeric" }).format(date),
    time: new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date),
  };
}

export function formatDateOnly(isoDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(isoDate));
}
