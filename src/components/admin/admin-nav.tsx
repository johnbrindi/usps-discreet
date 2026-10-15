"use client";

import { Inbox, LayoutDashboard, LogOut, MessagesSquare, Package } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/shipments", label: "Shipments", icon: Package },
  { href: "/admin/messages", label: "Chat", icon: MessagesSquare },
  { href: "/admin/inquiries", label: "Inquiries", icon: Inbox },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <ul className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold whitespace-nowrap",
                active ? "bg-navy-700 text-white" : "text-navy-100/85 hover:bg-white/10 hover:text-white",
              )}
            >
              <item.icon className="size-4" aria-hidden />
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
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-navy-100/85 hover:bg-white/10 hover:text-white"
    >
      <LogOut className="size-4" aria-hidden /> Sign out
    </button>
  );
}
