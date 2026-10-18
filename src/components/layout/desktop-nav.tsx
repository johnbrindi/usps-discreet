"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { mainNav } from "@/config/site";

/**
 * Desktop navy nav strip — USPS blue (#003875) background, white text.
 * Exact nav labels come from site config so they stay in sync with any override.
 */
export function DesktopNav() {
  const pathname = usePathname();

  return (
    <ul className="flex items-center" role="list">
      {mainNav.map((item, i) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={`${item.href}-${i}`}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex h-11 items-center px-4 text-sm font-semibold text-white transition-colors",
                "hover:bg-[#1a5294] focus-visible:bg-[#1a5294]",
                active &&
                  "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-white",
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
