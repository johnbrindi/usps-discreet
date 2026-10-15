import { supportHours } from "@/config/site";

type Hours = { timeZone: string; days: readonly number[]; openHour: number; closeHour: number };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Whether `now` falls inside staffed hours in the configured time zone. */
export function isWithinSupportHours(now: Date = new Date(), hours: Hours = supportHours) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: hours.timeZone,
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const day = WEEKDAYS.indexOf(parts.find((p) => p.type === "weekday")?.value ?? "");
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  return hours.days.includes(day) && hour >= hours.openHour && hour < hours.closeHour;
}

export function describeSupportHours(hours: Hours = supportHours) {
  const fmt = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? " am" : " pm"}`;
  const zone =
    new Intl.DateTimeFormat("en-US", { timeZone: hours.timeZone, timeZoneName: "short" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value ?? hours.timeZone;
  const days =
    hours.days.length === 5 && hours.days.every((d, i) => d === i + 1)
      ? "Mon–Fri"
      : hours.days.map((d) => WEEKDAYS[d]).join(", ");
  return `${days}, ${fmt(hours.openHour)}–${fmt(hours.closeHour)} ${zone}`;
}
