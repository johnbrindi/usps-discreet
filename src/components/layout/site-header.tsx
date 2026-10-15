import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Container } from "@/components/ui/card";
import { MobileNav } from "./mobile-nav";
import { DesktopNav } from "./desktop-nav";
import { HeaderSearch } from "./header-search";

/**
 * USPS-style site header:
 * 1. White bar — mobile-hamburger | USPS eagle logo (centred on mobile) | search icon
 * 2. Red 3 px accent border at bottom of the white bar
 * 3. Dark-navy (#003875) desktop nav strip — hidden on mobile
 * 4. Full-width search bar below the nav strip
 */
export function SiteHeader() {
  return (
    <header
      className="sticky top-0 bg-white"
      style={{ zIndex: "var(--z-header)", borderBottom: "3px solid #cc0000" }}
    >
      {/* ── Top bar: logo + mobile hamburger + search icon ── */}
      <div className="relative flex h-14 items-center justify-between bg-white px-3 sm:h-16 sm:px-5">
        {/* Mobile hamburger (left) */}
        <div className="flex items-center md:hidden">
          <MobileNav />
        </div>

        {/* Logo — centred on mobile, left-aligned on desktop */}
        <Link
          href="/"
          aria-label={`${siteConfig.name} — Home`}
          className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0 md:left-auto"
        >
          {/* Mobile logo (eagle only SVG) */}
          <Image
            src="/images/logo_mobile.svg"
            alt={siteConfig.name}
            width={44}
            height={44}
            className="block md:hidden"
            priority
          />
          {/* Desktop full USPS logo */}
          <Image
            src="/images/logo-sb.svg"
            alt={siteConfig.name}
            width={180}
            height={36}
            className="hidden md:block"
            priority
          />
        </Link>

        {/* Desktop right-side nav (track button) */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/track"
            className="inline-flex h-9 items-center gap-1.5 rounded bg-usps-blue px-4 text-sm font-semibold text-white hover:bg-usps-blue-dark transition-colors"
          >
            Track a Package
          </Link>
        </div>

        {/* Mobile: Search icon (right) */}
        <Link
          href="/track"
          aria-label="Search / Track a package"
          className="inline-flex size-10 items-center justify-center text-usps-blue md:hidden"
        >
          <Image src="/images/search.svg" alt="" width={22} height={22} aria-hidden />
        </Link>
      </div>

      {/* ── Desktop blue nav strip ── */}
      <nav
        aria-label="Main"
        className="hidden md:block"
        style={{ background: "#003875" }}
      >
        <Container className="px-4">
          <DesktopNav />
        </Container>
      </nav>

      {/* ── Full-width search bar (below nav on desktop, below logo on mobile) ── */}
      <div className="border-t border-line bg-white px-3 py-2 sm:px-5 md:px-0">
        <Container className="md:px-4">
          <HeaderSearch />
        </Container>
      </div>
    </header>
  );
}
