import Link from "next/link";
import { AdminPageTitle } from "@/components/admin/page-title";
import { StatusBadge } from "@/components/tracking/status-badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { requireStaffPage } from "@/lib/authz";

export const metadata = { title: "Overview" };

export default async function AdminHome() {
  await requireStaffPage();
  const [byStatus, openChats, newInquiries, recentEvents, openRequests] = await Promise.all([
    db.shipment.groupBy({ by: ["status"], _count: { _all: true } }),
    db.chatConversation.count({ where: { status: "OPEN" } }),
    db.contactInquiry.count({ where: { status: "NEW" } }),
    db.trackingEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, status: true, description: true, createdAt: true, shipment: { select: { id: true, trackingNumber: true } } },
    }),
    db.serviceRequest.count({ where: { status: { not: "CLOSED" } } }),
  ]);
  const total = byStatus.reduce((n, s) => n + s._count._all, 0);
  const count = (status: string) => byStatus.find((s) => s.status === status)?._count._all ?? 0;

  const stats = [
    { label: "Shipments", value: total, href: "/admin/shipments" },
    { label: "Exceptions", value: count("EXCEPTION"), href: "/admin/shipments?status=EXCEPTION" },
    { label: "Open requests", value: openRequests, href: "/admin/requests" },
    { label: "Open chats", value: openChats, href: "/admin/messages" },
    { label: "New inquiries", value: newInquiries, href: "/admin/inquiries" },
  ];

  return (
    <>
      <AdminPageTitle title="Overview" actions={<ButtonLink href="/admin/shipments/new" size="sm">New shipment</ButtonLink>} />
      {/* 1px gaps over a line-coloured background draw the dividers for any tile count. */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-5">
        {stats.map((s, i) => (
          <Link
            key={s.label}
            href={s.href}
            className={cn("bg-white px-5 py-4 transition-colors hover:bg-slate-50", i === 0 && "col-span-2 lg:col-span-1")}
          >
            <p className="text-[0.8125rem] font-medium text-muted">{s.label}</p>
            <p className="mt-1.5 text-[1.75rem] leading-none font-semibold tracking-tight text-navy-900 tabular-nums">
              {s.value}
            </p>
          </Link>
        ))}
      </div>
      <Card className="mt-8">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-[0.9375rem] font-semibold text-navy-900">Recently recorded events</h2>
          <Link href="/admin/shipments" className="text-sm font-medium text-navy-700 hover:underline">
            All shipments
          </Link>
        </div>
        {recentEvents.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-ink">No events recorded yet</p>
            <p className="mt-1 text-sm text-muted">Create a shipment and record its first scan to see activity here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {recentEvents.map((e) => (
              <li key={e.id} className="grid gap-1.5 px-5 py-3.5 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Link
                      href={`/admin/shipments/${e.shipment.id}`}
                      className="font-mono text-[0.8125rem] font-semibold text-navy-700 hover:underline"
                    >
                      {e.shipment.trackingNumber}
                    </Link>
                    <StatusBadge status={e.status} size="sm" />
                  </div>
                  <p className="mt-1 truncate text-muted">{e.description}</p>
                </div>
                <time className="text-xs text-muted tabular-nums sm:text-right" dateTime={e.createdAt.toISOString()}>
                  {e.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC
                </time>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
