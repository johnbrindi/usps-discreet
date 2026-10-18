import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/** Placeholder mark (hexagonal box). The operator can swap this for their own logo asset. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/images/logo_mobile.svg"
      alt=""
      width={44}
      height={44}
      aria-hidden
      className={className}
    />
  );
}

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 rounded-sm", className)}>
      {/* Use the full USPS.COM eagle logo on desktop, mobile-only mark otherwise */}
      <Image
        src="/images/logo-sb.svg"
        alt={siteConfig.name}
        width={160}
        height={32}
        className={cn("h-8 w-auto", inverted && "brightness-0 invert")}
        priority
      />
    </Link>
  );
}
