"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js in production. In development an old registration is removed (so cached
 * files never hide code changes) unless it holds a push subscription.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      // Keep a registration that carries push notifications (turned on from the admin sidebar).
      navigator.serviceWorker.getRegistrations().then((regs) =>
        regs.forEach(async (r) => {
          if (!(await r.pushManager?.getSubscription().catch(() => null))) r.unregister();
        }),
      );
      return;
    }
    const register = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
