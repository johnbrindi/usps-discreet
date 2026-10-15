import { AlertTriangle, CheckCircle2, FileText, PackageCheck, Truck, Undo2, Warehouse } from "lucide-react";
import { STATUS_META, type ShipmentStatus, type StatusTone } from "@/domain/shipment-status";
import { cn } from "@/lib/utils";

export const toneClasses: Record<StatusTone, string> = {
  neutral: "bg-surface text-ink border-line-strong",
  info: "bg-navy-50 text-navy-800 border-navy-600/30",
  progress: "bg-progress-50 text-progress-700 border-progress-700/30",
  success: "bg-success-50 text-success-700 border-success-700/30",
  warning: "bg-warning-50 text-warning-700 border-warning-700/30",
  danger: "bg-danger-50 text-danger-700 border-danger-700/30",
};

export const statusIcons: Record<ShipmentStatus, typeof Truck> = {
  INFO_RECEIVED: FileText,
  ACCEPTED: PackageCheck,
  IN_TRANSIT: Truck,
  ARRIVED_AT_FACILITY: Warehouse,
  OUT_FOR_DELIVERY: Truck,
  DELIVERED: CheckCircle2,
  EXCEPTION: AlertTriangle,
  RETURNED_TO_SENDER: Undo2,
};

/** Flat badge styling: soft tint + solid status dot, no outline. */
const badgeTone: Record<StatusTone, { bg: string; dot: string }> = {
  neutral: { bg: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  info: { bg: "bg-navy-50 text-navy-800", dot: "bg-navy-600" },
  progress: { bg: "bg-progress-50 text-progress-700", dot: "bg-progress-700" },
  success: { bg: "bg-success-50 text-success-700", dot: "bg-success-700" },
  warning: { bg: "bg-warning-50 text-warning-700", dot: "bg-amber-500" },
  danger: { bg: "bg-danger-50 text-danger-700", dot: "bg-danger-700" },
};

export function StatusBadge({ status, size = "md" }: { status: ShipmentStatus; size?: "sm" | "md" }) {
  const meta = STATUS_META[status];
  const tone = badgeTone[meta.tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-medium whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        tone.bg,
      )}
    >
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", tone.dot)} />
      {meta.label}
    </span>
  );
}
