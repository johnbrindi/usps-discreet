import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Container, PageHeader } from "@/components/ui/card";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Terms of service", description: `Terms for using the ${siteConfig.name} website.` };

export default function TermsPage() {
  return (
    <>
      <PageHeader eyebrow="Legal" title="Terms of service" intro="Last updated: October 15, 2026" />
      <Container className="max-w-3xl py-10 sm:py-14">
        <Alert tone="info" className="mb-8">
          Template terms for this application. The operator must have them reviewed by counsel before launch.
        </Alert>
        <div className="prose-policy">
          <p>By using this website you agree to these terms. If you do not agree, please do not use the site.</p>
          <h2>The service</h2>
          <p>
            {siteConfig.name} provides online tracking information for parcels handled by {siteConfig.legalName}.{" "}
            {siteConfig.name} is an independent service and is not affiliated with any national postal service or
            government agency.
          </p>
          <h2>Tracking information</h2>
          <p>
            Tracking events reflect the scans recorded in our systems at the time you view them. Expected delivery
            dates, where shown, are estimates from the stated source and are not guarantees.
          </p>
          <h2>Acceptable use</h2>
          <ul>
            <li>Only look up tracking numbers you are entitled to track.</li>
            <li>Do not use automated tools to query tracking numbers in bulk or attempt to guess them.</li>
            <li>Do not attempt to access the administration area without authorization.</li>
            <li>Do not send abusive, unlawful or spam messages through our forms or chat.</li>
          </ul>
          <h2>Payments</h2>
          <p>
            We never request payment through chat, WhatsApp or text messages. Treat any such request as fraudulent and{" "}
            <Link href="/contact">report it to us</Link>.
          </p>
          <h2>Liability</h2>
          <p>
            To the extent permitted by law, the website is provided &ldquo;as is&rdquo;. Claims relating to the carriage
            of a parcel are governed by the terms under which it was shipped.
          </p>
          <h2>Changes</h2>
          <p>We may update these terms. The date at the top of this page shows when they last changed.</p>
        </div>
      </Container>
    </>
  );
}
