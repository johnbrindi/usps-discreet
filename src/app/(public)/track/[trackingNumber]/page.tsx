import type { Metadata } from "next";
import Link from "next/link";
import { ShipmentSummary } from "@/components/tracking/shipment-summary";
import { TrackingForm } from "@/components/tracking/tracking-form";
import { Alert } from "@/components/ui/alert";
import { Card, Container } from "@/components/ui/card";
import { formatTrackingNumber, normalizeTrackingNumber } from "@/domain/tracking-number";
import { lookupTracking } from "@/server/tracking/service";

type Props = { params: Promise<{ trackingNumber: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tn = normalizeTrackingNumber(decodeURIComponent((await params).trackingNumber)).slice(0, 40);
  // Tracking results are personal: keep them out of search engines.
  return { title: `Tracking ${tn}`, robots: { index: false, follow: false } };
}

export default async function TrackingResultPage({ params }: Props) {
  const raw = decodeURIComponent((await params).trackingNumber);
  const lookup = await lookupTracking(raw);
  const shown = normalizeTrackingNumber(raw).slice(0, 40);

  return (
    <Container className="py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-navy-900 hover:underline">Home</Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/track" className="hover:text-navy-900 hover:underline">Track</Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="font-mono text-ink">{shown || "—"}</li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          {lookup.kind === "found" && <ShipmentSummary result={lookup.result} />}

          {lookup.kind === "not_found" && (
            <Card className="p-6 sm:p-8">
              <h1 className="text-2xl font-bold text-navy-900">We couldn&apos;t find that tracking number</h1>
              <p className="mt-2 font-mono text-muted">{formatTrackingNumber(lookup.trackingNumber)}</p>
              <ul className="mt-5 list-disc space-y-1.5 pl-5 leading-7 text-ink/90">
                <li>Check the number for typos — it&apos;s easy to mix up 0 and O, or 1 and I.</li>
                <li>If the label was created recently, tracking can take up to 24 hours to appear.</li>
                <li>
                  Still nothing after a day? <Link href="/contact" className="font-medium text-navy-700 underline underline-offset-2">Contact support</Link>{" "}
                  with your tracking number.
                </li>
              </ul>
            </Card>
          )}

          {lookup.kind === "invalid" && (
            <Card className="p-6 sm:p-8">
              <h1 className="text-2xl font-bold text-navy-900">That isn&apos;t a valid tracking number</h1>
              <Alert tone="danger" className="mt-4">{lookup.message}</Alert>
            </Card>
          )}

          {lookup.kind === "rate_limited" && (
            <Alert tone="warning" title="Too many lookups" live>
              You&apos;ve made a lot of tracking requests in a short time. Please wait a minute and try again.
            </Alert>
          )}

          {lookup.kind === "unavailable" && (
            <Alert tone="danger" title="Tracking is temporarily unavailable" live>
              We couldn&apos;t reach our tracking system. Your parcel isn&apos;t affected — please try again in a few
              minutes.
            </Alert>
          )}
        </div>

        <aside className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Track another parcel</h2>
            <TrackingForm size="md" defaultValue={lookup.kind === "found" ? "" : shown} />
          </Card>
          <Card className="p-5 text-sm leading-6">
            <h2 className="mb-1 font-semibold text-navy-900">Questions about this delivery?</h2>
            <p className="text-muted">
              Read <Link href="/help#statuses" className="font-medium text-navy-700 underline underline-offset-2">what each status means</Link>{" "}
              or <Link href="/contact" className="font-medium text-navy-700 underline underline-offset-2">contact support</Link>.
            </p>
          </Card>
        </aside>
      </div>
    </Container>
  );
}
