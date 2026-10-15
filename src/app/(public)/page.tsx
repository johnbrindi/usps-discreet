import { ArrowRight, Clock3, LifeBuoy, ListOrdered, MessageSquareText, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { RouteIllustration } from "@/components/layout/route-illustration";
import { TrackingForm } from "@/components/tracking/tracking-form";
import { Container } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { describeSupportHours } from "@/lib/support-hours";

const features = [
  {
    icon: ListOrdered,
    title: "Every scan, in order",
    body: "See each recorded event with its location and local time, newest first.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy by default",
    body: "Tracking shows city-level locations only. Names and street addresses are never displayed.",
  },
  {
    icon: Clock3,
    title: "Honest estimates",
    body: "We only show an expected delivery date when a verified source provides one — and we say which.",
  },
];

const shortcuts = [
  { href: "/help#tracking-numbers", icon: ListOrdered, title: "Find your tracking number", body: "Where to look on receipts and emails." },
  { href: "/help#statuses", icon: Clock3, title: "Understand a status", body: "What each tracking status means." },
  { href: "/contact", icon: MessageSquareText, title: "Contact support", body: "Send us a message about a delivery." },
  { href: "/help#scams", icon: LifeBuoy, title: "Avoid delivery scams", body: "How to spot fake delivery texts." },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <div aria-hidden className="absolute inset-y-0 right-0 hidden w-1/2 lg:block">
          <RouteIllustration className="h-full w-full" />
        </div>
        <Container className="relative py-14 sm:py-20 lg:py-24">
          <div className="max-w-xl">
            <p className="mb-3 text-sm font-semibold tracking-wide text-amber-500 uppercase">{siteConfig.name}</p>
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">Where&apos;s my parcel?</h1>
            <p className="mt-4 text-lg leading-8 text-navy-100">
              Enter your tracking number to see the latest status and the full scan history.
            </p>
          </div>
          <div className="mt-8 max-w-2xl rounded-lg bg-white p-5 text-ink shadow-float sm:p-6">
            <TrackingForm />
          </div>
        </Container>
      </section>

      <section aria-labelledby="shortcuts-title" className="border-b border-line bg-surface">
        <Container className="py-10">
          <h2 id="shortcuts-title" className="sr-only">
            Quick help
          </h2>
          <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {shortcuts.map((s) => (
              <li key={s.href} className="bg-white">
                <Link href={s.href} className="group flex h-full gap-3 p-5 hover:bg-navy-50 focus-visible:-outline-offset-3">
                  <s.icon className="mt-0.5 size-5 shrink-0 text-navy-600" aria-hidden />
                  <span>
                    <span className="flex items-center gap-1 font-semibold text-navy-900">
                      {s.title}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                    <span className="mt-1 block text-sm text-muted">{s.body}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="features-title">
        <Container className="py-16 sm:py-20">
          <h2 id="features-title" className="max-w-2xl text-3xl font-bold tracking-tight text-navy-900">
            Clear tracking, without the guesswork
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="border-t-2 border-navy-700 pt-5">
                <f.icon className="size-6 text-navy-700" aria-hidden />
                <h3 className="mt-3 text-lg font-semibold text-navy-900">{f.title}</h3>
                <p className="mt-2 leading-7 text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section aria-labelledby="support-title" className="bg-surface">
        <Container className="flex flex-col items-start justify-between gap-6 py-12 md:flex-row md:items-center">
          <div>
            <h2 id="support-title" className="text-2xl font-bold tracking-tight text-navy-900">
              Need help with a delivery?
            </h2>
            <p className="mt-2 text-muted">
              Our support team is available {describeSupportHours()}. Use the chat button or send us a message.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-navy-700 px-5 font-semibold text-white hover:bg-navy-800"
          >
            Contact support <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Container>
      </section>
    </>
  );
}
