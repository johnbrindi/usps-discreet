import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/card";

/* ─────────────────────────────────────────────────────────────
   DATA
───────────────────────────────────────────────────────────── */

/** 3-column feature tiles that sit beneath the hero search bar (reference screenshot row) */
const heroBelowTiles = [
  {
    href: "/track",
    icon: "/images/featured_clicknship.svg",
    title: "Click-N-Ship®",
    body: "Pay for and print shipping labels.",
  },
  {
    href: "/help",
    icon: "/images/stamps.svg",
    title: "Stamps & Supplies",
    body: "Forever® Stamps: $0.82\nPostcard Stamps: $0.65",
  },
  {
    href: "/help",
    icon: "/images/tracking.svg",
    title: "Informed Delivery®",
    body: "Digitally preview your incoming mail.",
  },
] as const;

/** Full 3×3 Quick Tools grid (matches usps.com exactly) */
const quickTools = [
  { href: "/track",   icon: "/images/featured_clicknship.svg", label: "Click-N-Ship®" },
  { href: "/help",    icon: "/images/stamps.svg",              label: "Buy Stamps" },
  { href: "/help",    icon: "/images/tracking.svg",            label: "Informed Delivery®" },
  { href: "/help",    icon: "/images/po_box.svg",              label: "PO Boxes™" },
  { href: "/help",    icon: "/images/calculate_price.svg",     label: "Calculate a Price" },
  { href: "/help",    icon: "/images/holdmail.svg",            label: "Hold Mail" },
  { href: "/help",    icon: "/images/find_zip.svg",            label: "ZIP Code™ Lookup" },
  { href: "/help",    icon: "/images/change_address.svg",      label: "Change My Address" },
  { href: "/help",    icon: "/images/schedule_pickup.svg",     label: "Schedule a Pickup" },
] as const;

/**
 * Featured products — each displayed as image LEFT (or full-width on mobile) + text RIGHT.
 * Matches the reference: diagonal navy block overlaying the photo, title + CTA inside the block.
 */
const featuredProducts = [
  {
    image:    "/images/ship-from-home-1.jpg.jpeg",
    imageAlt: "Shipping label printed at home with USPS Click-N-Ship",
    w: 675, h: 450,
    title:    "Ship from Home in 3 Easy Steps",
    body:     "Use our online Click-N-Ship® service to pay for postage, print your own shipping labels, and schedule a free package pickup.",
    cta:      "Use Click-N-Ship",
    href:     "/track",
  },
  {
    image:    "/images/passport-luggage.jpg.jpeg",
    imageAlt: "Person holding a US passport near luggage",
    w: 679, h: 450,
    title:    "Moving Soon?",
    body:     "Easily change your address online — all you need is a valid email address to verify your identity.",
    cta:      "Change Your Address",
    href:     "/help",
    flip:     true,   // image on RIGHT on desktop
  },
  {
    image:    "/images/ga-business-03-25.jpg.jpeg",
    imageAlt: "Business owner packing a shipping box",
    w: 679, h: 450,
    title:    "USPS Ground Advantage®",
    body:     "Our simplified ground shipping solution helps your business deliver in 2–5 days*, with no hidden fees and USPS Tracking® included in the cost.",
    cta:      "Learn More",
    href:     "/help",
  },
] as const;

/** oct26 stamp + gift images for the USPS Stamps carousel (static in our implementation) */
const stampImages = [
  { src: "/images/oct26-stamps.jpg.jpeg",  alt: "October 2026 stamp collection",  w: 700, h: 280 },
  { src: "/images/oct26-cards.jpg.jpeg",   alt: "October 2026 cards & envelopes", w: 692, h: 280 },
  { src: "/images/oct26-gifts.jpg.jpeg",   alt: "October 2026 gift stamps",        w: 692, h: 280 },
] as const;

/** Go-Now tiles */
const goNow = [
  { href: "/track",   image: "/images/ship-go-now.png",           imageAlt: "Ship",          label: "Ship a Package" },
  { href: "/track",   image: "/images/manage-go-now.png",         imageAlt: "Manage",        label: "Manage Deliveries" },
  { href: "/help",    image: "/images/business-go-now.png",       imageAlt: "Business",      label: "Business" },
  { href: "/help",    image: "/images/store-go-now.png",          imageAlt: "Store",         label: "The Postal Store" },
  { href: "/help",    image: "/images/international-go-now.png",  imageAlt: "International", label: "International" },
] as const;

