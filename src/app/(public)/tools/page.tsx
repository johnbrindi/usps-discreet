import type { Metadata } from "next";
import Link from "next/link";
import { ToolGrid } from "@/components/tools/tool-grid";
import { Container, PageHeader } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Quick tools",
  description: "Track a parcel, get a price quote, book a pickup or shipment, redirect a delivery, or file a claim.",
};

export default function ToolsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Quick tools"
        title="What do you need to do?"
        intro="Every request gets a reference number and is handled by our team — you'll hear back by email."
      />
      <Container className="py-10 sm:py-14">
        <ToolGrid />
        <p className="mt-10 text-sm text-muted">
          Can&apos;t find what you need?{" "}
          <Link href="/contact" className="font-medium text-navy-700 underline underline-offset-2">Contact support</Link>.
        </p>
      </Container>
    </>
  );
}
