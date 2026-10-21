"use client";

import { Copy, Download, EllipsisVertical, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/layout/logo";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
/** manual: the browser won't offer a one-tap install here, so show the menu steps instead. */
type Mode = "hidden" | "native" | "ios" | "manual";

const DISMISS_DAYS = 14;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}
function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
const ADMIN_APP_KEY = "admin-app";

/**
 * Whether this window is the installed admin app. The customer app's scope ("/") also covers /admin,
 * so "standalone" alone can't tell them apart; the admin app launches with ?source=admin-app.
 */
function isAdminApp() {
  try {
    if (new URLSearchParams(location.search).get("source") === "admin-app") sessionStorage.setItem(ADMIN_APP_KEY, "1");
    return isStandalone() && sessionStorage.getItem(ADMIN_APP_KEY) === "1";
  } catch {
    return isStandalone();
  }
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
  const [showManualSteps, setShowManualSteps] = useState(false);
  /** Open inside the installed customer app, which has no browser menu to install from. */
  const [inOtherApp, setInOtherApp] = useState(false);

  useEffect(() => {
    const banner = variant === "banner";
    if (banner ? isStandalone() : isAdminApp()) return;
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
    // Admin: always offer the button. Until (unless) the browser offers its install dialog, it shows the steps.
    const m =
      !banner && !isIos()
        ? setTimeout(() => {
            setInOtherApp(isStandalone());
            setMode((current) => (current === "hidden" ? "manual" : current));
          }, 0)
        : undefined;
    if (!banner && isIos()) setTimeout(() => setInOtherApp(isStandalone()), 0);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(t);
      clearTimeout(m);
    };
  }, [variant, storageKey]);

  async function install() {
    if (mode === "ios") return setShowIosSteps(true);
    if (mode === "manual") return setShowManualSteps(true);
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

      {showManualSteps && <ManualSteps appName={appName} inOtherApp={inOtherApp} onClose={() => setShowManualSteps(false)} />}

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
              {inOtherApp && <InAppNote browser="Safari" />}
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

function appUrl() {
  return typeof location === "undefined" ? "/admin" : `${location.host}/admin`;
}

function CopyLink() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard
          ?.writeText(`${location.origin}/admin`)
          .then(() => setCopied(true))
          .catch(() => {})
      }
      className="mt-1.5 flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 py-1 text-xs font-semibold text-navy-900 hover:bg-surface"
    >
      <Copy className="size-3.5" aria-hidden /> {copied ? "Link copied" : "Copy link"}
    </button>
  );
}

/** The customer app is open, and it has no browser menu: staff must open the admin site in the browser. */
function InAppNote({ browser }: { browser: string }) {
  return (
    <li className="rounded-lg bg-amber-50 p-3 leading-6 text-amber-900">
      You&apos;re inside the customer app. First open <strong>{appUrl()}</strong> in <strong>{browser}</strong>, then:
      <CopyLink />
    </li>
  );
}

function ManualSteps({ appName, inOtherApp, onClose }: { appName: string; inOtherApp: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-navy-950/50 p-4 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-install-title"
        className="fade-up w-full max-w-sm rounded-2xl bg-white p-5 shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <LogoMark className="size-11" />
            <h2 id="manual-install-title" className="font-semibold text-navy-900">
              Install {appName}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted hover:bg-surface">
            <X className="size-5" aria-hidden />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <ol className="mt-5 space-y-4 text-sm text-ink">
          {inOtherApp && <InAppNote browser="Chrome" />}
          <Step n={1}>
            Tap the <strong>menu</strong> <EllipsisVertical className="inline size-4 align-text-bottom text-navy-700" aria-label="three dots" /> at the
            top right of Chrome.
          </Step>
          <Step n={2}>
            Tap <strong>Add to Home screen</strong> (or <strong>Install app</strong>).
          </Step>
          <Step n={3}>
            Choose <strong>Install</strong>. {appName} gets its own icon, separate from the customer app.
          </Step>
        </ol>
        <button type="button" onClick={onClose} className="mt-5 w-full rounded-md border border-line-strong py-2 text-sm font-semibold text-navy-900 hover:bg-surface">
          Got it
        </button>
      </div>
    </div>
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
