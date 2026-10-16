"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useTransition, useState } from "react";
import { siteConfig } from "@/config/site";

/**
 * Full-width search bar that acts as a tracking-number entry.
 * On submit it navigates to /track/[number] (with JS) or /track?trackingNumber= (no-JS).
 */
export function HeaderSearch() {
  const inputId = useId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tn = value.trim().replace(/[\s-]+/g, "");
    if (!tn) return;
    startTransition(() => router.push(`/track/${encodeURIComponent(tn)}`));
  }

  return (
    <form
      action="/track"
      method="get"
      role="search"
      aria-label={`Search ${siteConfig.name} or track a parcel`}
      onSubmit={handleSubmit}
      className="flex items-stretch w-full"
    >
      {/*
        Deliberately not "Tracking number": the page hero/‌/track also render
        TrackingForm, whose input's label IS exactly "Tracking number". A fuzzy
        getByLabel("Tracking number") query must resolve to that one field only.
      */}
      <label htmlFor={inputId} className="sr-only">
        Quick parcel search
      </label>
      <input
        id={inputId}
        name="trackingNumber"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter Tracking Number(s)"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        disabled={pending}
        className="
          flex-1 min-w-0 h-10 px-3 text-sm text-ink
          border border-line-strong rounded-l
          focus:border-usps-blue focus:ring-2 focus:ring-usps-blue/20 focus:outline-none
          placeholder:text-muted/70
          disabled:opacity-60
          bg-white
        "
      />
      <button
        type="submit"
        disabled={pending}
        aria-label="Search"
        className="
          inline-flex items-center justify-center gap-2 h-10 px-3
          border border-l-0 border-line-strong rounded-r
          bg-white hover:bg-surface transition-colors
          disabled:opacity-60
          focus-visible:outline-2 focus-visible:outline-usps-blue focus-visible:outline-offset-1
        "
      >
        <Search className="size-[1.125rem] text-navy-700" aria-hidden />
        <span className="sr-only">Search</span>
      </button>
    </form>
  );
}
