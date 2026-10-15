import { REQUEST_STATUS_LABEL } from "@/config/service-requests";
import { cn } from "@/lib/utils";

const tone = {
  NEW: { bg: "bg-warning-50 text-warning-700", dot: "bg-amber-500" },
  IN_PROGRESS: { bg: "bg-navy-50 text-navy-800", dot: "bg-navy-600" },
  CLOSED: { bg: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
} as const;

export function RequestStatusBadge({ status }: { status: keyof typeof REQUEST_STATUS_LABEL }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap", tone[status].bg)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", tone[status].dot)} />
      {REQUEST_STATUS_LABEL[status]}
    </span>
  );
}
