import { Check, CheckCircle2, FileText, Truck, Warehouse } from "lucide-react";
import { MILESTONES, milestoneIndex, type ShipmentStatus } from "@/domain/shipment-status";
import { cn } from "@/lib/utils";

const milestoneIcons = [FileText, Warehouse, Truck, CheckCircle2];

export function ProgressSteps({ status, history }: { status: ShipmentStatus; history: ShipmentStatus[] }) {
  const reached = milestoneIndex(status, history);
  const halted = status === "EXCEPTION" || status === "RETURNED_TO_SENDER";
  const delivered = status === "DELIVERED";
  // Fill runs from the first step's centre to the reached step's centre.
  const fill = `${(reached / (MILESTONES.length - 1)) * 100}%`;
  return (
    <div className="relative">
      <div aria-hidden className="absolute top-5 right-[12.5%] left-[12.5%] h-1 rounded-full bg-line">
        <div
          className={cn("progress-fill h-full rounded-full", delivered ? "bg-success-700" : halted ? "bg-warning-700" : "bg-navy-600")}
          style={{ width: fill }}
        />
      </div>
      <ol className="relative grid grid-cols-4" aria-label="Delivery progress">
        {MILESTONES.map((m, i) => {
          const done = i <= reached;
          const current = i === reached;
          const Icon = milestoneIcons[i]!;
          return (
            <li key={m.key} className="flex flex-col items-center gap-2 text-center" aria-current={current ? "step" : undefined}>
              <span className="relative flex">
                {current && !delivered && !halted && (
                  <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-navy-600/30 motion-reduce:hidden" />
                )}
                <span
                  className={cn(
                    "relative inline-flex size-10 items-center justify-center rounded-full border-2 transition-colors duration-700",
                    done
                      ? delivered
                        ? "border-success-700 bg-success-700 text-white"
                        : halted && current
                          ? "border-warning-700 bg-warning-700 text-white"
                          : "border-navy-700 bg-navy-700 text-white"
                      : "border-line-strong bg-white text-muted",
                  )}
                >
                  {done && !current ? <Check className="size-5" aria-hidden /> : <Icon className="size-[1.125rem]" aria-hidden />}
                </span>
              </span>
              <span className={cn("text-xs leading-4 sm:text-sm", done ? "font-semibold text-ink" : "text-muted")}>
                {m.label}
                <span className="sr-only">{done ? " — completed" : " — not yet"}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
