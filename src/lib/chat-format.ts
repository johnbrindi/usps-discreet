import { supportHours } from "@/config/site";

/** Chat times are shown in the support team's US time zone, so customers and staff see the same clock. */
const CHAT_TIME_ZONE = supportHours.timeZone;

const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: CHAT_TIME_ZONE }).format(d); // YYYY-MM-DD

/** e.g. "3:42 PM EDT". */
export function chatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: CHAT_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/** e.g. "Oct 20, 2026, 3:42 PM EDT". */
export function chatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: CHAT_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/** "Today", "Yesterday" or a date, for separators between days in a conversation. */
export function dayLabel(iso: string, now = new Date()) {
  const d = new Date(iso);
  const days = Math.round((Date.parse(dayKey(now)) - Date.parse(dayKey(d))) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    timeZone: CHAT_TIME_ZONE,
    weekday: days < 7 ? "long" : undefined,
    day: "numeric",
    month: "short",
    year: dayKey(d).slice(0, 4) === dayKey(now).slice(0, 4) ? undefined : "numeric",
  });
}

/** Whether a message starts a new run: a new day, a different sender, or a gap of over five minutes. */
export function startsRun(m: { sender: string; createdAt: string }, prev?: { sender: string; createdAt: string }) {
  if (!prev) return true;
  return (
    prev.sender !== m.sender ||
    dayLabel(prev.createdAt) !== dayLabel(m.createdAt) ||
    Date.parse(m.createdAt) - Date.parse(prev.createdAt) > 5 * 60_000
  );
}
