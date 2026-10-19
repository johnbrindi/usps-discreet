import { Mail } from "lucide-react";
import Image from "next/image";
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

// Social icons driven by NEXT_PUBLIC_SOCIAL_* env vars. Icon hidden when env var is absent.
const social = [
  { src: "/images/facebook_logo.png", label: "Facebook", href: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK },
  { src: "/images/x_logo.png", label: "X", href: process.env.NEXT_PUBLIC_SOCIAL_X },
  { src: "/images/instagram_logo.png", label: "Instagram", href: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM },
  { src: "/images/youtube_logo.png", label: "YouTube", href: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE },
  { src: "/images/pinterest_logo.png", label: "Pinterest", href: process.env.NEXT_PUBLIC_SOCIAL_PINTEREST },
  { src: "/images/threads_logo.png", label: "Threads", href: process.env.NEXT_PUBLIC_SOCIAL_THREADS },
].filter((s) => Boolean(s.href));

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto bg-[#333366] text-sm text-white">
      <Container className="grid gap-10 py-12 lg:grid-cols-[16rem_1fr]">
        <div className="space-y-4">
          <Logo inverted />
          <ul className="space-y-2">
            <li>
              <a href={`mailto:${siteConfig.supportEmail}`} className="inline-flex items-center gap-2 break-all hover:underline">
                <Mail className="size-4 shrink-0" aria-hidden /> {siteConfig.supportEmail}
              </a>
            </li>
            <li>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:underline">
                <WhatsAppIcon className="size-4 shrink-0" /> {siteConfig.whatsappDisplay}
              </a>
            </li>
            <li className="text-xs text-white/70">Support: {describeSupportHours()}</li>
          </ul>
          {social.length > 0 && (
          <ul className="flex flex-wrap gap-3 pt-2">
            {social.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex size-9 items-center justify-center rounded-full bg-white transition-opacity hover:opacity-80"
                >
                  <Image src={s.src} alt="" width={24} height={24} className="size-6 object-contain" />
                </a>
              </li>
            ))}
          </ul>
          )}
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {footerColumns.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h2 className="mb-3 text-xs font-semibold tracking-wide uppercase">{col.heading}</h2>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-white/80 transition-colors hover:text-white hover:underline">
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
      <div className="border-t border-white/20">
        <Container className="flex flex-col gap-1 py-5 pr-24 text-xs text-white/70 sm:flex-row sm:justify-between sm:pr-28">
          <p>
            &copy; {year} {siteConfig.legalName}. All rights reserved.
          </p>
        </Container>
      </div>
    </footer>
  );
}
