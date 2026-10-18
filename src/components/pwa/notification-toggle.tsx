"use client";

import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { removePushSubscription, savePushSubscription, sendTestNotification } from "@/server/actions/push";

type State = "loading" | "unsupported" | "install-first" | "denied" | "off" | "on";

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

async function currentSubscription() {
  const reg = await navigator.serviceWorker.getRegistration("/");
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/**
 * Turns push notifications on or off for this device (admin sidebar). On iPhone, web push only works
 * in the installed app, so it asks to install first.
 */
export function NotificationToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && VAPID_KEY;
      let next: State;
      if (!supported) next = isIos() && !isStandalone() ? "install-first" : "unsupported";
      else if (Notification.permission === "denied") next = "denied";
      else next = (await currentSubscription().catch(() => null)) ? "on" : "off";
      if (!cancelled) setState(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function turnOn() {
    setBusy(true);
    setNote(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      // The service worker only registers in production builds (see service-worker.tsx).
      const reg = (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_KEY) }));
      const { ok } = await savePushSubscription(sub.toJSON(), navigator.userAgent);
      if (!ok) throw new Error("save failed");
      setState("on");
      await sendTestNotification();
      setNote("Sent a test notification.");
    } catch {
      setNote("Couldn't turn on notifications. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setNote(null);
    try {
      const sub = await currentSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  const base = "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold";
  return (
    <div className="space-y-1">
      {state === "off" && (
        <button type="button" onClick={turnOn} disabled={busy} className={`${base} bg-amber-500 text-navy-950 hover:bg-amber-600 disabled:opacity-70`}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Bell className="size-4" aria-hidden />}
          Turn on notifications
        </button>
      )}
      {state === "on" && (
        <div className="flex items-center gap-1">
          <span className={`${base} flex-1 bg-white/10 text-white`}>
            <BellRing className="size-4 text-amber-500" aria-hidden /> Notifications on
          </span>
          <button
            type="button"
            onClick={async () => {
              setNote(null);
              await sendTestNotification();
              setNote("Sent a test notification.");
            }}
            className="rounded-md px-2 py-2 text-xs font-semibold text-navy-100/80 hover:bg-white/10 hover:text-white"
          >
            Test
          </button>
          <button
            type="button"
            onClick={turnOff}
            disabled={busy}
            className="rounded-md p-2 text-navy-100/70 hover:bg-white/10 hover:text-white"
          >
            <BellOff className="size-4" aria-hidden />
            <span className="sr-only">Turn off notifications</span>
          </button>
        </div>
      )}
      {state === "denied" && (
        <p className="px-2 text-xs leading-5 text-navy-100/70">
          Notifications are blocked. Allow them for this site in your browser or phone settings, then reload.
        </p>
      )}
      {state === "install-first" && (
        <p className="px-2 text-xs leading-5 text-navy-100/70">
          To get notifications on iPhone, install the admin app first: Share → Add to Home Screen, then open it from there.
        </p>
      )}
      {note && (
        <p className="px-2 text-xs text-navy-100/70" aria-live="polite">
          {note}
        </p>
      )}
    </div>
  );
}
