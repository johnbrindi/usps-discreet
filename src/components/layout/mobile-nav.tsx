"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { mainNav } from "@/config/site";
import { cn } from "@/lib/utils";

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

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-11 items-center justify-center rounded-md text-navy-900 hover:bg-navy-50"
      >
        {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
      </button>
      <nav
        id={id}
        aria-label="Mobile"
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-line bg-white shadow-card"
      >
        <ul className="divide-y divide-line px-4">
          {mainNav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={pathname.startsWith(item.href) ? "page" : undefined}
                className={cn(
                  "block py-4 text-base font-semibold",
                  pathname.startsWith(item.href) ? "text-navy-600" : "text-navy-900",
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
