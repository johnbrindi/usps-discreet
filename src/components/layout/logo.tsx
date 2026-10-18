import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/** Eagle mark (public/images/logo_mobile.svg). Decorative — the wordmark carries the name. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/images/logo_mobile.svg"
      alt=""
      width={54}
      height={28}
      aria-hidden
      priority
      className={cn("h-7 w-auto", className)}
    />
  );
}

/** Eagle mark + "usps-discreet" wordmark. */
export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <Link
      href="/"
      aria-label={`${siteConfig.name} — Home`}
      className={cn("inline-flex items-center gap-2 rounded-sm", className)}
    >
      <LogoMark className={cn(inverted && "brightness-0 invert")} />
      <span
        className={cn(
          "text-lg leading-none font-extrabold tracking-tight",
          inverted ? "text-white" : "text-usps-blue",
        )}
      >
        {siteConfig.name}
      </span>
    </Link>
  );
}
