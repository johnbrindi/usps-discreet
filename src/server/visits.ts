import "server-only";

/** Short "iPhone · Safari" style description of a browser, for staff notifications. */
export function describeDevice(ua: string | null | undefined) {
  if (!ua) return null;
  const device = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? /Mobile/.test(ua) ? "Android phone" : "Android tablet"
        : /Macintosh/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows PC"
            : /Linux/.test(ua)
              ? "Linux PC"
              : null;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /SamsungBrowser/.test(ua)
        ? "Samsung Internet"
        : /CriOS|Chrome\//.test(ua)
          ? "Chrome"
          : /FxiOS|Firefox\//.test(ua)
            ? "Firefox"
            : /Safari\//.test(ua)
              ? "Safari"
              : null;
  return [device, browser].filter(Boolean).join(" · ") || null;
}

/** "Lagos, LA, NG" from whichever parts are known. */
export function describePlace(v: { city?: string | null; region?: string | null; country?: string | null }) {
  return [v.city, v.region, v.country].filter(Boolean).join(", ") || null;
}

/** "3m 12s" / "45s" / "1h 5m". */
export function describeDuration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|monitor/i;

/** A visit counts as online if it has pinged this recently (the page sends a heartbeat every minute). */
export const ONLINE_WINDOW_MS = 2.5 * 60_000;

export function isOnline(v: { leftAt: Date | null; lastSeenAt: Date }, now = Date.now()) {
  return !v.leftAt && now - v.lastSeenAt.getTime() < ONLINE_WINDOW_MS;
}
