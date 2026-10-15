import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Container, PageHeader } from "@/components/ui/card";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Privacy policy", description: `How ${siteConfig.name} handles your information.` };

export default function PrivacyPage() {
  return (
    <>
      <PageHeader eyebrow="Legal" title="Privacy policy" intro="Last updated: October 15, 2026" />
      <Container className="max-w-3xl py-10 sm:py-14">
        <Alert tone="info" className="mb-8">
          This policy is a starting template describing how this application actually processes data. The operator must
          have it reviewed for their jurisdiction before launch.
        </Alert>
        <div className="prose-policy">
          <p>
            This policy explains what information {siteConfig.legalName} (&ldquo;we&rdquo;) collects through this website and
            how we use it.
          </p>
          <h2>Information we collect</h2>
          <ul>
            <li><strong>Tracking lookups.</strong> The tracking number you enter, and your IP address for abuse prevention (rate limiting). Lookups are not linked to an account.</li>
            <li><strong>Contact messages.</strong> Your name, email address, topic, optional tracking number and message.</li>
            <li><strong>Chat messages.</strong> The messages you send and our replies. A random identifier is stored in a cookie so you can return to your conversation; we store only a one-way hash of it.</li>
            <li><strong>Shipment records.</strong> Created by our staff or carrier partners. Public tracking pages show only status, scan descriptions and city-level locations — never recipient names or street addresses.</li>
          </ul>
          <h2>How we use it</h2>
          <ul>
            <li>To show tracking information and respond to your questions.</li>
            <li>To protect the service from abuse, such as automated tracking-number guessing or spam.</li>
            <li>To keep an audit trail of staff changes to shipment records.</li>
          </ul>
          <p>We do not sell personal information or use it for advertising.</p>
          <h2>Cookies</h2>
          <p>
            We use only strictly necessary cookies: one to keep your support chat conversation, and session cookies for
            staff who sign in to the administration area. We do not use analytics or advertising cookies.
          </p>
          <h2>Third parties</h2>
          <p>
            If you choose to contact us on WhatsApp, your conversation is handled by WhatsApp under its own privacy
            policy. Our database is hosted by a cloud database provider acting on our behalf.
          </p>
          <h2>Retention</h2>
          <p>We keep contact and chat messages only as long as needed to resolve your request and meet legal obligations.</p>
          <h2>Your rights</h2>
          <p>
            You can ask us to access, correct or delete your personal information by emailing {siteConfig.supportEmail} or
            using our <Link href="/contact">contact form</Link>.
          </p>
        </div>
      </Container>
    </>
  );
}
