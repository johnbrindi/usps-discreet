import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "info" | "success" | "warning" | "danger";

const styles: Record<Tone, string> = {
  info: "border-navy-600/25 bg-navy-50 text-navy-900",
  success: "border-success-700/25 bg-success-50 text-success-700",
  warning: "border-warning-700/25 bg-warning-50 text-warning-700",
  danger: "border-danger-700/25 bg-danger-50 text-danger-700",
};
const icons = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle };

export function Alert({
  tone = "info",
  title,
  children,
  className,
  live,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  className?: string;
  live?: boolean;
}) {
  const Icon = icons[tone];
  return (
    <div
      role={live ? (tone === "danger" ? "alert" : "status") : undefined}
      className={cn("flex gap-3 rounded-md border px-4 py-3 text-sm", styles[tone], className)}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-6 text-ink/90">{children}</div>}
      </div>
    </div>
  );
}
