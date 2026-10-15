"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const EDITABLE = "input, textarea, select, [contenteditable='true']";

/**
 * Re-fetches the current route's server data on an interval so lists, counts and timelines stay
 * current without a manual reload. Skips a tick while the tab is hidden, while a form field has
 * focus, or while any form on the page has unsaved input — so it never clobbers what someone is typing.
 */
export function LiveRefresh({
  intervalMs = 10_000,
  showIndicator = false,
  className,
}: {
  intervalMs?: number;
  showIndicator?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    let dirty = false;
    const onInput = (e: Event) => {
      if ((e.target as Element | null)?.closest("form")) dirty = true;
    };
    const onSubmit = () => {
      dirty = false;
    };

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      if (dirty || document.activeElement?.matches(EDITABLE)) return;
      router.refresh();
      setLastSync(new Date());
    };
    const onVisible = () => document.visibilityState === "visible" && tick();

    document.addEventListener("input", onInput, true);
    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(tick, intervalMs);
    return () => {
      clearInterval(timer);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, intervalMs]);

  if (!showIndicator) return null;
  return (
    <p className={cn("flex items-center gap-2 text-xs", className)}>
      <span aria-hidden className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-whatsapp opacity-60 motion-reduce:hidden" />
        <span className="relative inline-flex size-2 rounded-full bg-whatsapp" />
      </span>
      <span>
        Live
        {lastSync && (
          <span className="tabular-nums" suppressHydrationWarning>
            {" · synced "}
            {lastSync.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}
          </span>
        )}
      </span>
    </p>
  );
}
