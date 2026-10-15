import Link from "next/link";
import { AdminPageTitle } from "@/components/admin/page-title";
import { StatusBadge } from "@/components/tracking/status-badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";

export const metadata = { title: "Overview" };

export default async function AdminHome() {
  const [byStatus, openChats, newInquiries, recentEvents] = await Promise.all([
    db.shipment.groupBy({ by: ["status"], _count: { _all: true } }),
    db.chatConversation.count({ where: { status: "OPEN" } }),
    db.contactInquiry.count({ where: { status: "NEW" } }),
    db.trackingEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, status: true, description: true, createdAt: true, shipment: { select: { id: true, trackingNumber: true } } },
    }),
  ]);
  const total = byStatus.reduce((n, s) => n + s._count._all, 0);
  const count = (status: string) => byStatus.find((s) => s.status === status)?._count._all ?? 0;

  const stats = [
    { label: "Shipments", value: total, href: "/admin/shipments" },
    { label: "Exceptions", value: count("EXCEPTION"), href: "/admin/shipments?status=EXCEPTION" },
    { label: "Open chats", value: openChats, href: "/admin/messages" },
    { label: "New inquiries", value: newInquiries, href: "/admin/inquiries" },
  ];

  return (
    <>
      <AdminPageTitle title="Overview" actions={<ButtonLink href="/admin/shipments/new" size="sm">New shipment</ButtonLink>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-lg border border-line bg-white p-4 shadow-card hover:border-navy-600/40">
            <p className="text-sm text-muted">{s.label}</p>
            <p className="mt-1 text-3xl font-bold text-navy-900 tabular-nums">{s.value}</p>
          </Link>
        ))}
      </div>
      <Card className="mt-8">
        <h2 className="border-b border-line px-5 py-3 font-semibold text-navy-900">Recently recorded events</h2>
        {recentEvents.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">No events recorded yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {recentEvents.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <Link href={`/admin/shipments/${e.shipment.id}`} className="font-mono font-semibold text-navy-700 hover:underline">
                    {e.shipment.trackingNumber}
                  </Link>
                  <p className="truncate text-muted">{e.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={e.status} size="sm" />
                  <time className="text-xs text-muted tabular-nums" dateTime={e.createdAt.toISOString()}>
                    {e.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
