import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/** Original placeholder mark (a parcel with a route line). Replace with the operator's authorized logo. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={className}>
      <rect width="40" height="40" rx="8" fill="var(--color-navy-800)" />
      <path d="M20 8.5 31 14v12l-11 5.5L9 26V14z" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="m9 14 11 5.5L31 14M20 19.5v12" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="m14.5 11.3 11 5.5" stroke="var(--color-amber-500)" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5 rounded-sm", className)}>
      <LogoMark className="size-9 shrink-0" />
      <span className={cn("text-lg font-bold tracking-tight", inverted ? "text-white" : "text-navy-900")}>
        {siteConfig.name}
      </span>
    </Link>
  );
}
