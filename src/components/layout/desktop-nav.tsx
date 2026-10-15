"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/track", label: "Track" },
  { href: "/tools", label: "Quick Tools" },
  { href: "/help", label: "Help" },
  { href: "/contact", label: "Contact" },
] as const;

/**
 * Desktop navy nav strip — matches the header's navy accent bar.
 * Active item shows a white bottom underline indicator.
 */
export function DesktopNav() {
  const pathname = usePathname();

  return (
    <ul className="flex items-center" role="list">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={`${item.href}-${item.label}`}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex h-11 items-center px-4 text-sm font-semibold text-white transition-colors",
                "hover:bg-usps-blue-light focus-visible:bg-usps-blue-light",
                active && "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-white",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
