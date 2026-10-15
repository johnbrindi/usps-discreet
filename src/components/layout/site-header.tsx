import { PackageSearch } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/card";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";

export function SiteHeader() {
  return (
    <header className="sticky top-0 border-b border-line bg-white/95 backdrop-blur" style={{ zIndex: "var(--z-header)" }}>
      <Container className="relative flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Main" className="hidden md:block">
          <NavLinks />
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden sm:block">
            <ButtonLink href="/track" size="sm">
              <PackageSearch className="size-4" aria-hidden />
              Track a parcel
            </ButtonLink>
          </span>
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
