import { ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/tracking/status-badge";
import { Container, PageHeader } from "@/components/ui/card";
import { SHIPMENT_STATUSES, STATUS_META } from "@/domain/shipment-status";
import { describeSupportHours } from "@/lib/support-hours";

export const metadata: Metadata = {
  title: "Help centre",
  description: "Answers to common tracking questions, status definitions and how to reach support.",
};

const faqs = [
  {
    q: "Why hasn't my tracking updated?",
    a: "Parcels are scanned at key points — not continuously. It's normal to see no new events for a day or more while a parcel travels between facilities. If there's been no update for 5 business days, contact us.",
  },
  {
    q: "My parcel shows Delivered but I don't have it.",
    a: "Check around your property, with neighbours and any building reception. Wait until the end of the next business day — sometimes parcels are scanned early. If it still hasn't appeared, contact us with your tracking number.",
  },
  {
    q: "Why is there no expected delivery date?",
    a: "We only show an estimate when a verified source provides one. If none is shown, we don't have a reliable date yet — we'd rather show nothing than a guess.",
  },
  {
    q: "Why can't I see the full delivery address?",
    a: "To protect privacy, public tracking shows city and region only. Anyone with a tracking number can view it, so names and street addresses are never displayed.",
  },
  {
    q: "Can I track several parcels at once?",
    a: "Not yet — enter one tracking number at a time. Each result page has a box to track another parcel.",
  },
];

export default function HelpPage() {
  return (
    <>
      <PageHeader eyebrow="Support" title="Help centre" intro="Answers to the most common tracking questions." />
      <Container className="grid gap-12 py-10 sm:py-14 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="On this page" className="hidden lg:block">
          <ul className="sticky top-24 space-y-2 border-l border-line pl-4 text-sm">
            {[
              ["#tracking-numbers", "Tracking numbers"],
              ["#statuses", "Tracking statuses"],
              ["#faq", "Common questions"],
              ["#contact", "Contact us"],
            ].map(([href, label]) => (
              <li key={href}>
                <a href={href} className="text-muted hover:text-navy-900">{label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="max-w-3xl space-y-14">
          <section id="tracking-numbers" aria-labelledby="tn-title" className="scroll-mt-24">
            <h2 id="tn-title" className="text-2xl font-bold text-navy-900">Finding your tracking number</h2>
            <div className="mt-4 space-y-3 leading-7">
              <p>Your tracking number is 10–34 letters and digits. You can find it:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>printed under the barcode on the shipping label;</li>
                <li>on your receipt, if you sent the parcel yourself;</li>
                <li>in the shipping confirmation email from the retailer who sent it.</li>
              </ul>
              <p>Spaces and dashes don&apos;t matter — enter it however it&apos;s printed.</p>
            </div>
          </section>

          <section id="statuses" aria-labelledby="statuses-title" className="scroll-mt-24">
            <h2 id="statuses-title" className="text-2xl font-bold text-navy-900">What tracking statuses mean</h2>
            <dl className="mt-5 divide-y divide-line rounded-lg border border-line">
              {SHIPMENT_STATUSES.map((s) => (
                <div key={s} className="grid gap-2 p-4 sm:grid-cols-[16rem_1fr] sm:items-center">
                  <dt><StatusBadge status={s} size="sm" /></dt>
                  <dd className="text-sm leading-6 text-ink/90">{STATUS_META[s].summary}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section id="faq" aria-labelledby="faq-title" className="scroll-mt-24">
            <h2 id="faq-title" className="text-2xl font-bold text-navy-900">Common questions</h2>
            <div className="mt-5 divide-y divide-line rounded-lg border border-line">
              {faqs.map((f) => (
                <details key={f.q} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 font-semibold text-navy-900 hover:bg-surface [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="px-4 pb-4 leading-7 text-ink/90">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section id="contact" aria-labelledby="contact-title" className="scroll-mt-24">
            <h2 id="contact-title" className="text-2xl font-bold text-navy-900">Still need help?</h2>
            <p className="mt-3 leading-7">
              Our team is available {describeSupportHours()}. Use the chat button at the bottom of the page, message us
              on WhatsApp, or <Link href="/contact" className="font-medium text-navy-700 underline underline-offset-2">send us a message</Link>.
            </p>
          </section>
        </div>
      </Container>
    </>
  );
}