/* ─────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <>
      {/* ════════════════════════════════════════════════════════
          HERO  —  USPS Ground Advantage banner image + overlay
      ════════════════════════════════════════════════════════ */}
      <section aria-labelledby="hero-title" className="relative overflow-hidden">
        {/* Full-bleed hero image */}
        <div className="relative" style={{ minHeight: 200 }}>
          <Image
            src="/images/ga-business-03-25.jpg.jpeg"
            alt="Ship with USPS Ground Advantage"
            width={679}
            height={450}
            className="w-full object-cover object-center"
            style={{ maxHeight: 360 }}
            priority
          />
          {/* Navy diagonal overlay panel — left side on desktop */}
          <div
            className="absolute inset-y-0 left-0 flex w-full flex-col justify-center px-6 py-8 md:w-[46%] md:px-10"
            style={{
              background: "linear-gradient(135deg, #003875 72%, transparent 100%)",
            }}
          >
            <h1 id="hero-title" className="text-xl font-bold leading-tight text-white sm:text-2xl md:text-3xl">
              Ship with USPS Ground Advantage<sup className="text-base">®</sup>
            </h1>
            <p className="mt-2 max-w-xs text-sm leading-6 text-white/85 md:text-base">
              Our simplified ground shipping solution helps your business deliver in 2–5 days*, with no hidden
              fees and USPS Tracking<sup className="text-xs">®</sup> included in the cost.
            </p>
            <Link
              href="/help"
              className="mt-5 inline-flex w-fit items-center justify-center rounded border-2 border-white px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-white hover:text-usps-blue"
            >
              Learn More
            </Link>
            <p className="mt-3 text-[10px] leading-4 text-white/60">
              *For mailable items up to 70 lbs. Expected delivery in 2–5 days.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          SEARCH + 3 FEATURE TILES  (reference "Search or Track" row)
      ════════════════════════════════════════════════════════ */}
      <section aria-labelledby="search-track-title" className="border-b border-t border-line bg-white py-6">
        <Container className="px-4">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr_1fr_1fr] lg:gap-0 lg:divide-x lg:divide-line">

            {/* Search / Track pane */}
            <div className="flex flex-col justify-center lg:pr-8">
              <h2 id="search-track-title" className="text-lg font-bold text-ink sm:text-xl">
                Search or Track Packages
              </h2>
              <form
                action="/track"
                method="get"
                role="search"
                aria-label="Track a package"
                className="mt-3 flex items-stretch"
              >
                <label className="sr-only" htmlFor="hero-track-input">
                  Search USPS.com or Enter Tracking Number(s)
                </label>
                <input
                  id="hero-track-input"
                  name="trackingNumber"
                  type="text"
                  placeholder="Search USPS.com or Enter Tracking Number(s)"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className="h-10 min-w-0 flex-1 rounded-l border border-line-strong bg-white px-3 text-sm text-ink placeholder:text-muted/60 focus:border-usps-blue focus:outline-none focus:ring-2 focus:ring-usps-blue/20"
                />
                <button
                  type="submit"
                  aria-label="Search"
                  className="inline-flex h-10 items-center rounded-r border border-l-0 border-line-strong bg-white px-3 transition-colors hover:bg-surface"
                >
                  <Image src="/images/search.svg" alt="" width={18} height={18} aria-hidden />
                </button>
              </form>
            </div>

            {/* 3 feature tiles */}
            {heroBelowTiles.map((tile) => (
              <Link
                key={tile.title}
                href={tile.href}
                className="flex items-start gap-4 px-6 py-2 transition-colors hover:bg-surface lg:py-0"
              >
                <Image
                  src={tile.icon}
                  alt=""
                  width={48}
                  height={48}
                  aria-hidden
                  className="mt-1 h-10 w-10 shrink-0 object-contain"
                />
                <div className="min-w-0">
                  <p className="font-bold text-usps-blue">{tile.title}</p>
                  <p className="mt-0.5 whitespace-pre-line text-sm leading-5 text-muted">{tile.body}</p>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* ════════════════════════════════════════════════════════
          QUICK-TOOL TILES  — 3×3 grid
      ════════════════════════════════════════════════════════ */}
      <section aria-labelledby="quick-tools-title" className="bg-[#f5f5f5]">
        <Container className="px-0">
          <h2 id="quick-tools-title" className="sr-only">Quick Tools</h2>
          <div
            className="grid border-l border-t border-line"
            style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
          >
            {quickTools.map((tool) => (
              <Link
                key={tool.label}
                href={tool.href}
                className="flex flex-col items-center gap-3 border-b border-r border-line bg-[#f5f5f5] px-3 py-6 text-center text-sm font-bold text-usps-blue transition-colors hover:bg-[#e8eef7] hover:underline focus-visible:-outline-offset-2 sm:py-8"
              >
                <Image
                  src={tool.icon}
                  alt=""
                  width={52}
                  height={52}
                  aria-hidden
                  className="h-12 w-12 object-contain"
                />
                <span>{tool.label}</span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* ════════════════════════════════════════════════════════
          POSTMARKS STRIP
      ════════════════════════════════════════════════════════ */}
      <section aria-label="Postmarks information" className="border-b border-t border-line bg-[#dce8f0]">
        <Container className="flex items-center gap-4 px-4 py-4 sm:gap-6">
          <div className="shrink-0">
            <Image
              src="/images/postmark-home.png"
              alt="USPS postmark stamp"
              width={80}
              height={80}
              className="h-16 w-16 rounded-full object-contain sm:h-20 sm:w-20"
            />
          </div>
          <p className="text-sm leading-6 text-ink/90">
            <strong>Postmarks: </strong>
            If you want to ensure that your mail receives a postmark on the day you mail it, ask a retail
            associate at a Post Office retail counter to hand-cancel it for free.{" "}
            <Link href="/help" className="font-medium text-usps-blue underline underline-offset-2">
              Learn more
            </Link>
          </p>
        </Container>
      </section>

      {/* ════════════════════════════════════════════════════════
          FEATURED USPS PRODUCTS & SERVICES
          Each card: full-width image | diagonal navy panel | CTA
      ════════════════════════════════════════════════════════ */}
      <section aria-labelledby="featured-title" className="bg-white py-10 sm:py-12">
        <Container className="px-4">
          <h2 id="featured-title" className="mb-8 text-center text-2xl font-bold text-ink sm:text-3xl">
            Featured USPS<sup className="text-base">®</sup> Products &amp; Services
          </h2>

          <div className="space-y-6">
            {featuredProducts.map((p) => (
              <div
                key={p.title}
                className={`grid overflow-hidden rounded border border-line bg-white shadow-card md:grid-cols-2 ${"flip" in p && p.flip ? "md:[&>*:first-child]:order-2" : ""}`}
              >
                {/* Image half */}
                <div className="relative overflow-hidden bg-surface" style={{ minHeight: 200 }}>
                  <Image
                    src={p.image}
                    alt={p.imageAlt}
                    width={p.w}
                    height={p.h}
                    className="h-full w-full object-cover object-center"
                  />
                </div>
                {/* Text half — navy panel */}
                <div
                  className="flex flex-col justify-center px-6 py-8 sm:px-10"
                  style={{ background: "#003875" }}
                >
                  <h3 className="text-xl font-bold leading-tight text-white sm:text-2xl">{p.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/80">{p.body}</p>
                  <Link
                    href={p.href}
                    className="mt-5 inline-flex w-fit items-center justify-center rounded bg-white px-5 py-2 text-sm font-bold text-usps-blue transition-colors hover:bg-navy-50"
                  >
                    {p.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ════════════════════════════════════════════════════════
          USPS STAMPS SHOWCASE  — oct26 promo + stamp pricing
      ════════════════════════════════════════════════════════ */}
      <section aria-labelledby="stamps-title" className="border-t border-line bg-[#f5f5f5] py-10 sm:py-12">
        <Container className="px-4">
          <div className="mx-auto max-w-xl text-center">
            {/* Stamp images row */}
            <div className="flex items-center justify-center gap-1 sm:gap-2">
              {stampImages.map((s) => (
                <div key={s.src} className="overflow-hidden rounded border border-line bg-white shadow-card" style={{ flex: 1 }}>
                  <Image
                    src={s.src}
                    alt={s.alt}
                    width={s.w}
                    height={s.h}
                    className="w-full object-cover"
                  />
                </div>
              ))}
            </div>
            <h2 id="stamps-title" className="mt-5 text-xl font-bold text-ink sm:text-2xl">
              USPS Stamps
            </h2>
            <p className="mt-1 text-sm text-muted">
              Our stamps celebrate life, art, and culture. Find your favorites online.
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">
              Stamp Pricing:{" "}
              <span className="font-normal">
                Forever: <strong>$0.82</strong> | Postcard: <strong>$0.65</strong>
              </span>
            </p>
            <Link
              href="/help"
              className="mt-4 inline-flex h-10 w-40 items-center justify-center rounded bg-usps-blue px-5 text-sm font-bold text-white transition-colors hover:bg-usps-blue-dark"
            >
              Shop Now
            </Link>
          </div>
        </Container>
      </section>

      {/* ════════════════════════════════════════════════════════
          250th ANNIVERSARY PROMO BANNER
      ════════════════════════════════════════════════════════ */}
      <section aria-label="250th anniversary promotion" className="overflow-hidden">
        {/* Desktop wide banner */}
        <div className="hidden md:block">
          <Image
            src="/images/250-landing-promo.png"
            alt="Delivering Since 1775 — Celebrate 250 years of USPS! Explore Now."
            width={1400}
            height={150}
            className="w-full object-cover"
          />
        </div>
        {/* Mobile portrait banner */}
        <div className="md:hidden">
          <Image
            src="/images/250-landing-promo-m.png"
            alt="Delivering Since 1775 — Celebrate 250 years of USPS! Explore Now."
            width={390}
            height={300}
            className="w-full object-cover"
          />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          USPS UPDATES — 3 columns matching reference screenshot
      ════════════════════════════════════════════════════════ */}
      <section aria-labelledby="updates-title" className="border-t border-line bg-white py-10 sm:py-12">
        <Container className="px-4">
          <h2 id="updates-title" className="mb-8 text-center text-2xl font-bold text-ink">
            USPS Updates
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Scam alerts */}
            <div>
              <h3 className="mb-2 text-base font-bold text-ink">Alert: Text &amp; Email Scams</h3>
              <p className="text-sm leading-6 text-muted">
                If you get a text or email claiming to be from USPS about a package awaiting action or a
                delivery failure, don&apos;t click it: Delete it immediately. This is an attempt to steal your
                personal information. Find out how to protect yourself.
              </p>
              <div className="mt-3 space-y-1.5">
                <Link href="/help#scams" className="block text-sm font-medium text-usps-blue underline underline-offset-2">
                  Text Scams
                </Link>
                <Link href="/help#scams" className="block text-sm font-medium text-usps-blue underline underline-offset-2">
                  Email Scams
                </Link>
              </div>
            </div>

            {/* EU import rule */}
            <div>
              <h3 className="mb-2 text-base font-bold text-ink">New EU Requirement for Packages Up to €150</h3>
              <p className="text-sm leading-6 text-muted">
                Starting July 1, 2026, when you send a package with merchandise valued up to €150 to a country
                that follows European Union (EU) customs rules, new import duties and requirements may apply.
              </p>
              <Link href="/help" className="mt-3 inline-block text-sm font-medium text-usps-blue underline underline-offset-2">
                Learn More
              </Link>
            </div>

            {/* Jobs */}
            <div>
              <h3 className="mb-2 text-base font-bold text-ink">Jobs with USPS</h3>
              <p className="text-sm leading-6 text-muted">
                Find nationwide opportunities to build your career while serving the American public.
              </p>
              <Link href="/help" className="mt-3 inline-block text-sm font-medium text-usps-blue underline underline-offset-2">
                Find Out More
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* ════════════════════════════════════════════════════════
          GO-NOW QUICK-ACCESS TILES
      ════════════════════════════════════════════════════════ */}
      <section aria-labelledby="gonow-title" className="border-t border-line bg-[#f5f5f5] py-10 sm:py-12">
        <Container className="px-4">
          <h2 id="gonow-title" className="sr-only">Quick Access</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {goNow.map((tile) => (
              <Link
                key={tile.label}
                href={tile.href}
                className="flex w-28 flex-col items-center gap-2 rounded border border-line bg-white p-3 text-center text-xs font-bold text-usps-blue transition-colors hover:border-usps-blue hover:bg-[#e8eef7] sm:w-36 sm:p-4 sm:text-sm"
              >
                <Image
                  src={tile.image}
                  alt={tile.imageAlt}
                  width={195}
                  height={167}
                  className="h-16 w-16 object-contain sm:h-20 sm:w-20"
                />
                <span>{tile.label}</span>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
