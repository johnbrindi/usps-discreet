import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { AdminPageTitle } from "@/components/admin/page-title";
import { StatusBadge } from "@/components/tracking/status-badge";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { SHIPMENT_STATUSES, STATUS_META, type ShipmentStatus } from "@/domain/shipment-status";
import { normalizeTrackingNumber } from "@/domain/tracking-number";
import { db } from "@/lib/db";

export const metadata = { title: "Shipments" };
const PAGE_SIZE = 25;

type SP = Promise<{ q?: string; status?: string; page?: string }>;

export default async function ShipmentsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const status = SHIPMENT_STATUSES.includes(sp.status as ShipmentStatus) ? (sp.status as ShipmentStatus) : undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.ShipmentWhereInput = {
    ...(status && { status }),
    ...(q && {
      OR: [
        { trackingNumber: { contains: normalizeTrackingNumber(q) } },
        { externalReference: { contains: q, mode: "insensitive" } },
        { destinationCity: { contains: q, mode: "insensitive" } },
      ],
    }),
  };
  const [total, shipments] = await Promise.all([
    db.shipment.count({ where }),
    db.shipment.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        trackingNumber: true,
        status: true,
        destinationCity: true,
        destinationRegion: true,
        isDemo: true,
        updatedAt: true,
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `?${s}` : "";
  };

  return (
    <>
      <AdminPageTitle
        title="Shipments"
        description={`${total} shipment${total === 1 ? "" : "s"}`}
        actions={<ButtonLink href="/admin/shipments/new" size="sm">New shipment</ButtonLink>}
      />
      <form className="mb-4 flex flex-col gap-3 sm:flex-row" role="search">
        <label htmlFor="q" className="sr-only">Search</label>
        <Input id="q" name="q" defaultValue={q} placeholder="Tracking number, reference or city" className="sm:max-w-sm" />
        <label htmlFor="status" className="sr-only">Status</label>
        <Select id="status" name="status" defaultValue={status ?? ""} className="sm:w-56">
          <option value="">All statuses</option>
          {SHIPMENT_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </Select>
        <button type="submit" className={buttonClasses("secondary")}>Filter</button>
      </form>

      <Card className="overflow-x-auto">
        {shipments.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="text-sm font-medium text-ink">
              {q || status ? "No shipments match these filters." : "No shipments yet"}
            </p>
            {!(q || status) && (
              <>
                <p className="mt-1 text-sm text-muted">
                  Create a shipment to issue a tracking number your customer can look up.
                </p>
                <ButtonLink href="/admin/shipments/new" size="sm" className="mt-4">New shipment</ButtonLink>
              </>
            )}
          </div>
        ) : (
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-line bg-slate-50/70 text-xs text-muted">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-medium">Tracking number</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Status</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Destination</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shipments.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link href={`/admin/shipments/${s.id}`} className="font-mono text-[0.8125rem] font-semibold text-navy-700 hover:underline">
                      {s.trackingNumber}
                    </Link>
                    {s.isDemo && <span className="ml-2 rounded bg-warning-50 px-1.5 py-0.5 text-xs font-semibold text-warning-700">DEMO</span>}
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={s.status} size="sm" /></td>
                  <td className="px-5 py-3 text-muted">{[s.destinationCity, s.destinationRegion].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-5 py-3 text-muted tabular-nums">{s.updatedAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">Page {page} of {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link className={buttonClasses("secondary", "sm")} href={`/admin/shipments${qs(page - 1)}`}>Previous</Link>}
            {page < pages && <Link className={buttonClasses("secondary", "sm")} href={`/admin/shipments${qs(page + 1)}`}>Next</Link>}
          </div>
        </nav>
      )}
    </>
  );
}
