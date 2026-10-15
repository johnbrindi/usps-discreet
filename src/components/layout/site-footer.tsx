import Image from "next/image";
import Link from "next/link";
import { siteConfig, whatsappUrl } from "@/config/site";
import { Container } from "@/components/ui/card";

const footerColumns = [
  {
    heading: "HELPFUL LINKS",
    links: [
      { href: "/contact", label: "Contact Us" },
      { href: "/help", label: "FAQs" },
      { href: "/track", label: "Track a Package" },
    ],
    subHeading: "USPS JOBS",
    subLinks: [
      { href: "/help", label: "Careers" },
    ],
  },
  {
    heading: "ON ABOUT.USPS.COM",
    links: [
      { href: "/help", label: "About USPS Home" },
      { href: "/help", label: "Newsroom" },
      { href: "/help", label: "USPS Service Updates" },
      { href: "/help", label: "Forms & Publications" },
      { href: "/help", label: "Government Services" },
      { href: "/help", label: "Rights & Permissions" },
    ],
  },
  {
    heading: "OTHER USPS SITES",
    links: [
      { href: "/help", label: "Business Customer Gateway" },
      { href: "/help", label: "Postal Inspectors" },
      { href: "/help", label: "Inspector General" },
      { href: "/help", label: "Postal Explorer" },
      { href: "/help", label: "National Postal Museum" },
      { href: "/help", label: "Resources for Developers" },
      { href: "/help", label: "PostalPro" },
    ],
  },
  {
    heading: "LEGAL INFORMATION",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Use" },
      { href: "/privacy", label: "FOIA" },
      { href: "/privacy", label: "No FEAR Act/EEO Contacts" },
      { href: "/privacy", label: "Accessibility Statement" },
    ],
  },
] as const;

const socialLinks = [
  { href: "https://www.facebook.com/USPS/", icon: "/images/facebook_logo.png", label: "USPS on Facebook" },
  { href: "https://www.instagram.com/uspostalservice/", icon: "/images/instagram_logo.png", label: "USPS on Instagram" },
  { href: "https://www.pinterest.com/uspostalservice/", icon: "/images/pinterest_logo.png", label: "USPS on Pinterest" },
  { href: "https://www.threads.net/@uspostalservice", icon: "/images/threads_logo.png", label: "USPS on Threads" },
  { href: "https://twitter.com/USPS", icon: "/images/x_logo.png", label: "USPS on X" },
  { href: "https://www.youtube.com/user/usps", icon: "/images/youtube_logo.png", label: "USPS on YouTube" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-white text-sm">
      {/* ── Main footer columns ── */}
      <div className="border-t border-line py-8">
        <Container className="px-4">
          {/* USPS.COM logo */}
          <div className="mb-6">
            <Image
              src="/images/footer-logo.png"
              alt={siteConfig.name}
              width={180}
              height={22}
              className="h-auto"
            />
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

      {/* ── Copyright + social row ── */}
      <div className="border-t border-line py-5">
        <Container className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Copyright — right-padded on mobile so it doesn't overlap FABs */}
          <p className="text-xs text-muted pr-24 sm:pr-0">
            Copyright &copy; {new Date().getFullYear()} USPS. All Rights Reserved.
            <br className="sm:hidden" />
            <span className="hidden sm:inline"> · </span>
            <span className="block sm:inline text-xs text-muted/80 mt-1 sm:mt-0">
              {siteConfig.name} is an independent tracking service.{" "}
              <Link href="/help" className="text-usps-blue underline underline-offset-2">
                WhatsApp: <span className="font-medium">{siteConfig.whatsappDisplay}</span>
              </Link>
            </span>
          </p>

          {/* Social links */}
          <ul className="flex items-center gap-3 flex-wrap" aria-label="Social media">
            {socialLinks.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="inline-flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity"
                >
                  <Image
                    src={s.icon}
                    alt={s.label}
                    width={28}
                    height={28}
                    className="h-6 w-auto object-contain"
                  />
                </a>
              </li>
            ))}
          </ul>
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
            affiliated with USPS.
          </span>
        </Container>
      </div>
    </footer>
  );
}
