import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/card";
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
    icon: "/images/stamps.svg",
    label: "Buy Stamps",
  },
  {
    href: "/help",
    icon: "/images/featured_clicknship.svg",
    label: "Click-N-Ship\u00ae",
  },
  {
    href: "/help",
    icon: "/images/po_box.svg",
    label: "PO Boxes\u2122",
  },
  {
    href: "/help",
    icon: "/images/calculate_price.svg",
    label: "Calculate a Price",
  },
  {
    href: "/help",
    icon: "/images/holdmail.svg",
    label: "Hold Mail",
  },
  {
    href: "/help",
    icon: "/images/find_zip.svg",
    label: "ZIP Code\u2122 Lookup",
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
] as const;

/* ─── Featured products data ────────────────────────────────────────────── */
const featuredProducts = [
  {
    image: "/images/oct26-stamps.jpg.jpeg",
    imageAlt: "October 2026 stamp collection",
    imageW: 700,
    imageH: 280,
    title: "New Stamp Releases",
    cta: "Shop Now",
    href: "/help",
  },
  {
    image: "/images/ship-from-home-1.jpg.jpeg",
    imageAlt: "Shipping supplies and label printed at home",
    imageW: 675,
    imageH: 450,
    title: "Ship from Home in 3 Easy Steps",
    cta: "Use Click-N-Ship",
    href: "/help",
  },
  {
    image: "/images/passport-luggage.jpg.jpeg",
    imageAlt: "Person holding US passport near luggage",
    imageW: 679,
    imageH: 450,
    title: "Need a New Passport?",
    cta: "Schedule an Appointment",
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
      {/* ── Hero / Informed Delivery banner ── */}
      <section
        aria-labelledby="hero-title"
        style={{ background: "#003875" }}
        className="py-10 text-center"
      >
        {/* Desktop wide banner image */}
        <div className="hidden md:block relative w-full overflow-hidden" style={{ maxHeight: "120px" }}>
          <Image
            src="/images/id26-17.jpg.jpeg"
            alt="Informed Delivery — track your mail and packages"
            width={1798}
            height={400}
            className="w-full object-cover"
            style={{ maxHeight: "120px", objectPosition: "center" }}
            priority
          />
        </div>

        {/* Mobile banner image */}
        <div className="md:hidden relative w-full overflow-hidden" style={{ maxHeight: "100px" }}>
          <Image
            src="/images/id26-17-m.jpg.jpeg"
            alt="Informed Delivery — track your mail and packages"
            width={990}
            height={225}
            className="w-full object-cover"
            style={{ maxHeight: "100px", objectPosition: "center" }}
            priority
          />
        </div>

        {/* Text content below banner image */}
        <div className="px-4 pt-8 pb-4">
          <h1 id="hero-title" className="text-2xl font-bold text-white sm:text-3xl">
            Informed Delivery<sup>®</sup> at Your Fingertips
          </h1>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/help"
              className="inline-flex h-10 items-center justify-center rounded border-2 border-white px-6 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-usps-blue focus-visible:outline-white"
            >
              Get the App
            </Link>
            <Link
              href="/help"
              className="text-sm font-semibold text-white underline underline-offset-4 hover:opacity-80"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* ── Scam alert strip ── */}
      <section aria-label="Security alert" className="border-y border-usps-red/20 bg-red-50 py-3">
        <Container className="flex flex-wrap items-start gap-3 px-4 text-sm">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-usps-red">
              Alert: Text &amp; Email Scams
            </p>
            <p className="mt-0.5 text-ink/80">
              If you get a text or email claiming to be from USPS about a package awaiting action or a delivery failure,
              don&apos;t click it: Delete it immediately.{" "}
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

      {/* ── Postmarks info strip ── */}
      <section aria-label="Postmarks information" className="border-y border-line bg-surface-blue">
        <Container className="flex items-center gap-5 py-5 px-4">
          <div className="shrink-0">
            <Image
              src="/images/postmark-home.png"
              alt="USPS postmark stamp"
              width={80}
              height={80}
              className="rounded-full"
            />
          </div>
          <div className="min-w-0 text-sm leading-6 text-ink/90">
            <span className="font-bold">Postmarks: </span>
            If you want to ensure that your mail receives a postmark on the day you mail it, ask a retail associate at a
            Post Office retail counter to hand-cancel it for free.{" "}
            <Link href="/help" className="font-medium text-usps-blue underline underline-offset-2">
              Learn more
            </Link>
          </div>
        </Container>
      </section>

      {/* ── Featured USPS Products & Services ── */}
      <section aria-labelledby="featured-title" className="py-10 sm:py-14">
        <Container className="px-4">
          <h2
            id="featured-title"
            className="mb-8 text-center text-2xl font-bold text-ink sm:text-3xl"
          >
            Featured {siteConfig.name}<sup>®</sup> Products &amp; Services
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

      {/* ── Promotional banner strip ── */}
      <section aria-label="Promotional offer" className="overflow-hidden">
        <div className="relative hidden md:block">
          <Image
            src="/images/250-landing-promo.png"
            alt="Current USPS promotional offer"
            width={1400}
            height={150}
            className="w-full object-cover"
          />
        </div>
        <div className="relative md:hidden">
          <Image
            src="/images/250-landing-promo-m.png"
            alt="Current USPS promotional offer"
            width={390}
            height={300}
            className="w-full object-cover"
          />
        </div>
      </section>

      {/* ── USPS Updates / Jobs strip ── */}
      <section aria-labelledby="updates-title" className="border-t border-line py-10 sm:py-14">
        <Container className="px-4">
          <h2 id="updates-title" className="mb-6 text-2xl font-bold text-ink">
            USPS Updates
          </h2>
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-lg font-bold text-ink">Alert: Text &amp; Email Scams</h3>
              <p className="text-sm leading-6 text-muted">
                If you get a text or email claiming to be from USPS about a package awaiting action or a delivery
                failure, don&apos;t click it: Delete it immediately. This is an attempt to steal your personal
                information.{" "}
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
              <h3 className="mb-2 text-lg font-bold text-ink">Jobs with USPS</h3>
              <p className="text-sm leading-6 text-muted">
                Find nationwide opportunities to build your career while serving the American public.
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
