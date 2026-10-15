import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventForm } from "@/components/admin/event-form";
import { AdminPageTitle } from "@/components/admin/page-title";
import { ShipmentForm } from "@/components/admin/shipment-form";
import { StatusBadge } from "@/components/tracking/status-badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { STATUS_META, nextStatusOptions } from "@/domain/shipment-status";
import { formatEventTime } from "@/domain/time";
import { db } from "@/lib/db";
import { formatPlace } from "@/lib/utils";
import { addTrackingEvent, removeLatestEvent, updateShipment } from "@/server/actions/admin-shipments";

export const metadata = { title: "Shipment" };

export default async function ShipmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const shipment = await db.shipment.findUnique({
    where: { id },
    include: {
      events: { orderBy: { occurredAt: "desc" }, include: { createdBy: { select: { name: true } } } },
    },
  });
  if (!shipment) notFound();

  const options = nextStatusOptions(shipment.status, shipment.events.length > 0);
  const latestTz = shipment.events[0]?.timeZone;
  const initial = Object.fromEntries(
    Object.entries({
      serviceLevel: shipment.serviceLevel,
      carrier: shipment.carrier,
      externalReference: shipment.externalReference,
      originCity: shipment.originCity,
      originRegion: shipment.originRegion,
      originCountry: shipment.originCountry,
      destinationCity: shipment.destinationCity,
      destinationRegion: shipment.destinationRegion,
      destinationCountry: shipment.destinationCountry,
      destinationPostcode: shipment.destinationPostcode,
      recipientName: shipment.recipientName,
      internalNotes: shipment.internalNotes,
      estimatedDeliveryDate: shipment.estimatedDeliveryDate?.toISOString().slice(0, 10),
      estimateSource: shipment.estimateSource,
    }).map(([k, v]) => [k, v ?? ""]),
  );

  return (
    <>
      <Link href="/admin/shipments" className="text-sm text-muted hover:text-navy-900 hover:underline">← Shipments</Link>
      <AdminPageTitle
        title={shipment.trackingNumber}
        description={`Created ${shipment.createdAt.toISOString().slice(0, 10)}${shipment.isDemo ? " · demo record" : ""}`}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={shipment.status} />
            <Link
              href={`/track/${shipment.trackingNumber}`}
              target="_blank"
              className="inline-flex items-center gap-1 text-sm font-semibold text-navy-700 hover:underline"
            >
              Public view <ExternalLink className="size-3.5" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </Link>
          </div>
        }
      />
      {created && <Alert tone="success" className="mb-6" live>Shipment created. Record its first event below.</Alert>}
      {shipment.isDemo && (
        <Alert tone="warning" className="mb-6" title="Demo record">
          Shown to the public only while demo mode is enabled, always with a &ldquo;sample record&rdquo; banner.
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_28rem]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="mb-1 font-semibold text-navy-900">Record a tracking event</h2>
            <p className="mb-4 text-sm text-muted">
              Only record scans that actually happened. Allowed next statuses follow the shipment lifecycle.
            </p>
            <EventForm action={addTrackingEvent.bind(null, shipment.id)} options={options} defaultTimeZone={latestTz} />
          </Card>
          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 font-semibold text-navy-900">Details</h2>
            <ShipmentForm action={updateShipment.bind(null, shipment.id)} initial={initial} mode="update" />
          </Card>
        </div>

        <Card className="h-fit">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="font-semibold text-navy-900">Event history</h2>
            {shipment.events.length > 0 && (
              <form action={removeLatestEvent.bind(null, shipment.id)}>
                <Button type="submit" variant="danger" size="sm">Remove latest</Button>
              </form>
            )}
          </div>
          {shipment.events.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">No events yet.</p>
          ) : (
            <ol className="divide-y divide-line">
              {shipment.events.map((e) => {
                const t = formatEventTime(e.occurredAt.toISOString(), e.timeZone);
                return (
                  <li key={e.id} className="px-5 py-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-ink">{STATUS_META[e.status].label}</p>
                      <span className="shrink-0 rounded bg-surface px-1.5 py-0.5 text-[0.6875rem] font-semibold text-muted">{e.source}</span>
                    </div>
                    <p className="text-ink/85">{e.description}</p>
                    <p className="mt-1 text-xs text-muted">
                      {t.date} · {t.time}
                      {formatPlace(e) && ` · ${formatPlace(e)}`}
                      {e.createdBy && ` · by ${e.createdBy.name}`}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>
    </>
  );
}
