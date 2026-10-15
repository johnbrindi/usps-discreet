import { Check } from "lucide-react";
import { MILESTONES, milestoneIndex, type ShipmentStatus } from "@/domain/shipment-status";
import { cn } from "@/lib/utils";

export function ProgressSteps({ status, history }: { status: ShipmentStatus; history: ShipmentStatus[] }) {
  const reached = milestoneIndex(status, history);
  const halted = status === "EXCEPTION" || status === "RETURNED_TO_SENDER";
  return (
    <ol className="grid grid-cols-4 gap-1" aria-label="Delivery progress">
      {MILESTONES.map((m, i) => {
        const done = i <= reached;
        const current = i === reached;
        return (
          <li key={m.key} className="flex flex-col gap-2" aria-current={current ? "step" : undefined}>
            <div
              className={cn(
                "h-1.5 rounded-full",
                done ? (halted && current ? "bg-warning-700" : status === "DELIVERED" ? "bg-success-700" : "bg-navy-600") : "bg-line",
              )}
            />
            <div className="flex items-start gap-1.5">
              <span
                className={cn(
                  "mt-0.5 hidden size-4 shrink-0 items-center justify-center rounded-full sm:inline-flex",
                  done ? "bg-navy-700 text-white" : "border border-line-strong",
                )}
              >
                {done && <Check className="size-3" aria-hidden />}
              </span>
              <span className={cn("text-xs leading-4 sm:text-sm", done ? "font-semibold text-ink" : "text-muted")}>
                {m.label}
                <span className="sr-only">{done ? " — completed" : " — not yet"}</span>
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
