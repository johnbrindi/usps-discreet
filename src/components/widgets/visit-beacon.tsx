"use client";

import { useEffect } from "react";

const STORAGE_KEY = "visit_id";
/** Keep in step with ONLINE_WINDOW_MS in src/server/visits.ts. */
const HEARTBEAT_MS = 60_000;
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
 * Tells the server when a visitor arrives on the public site and when they leave (tab closed, navigated
 * away, or the page hidden — the only signal phones reliably give), so staff get a push alert.
 * Renders nothing.
 */
export function VisitBeacon() {
  useEffect(() => {
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

    let away = document.visibilityState === "hidden";
    if (!away) send("enter");
    const leave = () => {
      if (away) return;
      away = true;
      send("leave");
    };
    const back = () => {
      if (!away) return;
      away = false;
      send("enter");
    };
    const onVisibility = () => (document.visibilityState === "hidden" ? leave() : back());
    // Restored from the back/forward cache.
    const onPageShow = (e: PageTransitionEvent) => e.persisted && back();

    // Heartbeat so staff can see who is on the site right now.
    const heartbeat = setInterval(() => !away && send("enter"), HEARTBEAT_MS);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);
  return null;
}
