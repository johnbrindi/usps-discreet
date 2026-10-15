"use client";

import { Check } from "lucide-react";
import { useState, type ReactNode } from "react";

export function CopyButton({ value, label, icon }: { value: string; label: string; icon: ReactNode }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard unavailable — no-op */
        }
      }}
      className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-navy-50 hover:text-navy-900"
    >
      {copied ? <Check className="size-4 text-success-700" aria-hidden /> : icon}
      <span className="sr-only">{copied ? "Copied" : label}</span>
    </button>
  );
}
