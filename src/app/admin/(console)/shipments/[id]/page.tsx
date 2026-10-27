import type { Prisma } from "@prisma/client";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventForm } from "@/components/admin/event-form";
import { AdminPageTitle } from "@/components/admin/page-title";
import { ShipmentForm } from "@/components/admin/shipment-form";
import { SyncNowButton } from "@/components/admin/sync-now-button";
import { StatusBadge } from "@/components/tracking/status-badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PROVIDER_LABELS, type CarrierProviderId } from "@/domain/carriers";
import { countryName } from "@/domain/countries";
import { STATUS_META, nextStatusOptions } from "@/domain/shipment-status";
import { formatEventTime } from "@/domain/time";
import { db } from "@/lib/db";
import { formatPlace } from "@/lib/utils";
import { addTrackingEvent, removeLatestEvent, syncShipmentNow, updateShipment } from "@/server/actions/admin-shipments";
import { getCarrierClient } from "@/server/carriers/registry";
import { requireStaffPage } from "@/lib/authz";

export const metadata = { title: "Shipment" };

export default async function ShipmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requireStaffPage();
  const { id } = await params;
  const { created } = await searchParams;
  const shipment = await db.shipment.findUnique({
    where: { id },
    include: {
      events: { orderBy: { occurredAt: "desc" }, include: { createdBy: { select: { name: true } } } },
      syncLogs: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!shipment) notFound();
  const carrierTracked = shipment.trackingMode === "CARRIER";

  const options = nextStatusOptions(shipment.status, shipment.events.length > 0);
  const latestTz = shipment.events[0]?.timeZone;
  const initial = Object.fromEntries(
    Object.entries({
      serviceLevel: shipment.serviceLevel,
      packageDescription: shipment.packageDescription,
      carrier: shipment.carrier,
      externalReference: shipment.externalReference,
      originCity: shipment.originCity,
      originRegion: shipment.originRegion,
      originCountry: countryName(shipment.originCountry),
      destinationCity: shipment.destinationCity,
      destinationRegion: shipment.destinationRegion,
      destinationCountry: countryName(shipment.destinationCountry),
      destinationPostcode: shipment.destinationPostcode,
      shipperName: shipment.shipperName,
      shipperEmail: shipment.shipperEmail,
      shipperPhone: shipment.shipperPhone,
      recipientName: shipment.recipientName,
      recipientEmail: shipment.recipientEmail,
      recipientPhone: shipment.recipientPhone,
      paymentMode: shipment.paymentMode,
      pickupDate: shipment.pickupDate?.toISOString().slice(0, 10),
      pickupTime: shipment.pickupTime,
      departureTime: shipment.departureTime,
      shipmentType: shipment.shipmentType,
      shipmentMode: shipment.shipmentMode,
      product: shipment.product,
      quantity: shipment.quantity,
      weight: shipment.weight,
      totalFreight: shipment.totalFreight,
      comments: shipment.comments,
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
        description={`Created ${shipment.createdAt.toISOString().slice(0, 10)}${shipment.createdVia === "PUBLIC_LOOKUP" ? " by a public lookup" : ""}${shipment.isDemo ? " · demo record" : ""}`}
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
      {created && <Alert tone="success" className="mb-6" live>Shipment created. Record its first scan below — the Quick add buttons fill in the form for you.</Alert>}
      {shipment.isDemo && (
        <Alert tone="warning" className="mb-6" title="Demo record">
          Shown to the public only while demo mode is enabled, always with a &ldquo;sample record&rdquo; banner.
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="min-w-0 space-y-6">
          {carrierTracked ? (
            <CarrierSyncCard shipment={shipment} />
          ) : (
            <Card className="p-5 sm:p-6">
              <h2 className="mb-1 font-semibold text-navy-900">Record a tracking event</h2>
              <p className="mb-4 text-sm text-muted">
                Only record scans that actually happened. Allowed next statuses follow the shipment lifecycle.
              </p>
              <EventForm
                action={addTrackingEvent.bind(null, shipment.id)}
                options={options}
                defaultTimeZone={latestTz}
                places={{
                  origin: { city: shipment.originCity, region: shipment.originRegion, country: shipment.originCountry },
                  last: shipment.events[0] && { city: shipment.events[0].city, region: shipment.events[0].region, country: shipment.events[0].country },
                  destination: { city: shipment.destinationCity, region: shipment.destinationRegion, country: shipment.destinationCountry },
                }}
              />
            </Card>
          )}
          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 font-semibold text-navy-900">Details</h2>
            <ShipmentForm action={updateShipment.bind(null, shipment.id)} initial={initial} mode="update" carrierTracked={carrierTracked} />
          </Card>
        </div>

        <Card className="h-fit">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="font-semibold text-navy-900">Event history</h2>
            {shipment.events.length > 0 && !carrierTracked && (
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

type ShipmentWithLogs = Prisma.ShipmentGetPayload<{ include: { syncLogs: true } }>;

const OUTCOME_TONE: Record<string, string> = {
  ok: "bg-success-50 text-success-700",
  pending: "bg-navy-50 text-navy-800",
  not_found: "bg-warning-50 text-warning-700",
  rate_limited: "bg-warning-50 text-warning-700",
};

function when(d: Date | null) {
  if (!d) return "—";
  return `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function CarrierSyncCard({ shipment: s }: { shipment: ShipmentWithLogs }) {
  const providerLabel = PROVIDER_LABELS[s.carrierProvider as CarrierProviderId] ?? s.carrierProvider ?? "—";
  const configured = !!getCarrierClient(s.carrierProvider);
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-navy-900">Carrier sync</h2>
          <p className="text-sm text-muted">Events on this shipment come only from the carrier&apos;s API and can&apos;t be edited by hand.</p>
        </div>
        <SyncNowButton action={syncShipmentNow.bind(null, s.id)} />
      </div>
      {!configured && (
        <Alert tone="danger" className="mb-4" title="Provider not configured">
          The server has no credentials for {providerLabel}. Add them to the environment and restart (see docs/integrations.md).
        </Alert>
      )}
      {s.lastSyncError && (
        <Alert tone="warning" className="mb-4" title={`Last attempt failed (${s.syncFailureCount} in a row)`}>
          {s.lastSyncError}
        </Alert>
      )}
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        {[
          ["API", providerLabel],
          ["Carrier", s.carrier ?? "—"],
          ["Carrier tracking number", s.carrierTrackingNumber ?? s.trackingNumber],
          ["Carrier status", s.carrierStatusText ?? "—"],
          ["Last successful sync", when(s.lastSyncedAt)],
          ["Next scheduled sync", s.nextSyncAt ? when(s.nextSyncAt) : "Stopped (final status or carrier never recognised the number)"],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-muted">{k}</dt>
            <dd className="font-medium break-words text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <h3 className="mt-6 mb-2 text-sm font-semibold text-navy-900">Recent API calls</h3>
      {s.syncLogs.length === 0 ? (
        <p className="text-sm text-muted">No calls yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-xs">
            <thead className="text-muted">
              <tr>
                <th scope="col" className="py-1.5 pr-3 font-medium">Time</th>
                <th scope="col" className="py-1.5 pr-3 font-medium">Trigger</th>
                <th scope="col" className="py-1.5 pr-3 font-medium">Result</th>
                <th scope="col" className="py-1.5 pr-3 font-medium">Events</th>
                <th scope="col" className="py-1.5 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {s.syncLogs.map((l) => (
                <tr key={l.id} title={l.error ?? undefined}>
                  <td className="py-1.5 pr-3 tabular-nums">{when(l.createdAt)}</td>
                  <td className="py-1.5 pr-3">{l.trigger}</td>
                  <td className="py-1.5 pr-3">
                    <span className={`rounded px-1.5 py-0.5 font-semibold ${OUTCOME_TONE[l.outcome] ?? "bg-danger-50 text-danger-700"}`}>
                      {l.outcome}
                      {l.httpStatus && l.outcome !== "ok" ? ` · ${l.httpStatus}` : ""}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 tabular-nums">+{l.eventsAdded}{l.eventsRemoved ? ` / −${l.eventsRemoved}` : ""}</td>
                  <td className="py-1.5 tabular-nums">{l.durationMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
