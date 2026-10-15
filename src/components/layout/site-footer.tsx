import Link from "next/link";
import { siteConfig, whatsappUrl } from "@/config/site";
import { Container } from "@/components/ui/card";
import { Logo } from "./logo";

const footerColumns = [
  {
    heading: "HELPFUL LINKS",
    links: [
      { href: "/contact", label: "Contact Us" },
      { href: "/help", label: "FAQs" },
      { href: "/track", label: "Track a Package" },
    ],
    subHeading: "CAREERS",
    subLinks: [
      { href: "/help", label: "Careers" },
    ],
  },
  {
    heading: "COMPANY",
    links: [
      { href: "/help", label: "About Us" },
      { href: "/help", label: "Newsroom" },
      { href: "/help", label: "Service Updates" },
      { href: "/help", label: "Forms & Publications" },
    ],
  },
  {
    heading: "RESOURCES",
    links: [
      { href: "/help", label: "Business Customer Gateway" },
      { href: "/help", label: "Report Fraud" },
      { href: "/help", label: "Resources for Developers" },
      { href: "/contact", label: "Contact Support" },
    ],
  },
  {
    heading: "LEGAL INFORMATION",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Use" },
      { href: "/privacy", label: "Accessibility Statement" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-white text-sm">
      {/* ── Main footer columns ── */}
      <div className="border-t border-line py-8">
        <Container className="px-4">
          {/* Site logo */}
          <div className="mb-6">
            <Logo />
          </div>

          {/* 4-column grid */}
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {footerColumns.map((col) => (
              <div key={col.heading}>
                <h2 className="mb-3 text-xs font-bold tracking-wider text-ink uppercase">
                  {col.heading}
                </h2>
                <ul className="space-y-1.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-usps-blue hover:underline underline-offset-2"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                {"subHeading" in col && col.subHeading && (
                  <div className="mt-5">
                    <h2 className="mb-3 text-xs font-bold tracking-wider text-ink uppercase">
                      {col.subHeading}
                    </h2>
                    <ul className="space-y-1.5">
                      {col.subLinks?.map((l) => (
                        <li key={l.label}>
                          <Link
                            href={l.href}
                            className="text-usps-blue hover:underline underline-offset-2"
                          >
                            {l.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Container>
      </div>

      {/* ── Copyright row ── */}
      <div className="border-t border-line py-5">
        <Container className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Copyright — right-padded on mobile so it doesn't overlap FABs */}
          <p className="text-xs text-muted pr-24 sm:pr-0">
            Copyright &copy; {new Date().getFullYear()} {siteConfig.legalName}. All Rights Reserved.
            <br className="sm:hidden" />
            <span className="hidden sm:inline"> · </span>
            <span className="block sm:inline text-xs text-muted/80 mt-1 sm:mt-0">
              {siteConfig.name} is an independent tracking service.{" "}
              <Link href="/help" className="text-usps-blue underline underline-offset-2">
                WhatsApp: <span className="font-medium">{siteConfig.whatsappDisplay}</span>
              </Link>
            </span>
          </p>
        </Container>
      </div>

      {/* ── WhatsApp contact ── */}
      <div className="border-t border-line bg-navy-950 py-3">
        <Container className="flex flex-wrap items-center gap-2 px-4 pr-28 text-xs text-navy-100/80 sm:pr-8">
          <span>WhatsApp support:</span>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-whatsapp hover:underline"
          >
            {siteConfig.whatsappDisplay}
          </a>
          <span className="text-navy-100/50">·</span>
          <span>
            &copy; {new Date().getFullYear()} {siteConfig.legalName}. Independent tracking service — not operated by or
            affiliated with USPS or any national postal service.
          </span>
        </Container>
      </div>
    </footer>
  );
}
