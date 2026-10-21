"use client";

import { ClipboardList, Inbox, LayoutDashboard, LogOut, MessagesSquare, Package, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/shipments", label: "Shipments", icon: Package },
  { href: "/admin/requests", label: "Requests", icon: ClipboardList },
  { href: "/admin/messages", label: "Chat", icon: MessagesSquare },
  { href: "/admin/inquiries", label: "Inquiries", icon: Inbox },
  { href: "/admin/visitors", label: "Visitors", icon: Users },
];

export function AdminNav({ variant = "sidebar" }: { variant?: "sidebar" | "tabs" }) {
  const pathname = usePathname();
  const isActive = (item: (typeof items)[number]) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));

  if (variant === "tabs") {
    return (
      <ul className="grid grid-cols-6">
        {items.map((item) => {
          const active = isActive(item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-1 pt-2 pb-1.5 text-[0.6875rem] font-semibold transition-colors",
                  active ? "text-navy-800" : "text-muted hover:text-navy-900",
                )}
              >
                <span className={cn("rounded-full px-3.5 py-1 transition-colors", active && "bg-navy-50")}>
                  <item.icon className={cn("size-5", active && "text-navy-700")} aria-hidden />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isActive(item);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-white/[0.08] text-white before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-amber-500"
                  : "text-navy-100/70 hover:bg-white/[0.05] hover:text-white",
              )}
            >
              <item.icon className={cn("size-4", active ? "text-amber-500" : "opacity-80")} aria-hidden />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.replace("/admin/login");
        router.refresh();
      }}
      aria-label="Sign out"
      className="flex shrink-0 items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium whitespace-nowrap text-navy-100/70 transition-colors hover:bg-white/[0.05] hover:text-white"
    >
      <LogOut className="size-4" aria-hidden />
      <span>Sign out</span>
    </button>
  );
}
