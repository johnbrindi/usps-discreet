import type { Metadata } from "next";
import { LogoMark } from "@/components/layout/logo";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Offline", robots: { index: false, follow: false } };
export const dynamic = "force-static";

/** Shown by the service worker (public/sw.js) when a page can't load without a connection. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <LogoMark className="size-14" />
      <h1 className="mt-6 text-2xl font-bold text-navy-900">You&apos;re offline</h1>
      <p className="mt-2 max-w-sm leading-7 text-muted">
        {siteConfig.name} needs a connection to show live tracking. Check your signal or Wi-Fi, then try again.
      </p>
      {/* A plain link reloads through the network, unlike client-side navigation. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="mt-6 inline-flex h-11 items-center rounded-md bg-navy-700 px-5 font-semibold text-white hover:bg-navy-800">
        Try again
      </a>
    </main>
  );
}
