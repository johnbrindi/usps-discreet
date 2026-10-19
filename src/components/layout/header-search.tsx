"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useId, useTransition, useState } from "react";
import { isValidTrackingNumber, normalizeTrackingNumber, splitTrackingNumbers } from "@/domain/tracking-number";

/**
 * Full-width USPS-style search bar.
 * - If input looks like a tracking number → /track/[n]
 * - Multiple tracking numbers (comma/space separated) → /track/[first]
 * - Otherwise → /search?q=[query]
 * Falls back to a form GET so it works without JS.
 */
export function HeaderSearch() {
  const inputId = useId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = value.trim();
    if (!raw) return;

    const numbers = splitTrackingNumbers(raw, 10);
    if (numbers.length === 1 && isValidTrackingNumber(numbers[0]!)) {
      startTransition(() => router.push(`/track/${encodeURIComponent(normalizeTrackingNumber(raw))}`));
    } else if (numbers.length > 1 && numbers.every((n) => isValidTrackingNumber(n))) {
      // Multiple numbers: go to first; the track page can handle one at a time
      startTransition(() => router.push(`/track/${encodeURIComponent(numbers[0]!)}`));
    } else {
      startTransition(() => router.push(`/search?q=${encodeURIComponent(raw)}`));
    }
  }

  return (
    <form
      action="/search"
      method="get"
      role="search"
      aria-label="Search or enter a tracking number"
      onSubmit={handleSubmit}
      className="flex w-full items-stretch"
    >
      <label htmlFor={inputId} className="sr-only">
        Search or enter tracking number(s)
      </label>
      <input
        id={inputId}
        name="q"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search or enter tracking number(s)"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        disabled={pending}
        className="h-10 min-w-0 flex-1 rounded-l border border-line-strong bg-white px-3 text-sm text-ink placeholder:text-muted/70 focus:border-usps-blue focus:outline-none focus:ring-2 focus:ring-usps-blue/20 disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={pending}
        aria-label="Search"
        className="inline-flex h-10 items-center gap-1.5 rounded-r border border-l-0 border-line-strong bg-white px-3 transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-usps-blue disabled:opacity-60"
      >
        {/* Use the USPS search icon from public/images */}
        <Image
          src="/images/search.svg"
          alt=""
          width={18}
          height={18}
          aria-hidden
          className="size-[1.125rem]"
        />
        <span className="sr-only">Search</span>
      </button>
    </form>
  );
}
