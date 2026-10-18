import { AdminPageTitle } from "@/components/admin/page-title";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { setInquiryStatus } from "@/server/actions/admin-support";
import { CONTACT_TOPICS } from "@/validation/contact";
import { requireStaffPage } from "@/lib/authz";

export const metadata = { title: "Inquiries" };

const LABEL = { NEW: "New", IN_PROGRESS: "In progress", CLOSED: "Closed" } as const;

export default async function InquiriesPage() {
  await requireStaffPage();
  const inquiries = await db.contactInquiry.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 100 });
  return (
    <>
      <AdminPageTitle title="Inquiries" description="Messages from the contact form. Reply to customers by email." />
      {inquiries.length === 0 ? (
        <Card className="px-5 py-12 text-center text-sm text-muted">No inquiries yet.</Card>
      ) : (
        <ul className="space-y-4">
          {inquiries.map((q) => (
            <li key={q.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-navy-900">
                      {q.name} <span className="font-normal text-muted">· {q.email}</span>
                    </p>
                    <p className="text-xs text-muted">
                      {CONTACT_TOPICS.find((t) => t.value === q.topic)?.label ?? q.topic}
                      {q.trackingNumber && <> · <span className="font-mono">{q.trackingNumber}</span></>} ·{" "}
                      {q.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC · ref {q.id.slice(-8).toUpperCase()}
                    </p>
                  </div>
                  <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink">{LABEL[q.status]}</span>
                </div>
                <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-ink/90">{q.message}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(["NEW", "IN_PROGRESS", "CLOSED"] as const)
                    .filter((s) => s !== q.status)
                    .map((s) => (
                      <form key={s} action={setInquiryStatus.bind(null, q.id, s)}>
                        <Button type="submit" variant="secondary" size="sm">Mark {LABEL[s].toLowerCase()}</Button>
                      </form>
                    ))}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
