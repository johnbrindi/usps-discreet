import { Mail } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/card";
import { WhatsAppIcon } from "@/components/widgets/whatsapp-icon";
import { TOOLS } from "@/config/service-requests";
import { siteConfig, whatsappUrl } from "@/config/site";
import { describeSupportHours } from "@/lib/support-hours";
import { Logo } from "./logo";

// Every link points at a real route or section — no placeholder pages.
const footerColumns = [
  {
    heading: "Tracking",
    links: [
      { href: "/track", label: "Track a package" },
      { href: "/help#statuses", label: "What statuses mean" },
      { href: "/help#tracking-numbers", label: "Find your tracking number" },
    ],
  },
  {
    heading: "Quick tools",
    links: TOOLS.map((t) => ({ href: `/tools/${t.slug}`, label: t.label })),
  },
  {
    heading: "Help",
    links: [
      { href: "/help#faq", label: "FAQs" },
      { href: "/help#scams", label: "Report a scam message" },
      { href: "/contact", label: "Contact us" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of service" },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-line bg-white text-sm">
      <Container className="grid gap-10 py-12 lg:grid-cols-[16rem_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="leading-6 text-muted">{siteConfig.tagline}.</p>
          <ul className="space-y-2">
            <li>
              <a href={`mailto:${siteConfig.supportEmail}`} className="inline-flex items-center gap-2 break-all text-ink hover:text-navy-700">
                <Mail className="size-4 shrink-0 text-muted" aria-hidden /> {siteConfig.supportEmail}
              </a>
            </li>
            <li>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-ink hover:text-navy-700">
                <WhatsAppIcon className="size-4 shrink-0 text-whatsapp-dark" /> {siteConfig.whatsappDisplay}
              </a>
            </li>
            <li className="text-xs text-muted">Support: {describeSupportHours()}</li>
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {footerColumns.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h2 className="mb-3 text-xs font-semibold tracking-wide text-ink uppercase">{col.heading}</h2>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-muted transition-colors hover:text-navy-700">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </Container>

      {/* Right padding on mobile keeps text clear of the floating chat/WhatsApp buttons. */}
      <div className="border-t border-line">
        <Container className="flex flex-col gap-1 py-5 pr-24 text-xs text-muted sm:flex-row sm:justify-between sm:pr-28">
          <p>
            &copy; {year} {siteConfig.legalName}. All rights reserved.
          </p>
          <p>Independent parcel service — not affiliated with USPS or any national postal service.</p>
        </Container>
      </div>
    </footer>
  );
}
