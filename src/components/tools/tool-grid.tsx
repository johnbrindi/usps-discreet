import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { TOOLS, type ToolIcon } from "@/config/service-requests";
import { cn } from "@/lib/utils";
import { ToolIconBadge } from "./tool-icon";

export const toolLinks: { href: string; label: string; summary: string; icon: ToolIcon }[] = [
  {
    href: "/track",
    label: "Track a Package",
    summary: "See the latest status and full scan history for any parcel.",
    icon: "track",
  },
  ...TOOLS.map((t) => ({ href: `/tools/${t.slug}`, label: t.label, summary: t.summary, icon: t.icon })),
];

export function ToolGrid({ className }: { className?: string }) {
  return (
    <ul className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {toolLinks.map((t) => (
        <li key={t.href}>
          <Link
            href={t.href}
            className="group flex h-full items-start gap-4 rounded-lg border border-line bg-white p-5 transition-[border-color,box-shadow] duration-150 hover:border-navy-600/50 hover:shadow-[0_4px_16px_-6px_rgb(16_24_40/0.18)] focus-visible:border-navy-600"
          >
            <ToolIconBadge icon={t.icon} className="transition-colors group-hover:bg-navy-700 group-hover:text-white" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2 text-[0.9375rem] font-semibold text-navy-900">
                {t.label}
                <ArrowRight
                  className="size-4 shrink-0 text-navy-600 opacity-0 transition-[opacity,transform] duration-150 group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100"
                  aria-hidden
                />
              </span>
              <span className="mt-1 block text-sm leading-6 text-muted">{t.summary}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
