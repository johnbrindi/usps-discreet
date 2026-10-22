import { Globe, MapPin, MonitorSmartphone } from "lucide-react";
import { AdminPageTitle } from "@/components/admin/page-title";
import { Card } from "@/components/ui/card";
import { requireStaffPage } from "@/lib/authz";
import { chatDateTime } from "@/lib/chat-format";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { describeDevice, describeDuration, describePlace, isOnline } from "@/server/visits";

export const metadata = { title: "Visitors" };

/** Visits seen in the last week, and the time they were loaded (for online/duration). */
async function loadVisits() {
  const now = Date.now();
  const visits = await db.siteVisit.findMany({
    where: { lastSeenAt: { gte: new Date(now - 7 * 24 * 60 * 60_000) } },
    orderBy: { lastSeenAt: "desc" },
    take: 100,
  });
  return { visits, now };
}

export default async function VisitorsPage() {
  await requireStaffPage();
  const { visits, now } = await loadVisits();
  const online = visits.filter((v) => isOnline(v, now));
  const recent = visits.filter((v) => !isOnline(v, now));

  return (
    <>
      <AdminPageTitle
        title="Visitors"
        description="People on the public site. A visit counts once someone scrolls, taps or stays 10 seconds, so uptime monitors and link scanners that open the page for a second aren't shown. Turn on notifications to get an alert when someone arrives or leaves."
      />
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold tracking-wide text-navy-900 uppercase">
        <span aria-hidden className="relative flex size-2.5">
          {online.length > 0 && <span className="absolute inline-flex size-full animate-ping rounded-full bg-whatsapp opacity-60 motion-reduce:hidden" />}
          <span className={cn("relative inline-flex size-2.5 rounded-full", online.length ? "bg-whatsapp" : "bg-slate-300")} />
        </span>
        On the site now · {online.length}
      </h2>
      <VisitList visits={online} now={now} empty="Nobody is on the site right now." />

      <h2 className="mt-8 mb-2 text-sm font-bold tracking-wide text-navy-900 uppercase">Recent visits · last 7 days</h2>
      <VisitList visits={recent} now={now} empty="No visits in the last 7 days." />
    </>
  );
}

type Visit = Awaited<ReturnType<typeof db.siteVisit.findMany>>[number];

function VisitList({ visits, now, empty }: { visits: Visit[]; now: number; empty: string }) {
  if (visits.length === 0) return <Card className="px-5 py-8 text-center text-sm text-muted">{empty}</Card>;
  return (
    <Card>
      <ul className="divide-y divide-line">
        {visits.map((v) => {
          const live = isOnline(v, now);
          const end = live ? now : (v.leftAt ?? v.lastSeenAt).getTime();
          return (
            <li key={v.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-5 py-3">
              <div className="min-w-0 space-y-0.5">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <MapPin className="size-3.5 shrink-0 text-muted" aria-hidden />
                  {describePlace(v) ?? "Unknown location"}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <MonitorSmartphone className="size-3.5 shrink-0" aria-hidden />
                  {describeDevice(v.userAgent) ?? "Unknown device"}
                  <span aria-hidden>·</span>
                  <span className="truncate font-mono">{v.path}</span>
                </p>
                {v.referrer && (
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    <Globe className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">from {v.referrer}</span>
                  </p>
                )}
              </div>
              <div className="text-right text-xs text-muted">
                {live ? (
                  <span className="rounded-full bg-success-50 px-2 py-0.5 font-semibold text-success-700">Online</span>
                ) : (
                  <span>Left {chatDateTime((v.leftAt ?? v.lastSeenAt).toISOString())}</span>
                )}
                <p className="mt-1">
                  Arrived {chatDateTime(v.startedAt.toISOString())} · {describeDuration(end - v.startedAt.getTime())}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
