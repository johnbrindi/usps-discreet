import { Store, UserRound } from "lucide-react";
import { STATUS_META, type StatusTone } from "@/domain/shipment-status";
import { formatDateOnly } from "@/domain/time";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PublicContact, PublicTrackingResult } from "@/server/tracking/providers/types";
import { Barcode } from "./barcode";

const statusBar: Record<StatusTone, string> = {
  neutral: "bg-slate-500",
  info: "bg-navy-700",
  progress: "bg-progress-700",
  success: "bg-success-700",
  warning: "bg-warning-700",
  danger: "bg-danger-700",
};

/** "15:00" → "3:00 PM". */
function formatClock(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h! + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h! < 12 ? "AM" : "PM"}`;
}

const hasContact = (c: PublicContact) => !!(c.name || c.email);

/**
 * Waybill-style card: barcode, shipper and receiver, then every shipment fact staff filled in.
 * Fields left blank in admin are simply not shown.
 */
export function ShipmentInformation({ result }: { result: PublicTrackingResult }) {
  const d = result.details;
  const meta = STATUS_META[result.status];
  const facts: [string, string | null | undefined][] = [
    ["Origin", result.origin],
    ["Destination", result.destination],
    ["Status", meta.label],
    ["Package", result.packageDescription],
    ["Carrier", result.carrier?.name],
    ["Type of shipment", d.shipmentType],
    ["Weight", d.weight],
    ["Shipment mode", d.shipmentMode],
    ["Service", result.serviceLevel],
    ["Product", d.product],
    ["Qty", d.quantity],
    ["Payment mode", d.paymentMode],
    ["Total freight", d.totalFreight],
    ["Expected delivery date", result.estimatedDelivery && formatDateOnly(result.estimatedDelivery.date)],
    ["Departure time", d.departureTime && formatClock(d.departureTime)],
    ["Pick-up date", d.pickupDate && formatDateOnly(d.pickupDate)],
    ["Pick-up time", d.pickupTime && formatClock(d.pickupTime)],
  ];
  const shown = facts.filter((f): f is [string, string] => !!f[1]);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col items-center px-5 pt-6 pb-4">
        <Barcode value={result.trackingNumber} className="h-14 w-full max-w-64" />
        <p className="mt-1.5 font-mono text-sm tracking-wider text-ink">{result.trackingNumber}</p>
      </div>

      {(hasContact(result.shipper) || hasContact(result.recipient)) && (
        <div className="grid gap-6 px-5 pb-5 sm:grid-cols-2 sm:px-6">
          <Party icon={<Store className="size-4" aria-hidden />} title="Shipper information" contact={result.shipper} />
          <Party icon={<UserRound className="size-4" aria-hidden />} title="Receiver information" contact={result.recipient} />
        </div>
      )}

      <p className={cn("px-5 py-2.5 text-center text-sm font-semibold tracking-wide text-white uppercase", statusBar[meta.tone])}>
        Shipment status: {meta.label}
      </p>

      <div className="px-5 py-5 sm:px-6">
        <h2 className="border-b border-line pb-2 text-base font-semibold text-navy-900">Shipment information</h2>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          {shown.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs font-semibold text-muted">{label}</dt>
              <dd className="mt-0.5 text-sm break-words text-ink">{value}</dd>
            </div>
          ))}
          {d.comments && (
            <div className="col-span-full">
              <dt className="text-xs font-semibold text-muted">Comments</dt>
              <dd className="mt-0.5 text-sm whitespace-pre-line text-ink">{d.comments}</dd>
            </div>
          )}
        </dl>
      </div>
    </Card>
  );
}

function Party({ icon, title, contact }: { icon: React.ReactNode; title: string; contact: PublicContact }) {
  return (
    <section className="min-w-0">
      <h3 className="flex items-center gap-1.5 border-b border-line pb-2 text-sm font-semibold text-navy-900">
        {icon}
        {title}
      </h3>
      {hasContact(contact) ? (
        <div className="mt-2 text-sm text-ink">
          {contact.name && <p className="font-medium">{contact.name}</p>}
          {contact.email && <p className="break-all text-muted">{contact.email}</p>}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">Not provided</p>
      )}
    </section>
  );
}
