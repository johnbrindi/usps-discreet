import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/card";
import { DesktopNav } from "./desktop-nav";
import { HeaderSearch } from "./header-search";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";

/**
 * Header layout:
 *  - Desktop: utility bar → logo row → blue nav strip → search bar
 *  - Mobile : hamburger | centred logo | search icon → search bar
 */
export function SiteHeader() {
  return (
    <header className="bg-white md:sticky md:top-0" style={{ zIndex: "var(--z-header)" }}>
      {/* Utility bar — desktop only */}
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
          <Link href="/services/informed-delivery" className="px-2 py-1 hover:underline">Informed Delivery</Link>
        </Container>
      </div>

      {/* Logo row */}
      <div className="border-b border-line bg-white">
        <Container className="grid h-14 grid-cols-[2.75rem_1fr_2.75rem] items-center px-2 md:flex md:h-16 md:px-4">
          <div className="md:hidden">
            <MobileNav />
          </div>
          <div className="flex justify-center md:justify-start">
            <Logo />
          </div>
          <Link
            href="/track"
            aria-label="Track a package"
            className="inline-flex size-11 items-center justify-center justify-self-end md:hidden"
          >
            <Image src="/images/search.svg" alt="" width={22} height={22} aria-hidden />
          </Link>
        </Container>
      </div>

      {/* Desktop blue nav strip */}
      <nav aria-label="Main navigation" className="hidden bg-[#003875] md:block">
        <Container className="px-4">
          <DesktopNav />
        </Container>
      </nav>

      {/* Search / tracking bar */}
      <div className="border-b border-line bg-white">
        <Container className="px-3 py-2.5 sm:px-5">
          <HeaderSearch />
        </Container>
      </div>
    </header>
  );
}
