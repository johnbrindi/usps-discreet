import Link from "next/link";
import { siteConfig, whatsappUrl } from "@/config/site";
import { describeSupportHours } from "@/lib/support-hours";
import { Container } from "@/components/ui/card";
import { Logo } from "./logo";

const columns = [
  {
    title: "Tracking",
    links: [
      { href: "/track", label: "Track a parcel" },
      { href: "/help#tracking-numbers", label: "Finding your tracking number" },
      { href: "/help#statuses", label: "What statuses mean" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/help", label: "Help centre" },
      { href: "/contact", label: "Contact us" },
      { href: "/help#scams", label: "Avoiding delivery scams" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of service" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-navy-950 text-navy-100">
      <Container className="grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo inverted />
          <p className="max-w-xs text-sm leading-6 text-navy-100/80">{siteConfig.tagline}.</p>
          <dl className="space-y-1 text-sm text-navy-100/80">
            <div>
              <dt className="sr-only">Support hours</dt>
              <dd>Support: {describeSupportHours()}</dd>
            </div>
            <div>
              <dt className="sr-only">Email</dt>
              <dd>{siteConfig.supportEmail}</dd>
            </div>
            <div>
              <dt className="sr-only">WhatsApp</dt>
              <dd>
                WhatsApp:{" "}
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white">
                  {siteConfig.whatsappDisplay}
                </a>
              </dd>
            </div>
          </dl>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-white uppercase">{col.title}</h2>
            <ul className="space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-navy-100/80 hover:text-white hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-2 py-6 pr-24 text-xs leading-5 text-navy-100/70 sm:pr-28">
          <p>
            © {new Date().getFullYear()} {siteConfig.legalName}. {siteConfig.name} is an independent parcel tracking
            service and is not affiliated with, endorsed by, or acting on behalf of any national postal service or
            government agency.
          </p>
        </Container>
      </div>
    </footer>
  );
}
