import { Clock3, Mail } from "lucide-react";
import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/contact-form";
import { Card, Container, PageHeader } from "@/components/ui/card";
import { WhatsAppIcon } from "@/components/widgets/whatsapp-icon";
import { siteConfig, whatsappUrl } from "@/config/site";
import { describeSupportHours } from "@/lib/support-hours";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Send a message to our support team about a parcel or delivery.",
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ tn?: string }> }) {
  const { tn } = await searchParams;
  return (
    <>
      <PageHeader eyebrow="Support" title="Contact us" intro="Tell us what's happening and we'll get back to you by email." />
      <Container className="grid gap-10 py-10 sm:py-14 lg:grid-cols-[1fr_20rem]">
        <Card className="p-5 sm:p-8">
          <ContactForm defaultTrackingNumber={typeof tn === "string" ? tn.slice(0, 40) : ""} />
        </Card>
        <aside className="space-y-4 text-sm leading-6">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-semibold text-navy-900"><Clock3 className="size-4" aria-hidden /> Support hours</h2>
            <p className="mt-1 text-muted">{describeSupportHours()}</p>
            <p className="mt-2 text-muted">We aim to reply to messages within one business day.</p>
          </Card>
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-semibold text-navy-900"><Mail className="size-4" aria-hidden /> Email</h2>
            <p className="mt-1">
              <a href={`mailto:${siteConfig.supportEmail}`} className="font-medium break-all text-navy-700 underline underline-offset-2">
                {siteConfig.supportEmail}
              </a>
            </p>
          </Card>
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-semibold text-navy-900"><WhatsAppIcon className="size-4 text-whatsapp-dark" /> WhatsApp</h2>
            <p className="mt-1">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-navy-700 underline underline-offset-2">
                {siteConfig.whatsappDisplay}
              </a>
            </p>
          </Card>
        </aside>
      </Container>
    </>
  );
}
