import { AlertTriangle, CheckCircle2, CircleDot, FileText, PackageCheck, Truck, Undo2, Warehouse } from "lucide-react";
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

export function StatusBadge({ status, size = "md" }: { status: ShipmentStatus; size?: "sm" | "md" }) {
  const meta = STATUS_META[status];
  const Icon = statusIcons[status] ?? CircleDot;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        toneClasses[meta.tone],
      )}
    >
      <Icon className={size === "sm" ? "size-3.5" : "size-4"} aria-hidden />
      {meta.label}
    </span>
  );
}
