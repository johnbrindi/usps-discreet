"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNav } from "@/config/site";
import { cn } from "@/lib/utils";

export function NavLinks() {
  const pathname = usePathname();
  return (
    <ul className="flex items-center gap-1">
      {mainNav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex h-16 items-center px-3 text-[0.9375rem] font-semibold transition-colors",
                "after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t",
                active
                  ? "text-navy-900 after:bg-amber-500"
                  : "text-navy-800/80 after:bg-transparent hover:text-navy-900 hover:after:bg-line-strong",
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
