"use client";

import { useEffect } from "react";

const STORAGE_KEY = "visit_id";
/** Keep in step with ONLINE_WINDOW_MS in src/server/visits.ts. */
const HEARTBEAT_MS = 60_000;
/**
 * A visit only counts once the person interacts with the page or keeps it open this long. Uptime
 * monitors and link scanners run real browsers, load the page and close it within a second or two,
 * so without this every one of their checks would alert staff.
 */
const ENGAGED_AFTER_MS = 10_000;
const INTERACTIONS = ["pointerdown", "pointermove", "touchstart", "scroll", "keydown", "wheel"] as const;

let memoryId: string | undefined;

/** One id per tab session, so a reload or moving between pages is the same visit. */
function visitId() {
  try {
    let id = sessionStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return (memoryId ??= crypto.randomUUID());
  }
}

/**
 * Tells the server when a real visitor arrives on the public site and when they leave (tab closed,
 * navigated away, or the page hidden — the only signal phones reliably give), so staff get a push
 * alert. Automated browsers and visits that bounce without any interaction are never reported.
 * Renders nothing.
 */
export function VisitBeacon() {
  useEffect(() => {
    // Set by browsers under automation (Puppeteer, Playwright, Selenium, most monitoring services).
    if (navigator.webdriver) return;

    const send = (event: "enter" | "leave") => {
      const body = JSON.stringify({
        id: visitId(),
        event,
        path: location.pathname.slice(0, 300),
        referrer: event === "enter" ? document.referrer.slice(0, 300) || undefined : undefined,
      });
      // sendBeacon survives the page closing; text/plain keeps it a simple same-origin request.
      if (event === "leave" && navigator.sendBeacon?.("/api/presence", new Blob([body], { type: "text/plain" }))) return;
      fetch("/api/presence", { method: "POST", body, keepalive: true, headers: { "content-type": "text/plain" } }).catch(() => {});
    };

    let engaged = false;
    let away = document.visibilityState === "hidden";
    let heartbeat: ReturnType<typeof setInterval> | undefined;

    const stopWatching = () => {
      clearTimeout(timer);
      INTERACTIONS.forEach((t) => window.removeEventListener(t, engage));
    };
    function engage() {
      if (engaged || away) return;
      engaged = true;
      stopWatching();
      send("enter");
      // Heartbeat so staff can see who is on the site right now.
      heartbeat = setInterval(() => !away && send("enter"), HEARTBEAT_MS);
    }
    // The clock only runs while the page is in view.
    let timer = away ? undefined : setTimeout(engage, ENGAGED_AFTER_MS);
    INTERACTIONS.forEach((t) => window.addEventListener(t, engage, { passive: true }));

    const leave = () => {
      if (away) return;
      away = true;
      clearTimeout(timer);
      if (engaged) send("leave");
    };
    const back = () => {
      if (!away) return;
      away = false;
      if (engaged) send("enter");
      else timer = setTimeout(engage, ENGAGED_AFTER_MS);
    };
    const onVisibility = () => (document.visibilityState === "hidden" ? leave() : back());
    // Restored from the back/forward cache.
    const onPageShow = (e: PageTransitionEvent) => e.persisted && back();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      stopWatching();
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);
  return null;
}
