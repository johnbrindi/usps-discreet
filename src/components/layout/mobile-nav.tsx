"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { href: "/track", label: "Track a Package" },
  { href: "/tools", label: "Quick Tools" },
  { href: "/help", label: "Help" },
  { href: "/contact", label: "Contact Us" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState<string | null>(null);
  const pathname = usePathname();
  const id = useId();

  // Close when the route changes.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Lock body scroll when menu is open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-11 items-center justify-center rounded text-usps-blue hover:bg-navy-50 focus-visible:outline-offset-1"
      >
        {open ? (
          <X className="size-6" aria-hidden />
        ) : (
          <Image src="/images/hamburger.svg" alt="" width={24} height={24} aria-hidden />
        )}
      </button>

      {/* Full-screen overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 md:hidden"
          style={{ zIndex: "calc(var(--z-header) - 1)" }}
          aria-hidden
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in drawer */}
      <nav
        id={id}
        aria-label="Mobile"
        className={cn(
          "fixed top-0 left-0 bottom-0 w-72 bg-white shadow-float overflow-y-auto md:hidden transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ zIndex: "var(--z-header)" }}
        hidden={!open}
      >
        {/* Drawer header */}
        <div
          className="flex h-14 items-center justify-between px-4"
          style={{ background: "#003875" }}
        >
          <span className="text-base font-bold text-white">Menu</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="inline-flex size-10 items-center justify-center rounded text-white hover:bg-white/15"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <ul className="divide-y divide-line">
          {mobileNavItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={pathname.startsWith(item.href) ? "page" : undefined}
                className={cn(
                  "flex items-center px-5 py-4 text-base font-semibold transition-colors",
                  pathname.startsWith(item.href)
                    ? "text-usps-blue bg-navy-50"
                    : "text-ink hover:bg-surface hover:text-usps-blue",
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
