/** "Today", "Yesterday" or a date, for separators between days in a conversation. */
export function dayLabel(iso: string, now = new Date()) {
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString([], { weekday: days < 7 ? "long" : undefined, day: "numeric", month: "short", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
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
