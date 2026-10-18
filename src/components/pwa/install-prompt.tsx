"use client";

import { Download, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/layout/logo";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type Mode = "hidden" | "native" | "ios";

const DISMISS_DAYS = 14;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}
function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
function dismissedRecently(key: string) {
  try {
    const at = Number(localStorage.getItem(key));
    return at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}
function rememberDismissed(key: string) {
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {
    /* storage unavailable — the prompt simply shows again next visit */
  }
}

/**
 * "Install the app" offer. Android/desktop Chrome and Edge get the browser's own install dialog; iPhone
 * and iPad (where sites can't trigger installation) get the Share → Add to Home Screen steps.
 * Hidden once installed, and for two weeks after being dismissed.
 *
 * - banner: floating card at the bottom of public pages.
 * - inline: compact button for the admin sidebar.
 */
export function InstallPrompt({ appName, variant = "banner" }: { appName: string; variant?: "banner" | "inline" }) {
  const storageKey = `install-dismissed:${variant}`;
  const [mode, setMode] = useState<Mode>("hidden");
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [showIosSteps, setShowIosSteps] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const banner = variant === "banner";
    if (banner && dismissedRecently(storageKey)) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallEvent);
      setMode("native");
    };
    const onInstalled = () => setMode("hidden");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    // Give the page a moment before offering anything.
    const t = isIos() ? setTimeout(() => setMode("ios"), banner ? 2500 : 0) : undefined;
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(t);
    };
  }, [variant, storageKey]);

  async function install() {
    if (mode === "ios") return setShowIosSteps(true);
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") setMode("hidden");
  }

  function dismiss() {
    rememberDismissed(storageKey);
    setMode("hidden");
    setShowIosSteps(false);
  }

  if (mode === "hidden") return null;

  return (
    <>
      {variant === "inline" ? (
        <button
          type="button"
          onClick={install}
          className="flex w-full items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
        >
          <Download className="size-4" aria-hidden /> Install admin app
        </button>
      ) : (
        <div
          role="region"
          aria-label="Install app"
          className="fade-up fixed bottom-[var(--fab-bottom)] left-4 z-[55] flex max-w-sm items-center gap-2.5 rounded-xl border border-line bg-white p-2.5 shadow-float"
          style={{ right: "calc(var(--fab-right) + var(--fab-size) + 0.75rem)" }}
        >
          <LogoMark className="size-9 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-5 font-semibold text-navy-900">Get the {appName} app</p>
            <p className="text-xs leading-4 text-muted">Track from your home screen</p>
          </div>
          <button
            type="button"
            onClick={install}
            className="shrink-0 rounded-md bg-navy-700 px-3 py-2 text-sm font-semibold text-white hover:bg-navy-800"
          >
            Install
          </button>
          <button type="button" onClick={dismiss} className="shrink-0 rounded-md p-1 text-muted hover:bg-surface hover:text-ink">
            <X className="size-4" aria-hidden />
            <span className="sr-only">Not now</span>
          </button>
        </div>
      )}

      {showIosSteps && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-navy-950/50 p-4 sm:items-center" onClick={() => setShowIosSteps(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            className="fade-up w-full max-w-sm rounded-2xl bg-white p-5 shadow-float"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <LogoMark className="size-11" />
                <h2 id="ios-install-title" className="font-semibold text-navy-900">
                  Add {appName} to your Home Screen
                </h2>
              </div>
              <button type="button" onClick={() => setShowIosSteps(false)} className="rounded-md p-1 text-muted hover:bg-surface">
                <X className="size-5" aria-hidden />
                <span className="sr-only">Close</span>
              </button>
            </div>
            <ol className="mt-5 space-y-4 text-sm text-ink">
              <Step n={1}>
                Tap the <strong>Share</strong> button <Share className="inline size-4 align-text-bottom text-navy-700" aria-label="Share icon" /> in
                Safari&apos;s toolbar.
              </Step>
              <Step n={2}>
                Scroll down and tap <strong>Add to Home Screen</strong>{" "}
                <SquarePlus className="inline size-4 align-text-bottom text-navy-700" aria-label="Add icon" />.
              </Step>
              <Step n={3}>
                Tap <strong>Add</strong>. The app opens from your Home Screen like any other.
              </Step>
            </ol>
            <button type="button" onClick={dismiss} className="mt-5 w-full rounded-md border border-line-strong py-2 text-sm font-semibold text-navy-900 hover:bg-surface">
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-navy-50 text-xs font-bold text-navy-800">{n}</span>
      <span className="leading-6">{children}</span>
    </li>
  );
}
