import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { AdminPageTitle } from "@/components/admin/page-title";
import { RequestStatusBadge } from "@/components/admin/request-status-badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { REQUEST_STATUS_LABEL, TOOLS, toolByType } from "@/config/service-requests";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/authz";

export const metadata = { title: "Requests" };

type SP = Promise<{ type?: string; status?: string }>;
const STATUSES = ["NEW", "IN_PROGRESS", "CLOSED"] as const;

export default async function RequestsPage({ searchParams }: { searchParams: SP }) {
  await requireStaffPage();
  const sp = await searchParams;
  const type = TOOLS.find((t) => t.type === sp.type)?.type;
  const status = STATUSES.find((s) => s === sp.status);

  const where: Prisma.ServiceRequestWhereInput = { ...(type && { type }), ...(status && { status }) };
  const [requests, open] = await Promise.all([
    db.serviceRequest.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
      select: { id: true, reference: true, type: true, status: true, name: true, email: true, trackingNumber: true, createdAt: true },
    }),
    db.serviceRequest.count({ where: { status: { not: "CLOSED" } } }),
  ]);

  return (
    <>
      <AdminPageTitle
        title="Requests"
        description={`Quotes, pickups, shipments, address changes and claims submitted from Quick tools · ${open} open`}
      />
      <form className="mb-4 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="type" className="sr-only">Request type</label>
        <Select id="type" name="type" defaultValue={type ?? ""} className="sm:w-60">
          <option value="">All request types</option>
          {TOOLS.map((t) => (
            <option key={t.type} value={t.type}>{t.label}</option>
          ))}
        </Select>
        <label htmlFor="status" className="sr-only">Status</label>
        <Select id="status" name="status" defaultValue={status ?? ""} className="sm:w-48">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{REQUEST_STATUS_LABEL[s]}</option>
          ))}
        </Select>
        <button type="submit" className={buttonClasses("secondary")}>Filter</button>
      </form>

      <Card className="overflow-x-auto">
        {requests.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="text-sm font-medium text-ink">{type || status ? "No requests match these filters." : "No requests yet"}</p>
            {!(type || status) && (
              <p className="mt-1 text-sm text-muted">Requests customers submit from the Quick tools pages appear here automatically.</p>
            )}
          </div>
        ) : (
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="border-b border-line bg-slate-50/70 text-xs text-muted">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-medium">Reference</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Type</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Customer</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Status</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {requests.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link href={`/admin/requests/${r.id}`} className="font-mono text-[0.8125rem] font-semibold text-navy-700 hover:underline">
                      {r.reference}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-ink">{toolByType(r.type).label}</td>
                  <td className="px-5 py-3">
                    <p className="text-ink">{r.name}</p>
                    <p className="text-xs text-muted">{r.email}</p>
                  </td>
                  <td className="px-5 py-3"><RequestStatusBadge status={r.status} /></td>
                  <td className="px-5 py-3 text-muted tabular-nums">
                    {r.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
