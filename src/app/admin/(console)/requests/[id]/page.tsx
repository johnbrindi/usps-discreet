import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageTitle } from "@/components/admin/page-title";
import { RequestStatusBadge } from "@/components/admin/request-status-badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { REQUEST_STATUS_LABEL, contactSection, toolByType, type FieldDef } from "@/config/service-requests";
import { db } from "@/lib/db";
import { setServiceRequestStatus } from "@/server/actions/service-requests";
import { requireStaffPage } from "@/lib/authz";

export const metadata = { title: "Request" };

function display(f: FieldDef, raw: unknown) {
  if (raw === undefined || raw === null || raw === "") return null;
  if (f.kind === "select") return f.options?.find((o) => o.value === raw)?.label ?? String(raw);
  return String(raw);
}

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const r = await db.serviceRequest.findUnique({ where: { id } });
  if (!r) notFound();
  const tool = toolByType(r.type);
  const details = (r.details ?? {}) as Record<string, unknown>;
  const values: Record<string, unknown> = { ...details, trackingNumber: r.trackingNumber };
  const shipment = r.trackingNumber
    ? await db.shipment.findUnique({ where: { trackingNumber: r.trackingNumber }, select: { id: true } })
    : null;
  const subject = encodeURIComponent(`${tool.label} — ${r.reference}`);

  return (
    <>
      <Link href="/admin/requests" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> All requests
      </Link>
      <AdminPageTitle
        title={`${tool.label} · ${r.reference}`}
        description={`Received ${r.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC`}
        actions={
          <a href={`mailto:${r.email}?subject=${subject}`} className={buttonClasses("primary", "sm")}>
            <Mail className="size-4" aria-hidden /> Reply by email
          </a>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <Card>
          {tool.sections.map((section, i) => (
            <section key={section.title} className={i > 0 ? "border-t border-line" : undefined}>
              <h2 className="px-5 pt-4 text-sm font-semibold text-navy-900">{section.title}</h2>
              <dl className="grid gap-x-6 gap-y-3 px-5 py-4 text-sm sm:grid-cols-2">
                {section.fields.map((f) => {
                  const v = display(f, values[f.name]);
                  return (
                    <div key={f.name} className={f.kind === "textarea" || f.span === 6 || !f.span ? "sm:col-span-2" : undefined}>
                      <dt className="text-xs text-muted">{f.label}</dt>
                      <dd className={`mt-0.5 whitespace-pre-wrap text-ink ${f.kind === "tracking" ? "font-mono" : ""}`}>
                        {v ?? <span className="text-muted">—</span>}
                        {f.kind === "tracking" && shipment && (
                          <Link href={`/admin/shipments/${shipment.id}`} className="ml-2 font-sans text-xs font-medium text-navy-700 hover:underline">
                            Open shipment
                          </Link>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          ))}
        </Card>
        <aside className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-navy-900">Status</h2>
              <RequestStatusBadge status={r.status} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(["NEW", "IN_PROGRESS", "CLOSED"] as const)
                .filter((s) => s !== r.status)
                .map((s) => (
                  <form key={s} action={setServiceRequestStatus.bind(null, r.id, s)}>
                    <Button type="submit" variant="secondary" size="sm">Mark {REQUEST_STATUS_LABEL[s].toLowerCase()}</Button>
                  </form>
                ))}
            </div>
          </Card>
          <Card className="p-5 text-sm">
            <h2 className="font-semibold text-navy-900">{contactSection.title.replace("Your", "Customer")}</h2>
            <dl className="mt-3 space-y-2">
              <div><dt className="text-xs text-muted">Name</dt><dd className="text-ink">{r.name}</dd></div>
              <div>
                <dt className="text-xs text-muted">Email</dt>
                <dd><a href={`mailto:${r.email}?subject=${subject}`} className="break-all text-navy-700 hover:underline">{r.email}</a></dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Phone</dt>
                <dd className="text-ink">{r.phone ? <a href={`tel:${r.phone}`} className="hover:underline">{r.phone}</a> : <span className="text-muted">—</span>}</dd>
              </div>
            </dl>
          </Card>
        </aside>
      </div>
    </>
  );
}
