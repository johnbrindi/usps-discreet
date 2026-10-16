import { Calculator, CalendarClock, FileWarning, MapPinned, PackagePlus, PackageSearch, type LucideIcon } from "lucide-react";
import type { ToolIcon } from "@/config/service-requests";
import { cn } from "@/lib/utils";

// Lucide icons (ISC licence) — replaces the copied third-party SVGs that used to live in public/images.
const ICONS: Record<ToolIcon, LucideIcon> = {
  track: PackageSearch,
  quote: Calculator,
  pickup: CalendarClock,
  ship: PackagePlus,
  address: MapPinned,
  claim: FileWarning,
};

export function ToolIconBadge({ icon, className }: { icon: ToolIcon; className?: string }) {
  const Icon = ICONS[icon];
  return (
    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-md bg-navy-50 text-navy-700", className)}>
      <Icon className="size-[1.375rem]" strokeWidth={1.75} aria-hidden />
    </span>
  );
}
