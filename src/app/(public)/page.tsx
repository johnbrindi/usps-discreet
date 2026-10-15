import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/card";
import { TrackingForm } from "@/components/tracking/tracking-form";
import { siteConfig } from "@/config/site";

/* ─── Quick-tool tile data ──────────────────────────────────────────────── */
const quickTools = [
  {
    href: "/track",
    icon: "/images/tracking.svg",
    label: "Track a Package",
  },
  {
    href: "/help",
    icon: "/images/calculate_price.svg",
    label: "Calculate a Price",
  },
  {
    href: "/help",
    icon: "/images/change_address.svg",
    label: "Change My Address",
  },
  {
    href: "/help",
    icon: "/images/schedule_pickup.svg",
    label: "Schedule a Pickup",
  },
  {
    href: "/help",
    icon: "/images/featured_clicknship.svg",
    label: "Ship Online",
  },
  {
    href: "/contact",
    icon: "/images/holdmail.svg",
    label: "File a Claim",
  },
] as const;

/* ─── Featured products data ────────────────────────────────────────────── */
const featuredProducts = [
  {
    image: "/images/ship-from-home-1.jpg.jpeg",
    imageAlt: "Shipping supplies and a label printed at home",
    imageW: 675,
    imageH: 450,
    title: "Ship from Home in 3 Easy Steps",
    cta: "Ship Online",
    href: "/help",
  },
  {
    image: "/images/ga-business-03-25.jpg.jpeg",
    imageAlt: "Business owner packing a shipping box",
    imageW: 679,
    imageH: 450,
    title: "Shipping Solutions for Your Business",
    cta: "Learn More",
    href: "/help",
  },
] as const;

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <>
      {/* ── Hero / tracking search ── */}
      <section
        aria-labelledby="hero-title"
        style={{ background: "#003875" }}
        className="py-10 text-center"
      >
        <Container className="px-4">
          <h1 id="hero-title" className="text-2xl font-bold text-white sm:text-3xl">
            Where&apos;s my parcel?
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/85 sm:text-base">
            Enter your tracking number for a clear, step-by-step status of every shipment.
          </p>
          <div className="mx-auto mt-6 max-w-xl rounded-md bg-white p-4 text-left sm:p-5">
            <TrackingForm size="md" />
          </div>
          <Link
            href="/help"
            className="mt-4 inline-block text-sm font-semibold text-white underline underline-offset-4 hover:opacity-80"
          >
            Learn More
          </Link>
        </Container>
      </section>

      {/* ── Scam alert strip ── */}
      <section aria-label="Security alert" className="border-y border-usps-red/20 bg-red-50 py-3">
        <Container className="flex flex-wrap items-start gap-3 px-4 text-sm">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-usps-red">
              Alert: Text &amp; Email Scams
            </p>
            <p className="mt-0.5 text-ink/80">
              If you get a text or email claiming to be from {siteConfig.name} about a package awaiting action or a
              delivery failure, don&apos;t click it: Delete it immediately.{" "}
              <Link href="/help#scams" className="font-medium text-usps-blue underline underline-offset-2">
                Learn how to protect yourself
              </Link>
            </p>
          </div>
        </Container>
      </section>

      {/* ── Quick-tool tiles ── */}
      <section aria-labelledby="quick-tools-title" className="bg-surface">
        <h2 id="quick-tools-title" className="sr-only">
          Quick Tools
        </h2>
        <div className="usps-tile-grid border-t border-line">
          {quickTools.map((tool) => (
            <Link key={`${tool.href}-${tool.label}`} href={tool.href} className="usps-tile border-r border-b border-line last:border-r-0">
              <Image
                src={tool.icon}
                alt=""
                width={48}
                height={48}
                aria-hidden
                className="size-12 object-contain"
              />
              <span>{tool.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Drop-off info strip ── */}
      <section aria-label="Drop-off information" className="border-y border-line bg-surface-blue">
        <Container className="flex items-center gap-5 py-5 px-4">
          <div className="shrink-0">
            <Image
              src="/images/postmark-home.png"
              alt="Shipment ready for pickup"
              width={80}
              height={80}
              className="rounded-full"
            />
          </div>
          <div className="min-w-0 text-sm leading-6 text-ink/90">
            <span className="font-bold">Drop-off receipts: </span>
            If you want a dated receipt for a package you drop off, ask a retail associate at a staffed counter to
            scan and stamp it for you.{" "}
            <Link href="/help" className="font-medium text-usps-blue underline underline-offset-2">
              Learn more
            </Link>
          </div>
        </Container>
      </section>

      {/* ── Featured products & services ── */}
      <section aria-labelledby="featured-title" className="py-10 sm:py-14">
        <Container className="px-4">
          <h2
            id="featured-title"
            className="mb-8 text-center text-2xl font-bold text-ink sm:text-3xl"
          >
            Featured {siteConfig.name} Products &amp; Services
          </h2>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <article
                key={product.title}
                className="usps-feature-card flex flex-col rounded border border-line overflow-hidden shadow-card"
              >
                <div className="relative overflow-hidden bg-surface" style={{ aspectRatio: "16/9" }}>
                  <Image
                    src={product.image}
                    alt={product.imageAlt}
                    width={product.imageW}
                    height={product.imageH}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col items-center gap-4 px-4 py-5 text-center">
                  <h3 className="text-base font-bold text-ink leading-snug">{product.title}</h3>
                  <Link
                    href={product.href}
                    className="mt-auto inline-flex h-10 items-center justify-center rounded bg-usps-blue px-5 text-sm font-semibold text-white transition-colors hover:bg-usps-blue-dark focus-visible:outline-usps-blue"
                  >
                    {product.cta}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Service updates / careers strip ── */}
      <section aria-labelledby="updates-title" className="border-t border-line py-10 sm:py-14">
        <Container className="px-4">
          <h2 id="updates-title" className="mb-6 text-2xl font-bold text-ink">
            Service Updates
          </h2>
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-lg font-bold text-ink">Alert: Text &amp; Email Scams</h3>
              <p className="text-sm leading-6 text-muted">
                If you get a text or email claiming to be from {siteConfig.name} about a package awaiting action or
                a delivery failure, don&apos;t click it: Delete it immediately. This is an attempt to steal your
                personal information.{" "}
              </p>
              <div className="mt-3 space-y-1">
                <Link href="/help#scams" className="block text-sm font-medium text-usps-blue underline underline-offset-2">
                  Text Scams
                </Link>
                <Link href="/help#scams" className="block text-sm font-medium text-usps-blue underline underline-offset-2">
                  Email Scams
                </Link>
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-lg font-bold text-ink">Careers</h3>
              <p className="text-sm leading-6 text-muted">
                Find nationwide opportunities to build your career with {siteConfig.name}.
              </p>
              <Link href="/help" className="mt-3 block text-sm font-medium text-usps-blue underline underline-offset-2">
                Find Out More
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
