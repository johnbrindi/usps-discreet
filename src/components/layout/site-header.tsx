import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Container } from "@/components/ui/card";
import { MobileNav } from "./mobile-nav";
import { DesktopNav } from "./desktop-nav";
import { HeaderSearch } from "./header-search";

/**
 * USPS-faithful header structure (matches reference screenshots):
 *
 *  ┌─────────────────────────────────────────────────────────────────┐
 *  │ UTILITY BAR (desktop)  English | Locations | Support | Informed │
 *  ├─────────────────────────────────────────────────────────────────┤
 *  │ TOP BAR   🍔(mobile)  USPS.COM logo   [search icon](mobile)    │
 *  │           ══════ RED 3px BOTTOM BORDER ══════                   │
 *  ├─────────────────────────────────────────────────────────────────┤
 *  │ NAV STRIP (desktop)  Quick Tools | Send | Receive | Shop | …    │
 *  ├─────────────────────────────────────────────────────────────────┤
 *  │ SEARCH BAR  [Search USPS.com or Enter Tracking Number(s)]  [🔍] │
 *  └─────────────────────────────────────────────────────────────────┘
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 bg-white" style={{ zIndex: "var(--z-header)" }}>

      {/* ── Utility bar — desktop only ── */}
      <div className="hidden border-b border-line bg-white md:block">
        <Container className="flex items-center justify-end gap-1 px-4 py-1 text-xs text-muted">
          <button type="button" className="inline-flex items-center gap-1 px-2 py-1 hover:underline">
            <Image src="/images/utility_languages.png" alt="" width={16} height={16} aria-hidden />
            English
          </button>
          <span aria-hidden className="text-line-strong">|</span>
          <Link href="/help" className="px-2 py-1 hover:underline">Locations</Link>
          <span aria-hidden className="text-line-strong">|</span>
          <Link href="/contact" className="inline-flex items-center gap-1 px-2 py-1 hover:underline">
            <Image src="/images/utility_customer_service.png" alt="" width={16} height={16} aria-hidden />
            Support
          </Link>
          <span aria-hidden className="text-line-strong">|</span>
          <Link href="/help" className="px-2 py-1 hover:underline">Informed Delivery</Link>
        </Container>
      </div>

      {/* ── Top white bar with red accent border ── */}
      <div
        className="relative flex h-14 items-center justify-between bg-white px-3 sm:px-5"
        style={{ borderBottom: "3px solid #cc0000" }}
      >
        {/* Mobile: hamburger (left) */}
        <div className="md:hidden">
          <MobileNav />
        </div>

        {/* Logo — centred on mobile, left-aligned on desktop */}
        <div className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0">
          {/* Mobile: eagle mark only (square SVG) */}
          <Link href="/" aria-label={`${siteConfig.name} — Home`} className="block md:hidden">
            <Image
              src="/images/logo_mobile.svg"
              alt={siteConfig.name}
              width={44}
              height={44}
              className="h-10 w-auto"
              priority
            />
          </Link>
          {/* Desktop: full USPS.COM logo with eagle + wordmark */}
          <Link href="/" aria-label={`${siteConfig.name} — Home`} className="hidden md:block">
            <Image
              src="/images/logo-sb.svg"
              alt={siteConfig.name}
              width={180}
              height={36}
              className="h-9 w-auto"
              priority
            />
          </Link>
        </div>

        {/* Mobile right: search icon linking to /track */}
        <Link
          href="/track"
          aria-label="Track a package"
          className="inline-flex size-10 items-center justify-center md:hidden"
        >
          <Image src="/images/search.svg" alt="" width={22} height={22} aria-hidden />
        </Link>

        {/* Desktop right: empty spacer so logo stays left */}
        <div className="hidden md:block w-[180px]" aria-hidden />
      </div>

      {/* ── Desktop blue nav strip ── */}
      <nav
        aria-label="Main navigation"
        className="hidden md:block"
        style={{ background: "#003875" }}
      >
        <Container className="px-4">
          <DesktopNav />
        </Container>
      </nav>

      {/* ── Full-width tracking / search bar (all breakpoints) ── */}
      <div className="border-b border-line bg-white">
        <Container className="px-3 py-2 sm:px-5">
          <HeaderSearch />
        </Container>
      </div>
    </header>
  );
}
