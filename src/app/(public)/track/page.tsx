import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TrackingForm } from "@/components/tracking/tracking-form";
import { Card, Container, PageHeader } from "@/components/ui/card";
import { trackingNumberSchema } from "@/validation/tracking";

export const metadata: Metadata = {
  title: "Track a parcel",
  description: "Enter a tracking number to see the latest status and scan history.",
};

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ trackingNumber?: string | string[] }> }) {
  const raw = (await searchParams).trackingNumber;
  const value = Array.isArray(raw) ? raw[0] : raw;
  let serverError: string | undefined;

  // No-JavaScript fallback: the form submits GET /track?trackingNumber=…
  if (value !== undefined) {
    const parsed = trackingNumberSchema.safeParse(value);
    if (parsed.success) redirect(`/track/${parsed.data}`);
    serverError = parsed.error.issues[0]?.message;
  }

  return (
    <>
      <PageHeader eyebrow="Tracking" title="Track a parcel" intro="Enter the tracking number from your receipt, label or shipping confirmation." />
      <Container className="py-10 sm:py-14">
        <Card className="max-w-2xl p-5 sm:p-6">
          <TrackingForm defaultValue={value ?? ""} serverError={serverError} autoFocus />
        </Card>
        <div className="mt-10 grid max-w-3xl gap-6 text-sm leading-6 text-muted sm:grid-cols-2">
          <div>
            <h2 className="mb-1 font-semibold text-ink">Where is my tracking number?</h2>
            <p>
              It&apos;s printed under the barcode on your label and included in your shipping confirmation.{" "}
              <Link href="/help#tracking-numbers" className="font-medium text-navy-700 underline underline-offset-2">
                More help
              </Link>
            </p>
          </div>
          <div>
            <h2 className="mb-1 font-semibold text-ink">Just shipped?</h2>
            <p>New tracking numbers can take up to 24 hours to show their first scan after the label is created.</p>
          </div>
        </div>
      </Container>
    </>
  );
}
