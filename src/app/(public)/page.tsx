import { ArrowRight, Building2, House, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { ToolGrid } from "@/components/tools/tool-grid";
import { TrackingForm } from "@/components/tracking/tracking-form";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/card";
import { siteConfig } from "@/config/site";

/* ─── Featured services ─────────────────────────────────────────────────── */
const featured = [
  {
    icon: House,
    points: ["Book online in minutes", "Label and tracking number by email", "Drop off or schedule a pickup"],
    title: "Ship from home in 3 easy steps",
    body: "Book online, we email your label and tracking number, then drop the parcel off or schedule a pickup.",
    cta: "Book a shipment",
    href: "/tools/ship",
  },
  {
    icon: Building2,
    points: ["Pricing for regular volumes", "Scheduled collections", "One reference for every request"],
    title: "Shipping for your business",
    body: "Sending regularly? Tell us about your parcels and we'll price your shipments and arrange collections.",
    cta: "Get a quote",
    href: "/tools/price",
  },
] as const;

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <>
      {/* ── Hero / tracking search ── */}
      <section aria-labelledby="hero-title" style={{ background: "#003875" }} className="py-12 text-center sm:py-14">
        <Container className="px-4">
          <h1 id="hero-title" className="text-2xl font-bold text-white sm:text-4xl">
            Where&apos;s my parcel?
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/80 sm:text-base">
            Enter your tracking number for a clear, step-by-step status of every shipment.
          </p>
          <div className="mx-auto mt-7 max-w-xl rounded-lg bg-white p-4 text-left shadow-float sm:p-5">
            <TrackingForm size="md" />
          </div>
        </Container>
      </section>

      {/* ── Scam alert strip ── */}
      <section aria-label="Security alert" className="border-b border-line bg-white">
        <Container className="flex items-start gap-3 py-3.5 text-sm">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-usps-red" aria-hidden />
          <p className="text-ink/80">
            <span className="font-semibold text-ink">Scam alert: </span>
            {siteConfig.name} never asks for payment by text message to release a parcel.{" "}
            <Link href="/help#scams" className="font-medium text-navy-700 underline underline-offset-2">
              How to spot a fake message
            </Link>
          </p>
        </Container>
      </section>

      {/* ── Quick tools ── */}
      <section aria-labelledby="quick-tools-title" className="bg-slate-50 py-12 sm:py-14">
        <Container>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="quick-tools-title" className="text-2xl font-bold tracking-tight text-navy-900">
                Quick tools
              </h2>
              <p className="mt-1 text-sm text-muted">Everything you can do online, each with a reference number you can follow up on.</p>
            </div>
            <Link href="/tools" className="inline-flex items-center gap-1 text-sm font-semibold text-navy-700 hover:underline">
              All tools <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <ToolGrid />
        </Container>
      </section>

      {/* ── Featured services ── */}
      <section aria-labelledby="featured-title" className="py-12 sm:py-16">
        <Container>
          <h2 id="featured-title" className="mb-8 text-2xl font-bold tracking-tight text-navy-900">
            Shipping with {siteConfig.name}
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {featured.map((f) => (
              <article key={f.title} className="flex flex-col overflow-hidden rounded-lg border border-line bg-white">
                <div className="flex flex-1 flex-col items-start gap-3 p-6 sm:p-8">
                  <span className="flex size-12 items-center justify-center rounded-lg bg-navy-700 text-white">
                    <f.icon className="size-6" strokeWidth={1.75} aria-hidden />
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-navy-900">{f.title}</h3>
                  <p className="text-sm leading-6 text-muted">{f.body}</p>
                  <ul className="mb-3 space-y-1.5 text-sm text-ink">
                    {f.points.map((pt) => (
                      <li key={pt} className="flex items-center gap-2">
                        <span aria-hidden className="size-1.5 rounded-full bg-amber-500" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                  <Link href={f.href} className={buttonClasses("primary", "md", "mt-auto")}>
                    {f.cta}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Help strip ── */}
      <section aria-labelledby="help-title" className="border-t border-line bg-slate-50 py-12 sm:py-14">
        <Container>
          <h2 id="help-title" className="mb-6 text-2xl font-bold tracking-tight text-navy-900">
            Need help with a delivery?
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { title: "Problem with a parcel", body: "Lost, damaged, delayed or missing items.", href: "/tools/claim", cta: "File a claim" },
              { title: "Moved or away?", body: "Redirect a parcel that hasn't been delivered yet.", href: "/tools/change-address", cta: "Change address" },
              { title: "Something else", body: "Questions about a shipment, billing or our service.", href: "/contact", cta: "Contact support" },
            ].map((c) => (
              <div key={c.title} className="rounded-lg border border-line bg-white p-5">
                <h3 className="font-semibold text-navy-900">{c.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{c.body}</p>
                <Link href={c.href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-navy-700 hover:underline">
                  {c.cta} <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
