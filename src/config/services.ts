/**
 * Service catalogue — single source of truth for the dynamic `/services/[slug]` route.
 *
 * Every tile, nav item and card on the site links to `serviceHref(slug)`. A page can be a
 * "category" (lists `children`) or a "service" (shows `sections` + a call-to-action).
 * `cta.href` points at a real, working flow (tracking or a /tools form) wherever one exists.
 *
 * BACKEND HOOK: swap `SERVICES` for a DB/API lookup in `getService()` and the UI keeps working.
 * Client-safe: no server imports.
 */

export type ServiceSection = { heading: string; body: string };

export type ServiceDef = {
  slug: string;
  title: string;
  summary: string;
  /** Icon from /public/images. */
  icon?: string;
  /** Present on category pages — slugs of the services to list. */
  children?: readonly string[];
  sections?: readonly ServiceSection[];
  cta?: { label: string; href: string };
  related?: readonly string[];
};

export const serviceHref = (slug: string) => `/services/${slug}`;

const SERVICES: readonly ServiceDef[] = [
  /* ── Categories (top navigation) ─────────────────────────── */
  {
    slug: "quick-tools",
    title: "Quick Tools",
    summary: "The most-used tools in one place.",
    children: ["click-n-ship", "buy-stamps", "informed-delivery", "po-boxes", "calculate-price", "hold-mail", "zip-lookup", "change-address", "schedule-pickup"],
  },
  {
    slug: "send",
    title: "Send",
    summary: "Print labels, get a price and arrange pickup.",
    children: ["click-n-ship", "calculate-price", "schedule-pickup", "ground-advantage", "shipping-supplies"],
  },
  {
    slug: "receive",
    title: "Receive",
    summary: "Track, preview and manage what is coming to you.",
    children: ["informed-delivery", "hold-mail", "change-address", "po-boxes", "redelivery"],
  },
  {
    slug: "shop",
    title: "Shop",
    summary: "Stamps, supplies and gifts.",
    children: ["buy-stamps", "shipping-supplies", "gifts", "cards-envelopes"],
  },
  {
    slug: "business",
    title: "Business",
    summary: "Shipping tools that scale with your business.",
    children: ["ground-advantage", "click-n-ship", "shipping-supplies", "schedule-pickup"],
  },
  {
    slug: "international",
    title: "International",
    summary: "Send packages and mail abroad.",
    children: ["customs-forms", "hs-code-search", "eu-requirement", "calculate-price"],
  },

  /* ── Services ────────────────────────────────────────────── */
  {
    slug: "click-n-ship",
    title: "Click-N-Ship®",
    summary: "Pay for postage and print shipping labels from home.",
    icon: "/images/featured_clicknship.svg",
    sections: [
      { heading: "How it works", body: "Enter the sender and recipient, choose a service level, pay online and print your label." },
      { heading: "Free pickup", body: "Schedule a free package pickup from your door once your label is printed." },
    ],
    cta: { label: "Start a shipment", href: "/tools/ship" },
    related: ["schedule-pickup", "calculate-price", "shipping-supplies"],
  },
  {
    slug: "buy-stamps",
    title: "Buy Stamps",
    summary: "Forever® stamps $0.82 · Postcard stamps $0.65.",
    icon: "/images/stamps.svg",
    sections: [
      { heading: "Stamp pricing", body: "Forever stamps are always good for first-class mail, no matter when prices change." },
      { heading: "Collections", body: "Browse seasonal collections, collector sets and personalised stamped envelopes." },
    ],
    cta: { label: "Contact us to order", href: "/contact" },
    related: ["gifts", "cards-envelopes", "shipping-supplies"],
  },
  {
    slug: "informed-delivery",
    title: "Informed Delivery®",
    summary: "Digitally preview your incoming mail and packages.",
    icon: "/images/tracking.svg",
    sections: [
      { heading: "Daily digest", body: "See grayscale images of your incoming letter-sized mail each morning." },
      { heading: "Package tracking", body: "Follow packages headed to you in one dashboard." },
    ],
    cta: { label: "Track a package", href: "/track" },
    related: ["hold-mail", "redelivery", "change-address"],
  },
  {
    slug: "po-boxes",
    title: "PO Boxes™",
    summary: "A secure, private address for your mail and packages.",
    icon: "/images/po_box.svg",
    sections: [
      { heading: "Why a PO Box", body: "Receive mail on your schedule at a locked box you control." },
      { heading: "Sizes", body: "Choose from several box sizes depending on how much mail you receive." },
    ],
    cta: { label: "Ask about a PO Box", href: "/contact" },
    related: ["hold-mail", "change-address"],
  },
  {
    slug: "calculate-price",
    title: "Calculate a Price",
    summary: "Get a shipping quote based on weight, size and destination.",
    icon: "/images/calculate_price.svg",
    sections: [{ heading: "Get a quote", body: "Tell us what you are sending and where, and we reply with available services and prices." }],
    cta: { label: "Get a price quote", href: "/tools/price" },
    related: ["click-n-ship", "schedule-pickup"],
  },
  {
    slug: "hold-mail",
    title: "Hold Mail",
    summary: "Pause delivery while you are away.",
    icon: "/images/holdmail.svg",
    sections: [{ heading: "Going away?", body: "Choose start and end dates and we keep your mail safe until you are back." }],
    cta: { label: "Contact us", href: "/contact" },
    related: ["informed-delivery", "change-address"],
  },
  {
    slug: "zip-lookup",
    title: "ZIP Code™ Lookup",
    summary: "Find the ZIP Code for any address.",
    icon: "/images/find_zip.svg",
    sections: [{ heading: "Find a ZIP Code", body: "Look up a full ZIP+4 code by street address, or find the city for a ZIP Code." }],
    cta: { label: "Ask support", href: "/contact" },
    related: ["change-address", "calculate-price"],
  },
  {
    slug: "change-address",
    title: "Change My Address",
    summary: "Moving soon? Update your address online.",
    icon: "/images/change_address.svg",
    sections: [{ heading: "Before you start", body: "You will need a valid email address to verify your identity." }],
    cta: { label: "Change my address", href: "/tools/change-address" },
    related: ["hold-mail", "po-boxes"],
  },
  {
    slug: "schedule-pickup",
    title: "Schedule a Pickup",
    summary: "Free package pickup from your home or office.",
    icon: "/images/schedule_pickup.svg",
    sections: [{ heading: "How it works", body: "Choose a pickup date and where we should collect — no trip to the counter." }],
    cta: { label: "Schedule a pickup", href: "/tools/pickup" },
    related: ["click-n-ship", "shipping-supplies"],
  },
  {
    slug: "redelivery",
    title: "Schedule a Redelivery",
    summary: "Missed a delivery? Pick a new date.",
    icon: "/images/schedule-redelivery.svg",
    sections: [{ heading: "Track first", body: "Enter your tracking number to see the latest delivery status." }],
    cta: { label: "Track a package", href: "/track" },
    related: ["informed-delivery"],
  },
  {
    slug: "ground-advantage",
    title: "Ground Advantage®",
    summary: "Simplified ground shipping — 2–5 days with tracking included.",
    icon: "/images/mailman.svg",
    sections: [
      { heading: "No hidden fees", body: "Tracking is included in the cost for mailable items up to 70 lbs." },
      { heading: "Delivery time", body: "Expected delivery in 2–5 days. Some destinations and hazardous materials may be slower." },
    ],
    cta: { label: "Get a price quote", href: "/tools/price" },
    related: ["click-n-ship", "schedule-pickup"],
  },
  {
    slug: "shipping-supplies",
    title: "Shipping Supplies",
    summary: "Boxes, envelopes and labels — many are free.",
    icon: "/images/shipping-supplies.svg",
    sections: [{ heading: "Free boxes", body: "Priority Mail® boxes and envelopes are available at no extra charge." }],
    cta: { label: "Contact us", href: "/contact" },
    related: ["click-n-ship", "free-boxes"],
  },
  {
    slug: "free-boxes",
    title: "Free Boxes",
    summary: "Order free shipping boxes delivered to you.",
    icon: "/images/free_boxes.svg",
    sections: [{ heading: "Free shipping boxes", body: "Choose the sizes you need for your next shipment." }],
    cta: { label: "Contact us", href: "/contact" },
    related: ["shipping-supplies"],
  },
  {
    slug: "gifts",
    title: "Gifts",
    summary: "Gift ideas and collectibles.",
    icon: "/images/gifts.svg",
    sections: [{ heading: "Collectibles", body: "Stamp collections, framed art and keepsakes." }],
    cta: { label: "Contact us", href: "/contact" },
    related: ["buy-stamps", "cards-envelopes"],
  },
  {
    slug: "cards-envelopes",
    title: "Cards & Envelopes",
    summary: "Greeting cards and personalised stamped envelopes.",
    icon: "/images/cards-and-envelopes.svg",
    sections: [{ heading: "Personalise", body: "Add your own return address to stamped envelopes." }],
    cta: { label: "Contact us", href: "/contact" },
    related: ["buy-stamps", "gifts"],
  },
  {
    slug: "customs-forms",
    title: "Print Customs Forms",
    summary: "Prepare the forms you need to ship abroad.",
    icon: "/images/printcustomsforms.svg",
    sections: [{ heading: "Declare contents", body: "Complete a customs declaration for international packages." }],
    cta: { label: "Start a shipment", href: "/tools/ship" },
    related: ["hs-code-search", "eu-requirement"],
  },
  {
    slug: "hs-code-search",
    title: "HS Code Search",
    summary: "Find the tariff code for your item.",
    icon: "/images/hs-code-search.svg",
    sections: [{ heading: "Harmonized System codes", body: "Many countries require an HS code on the customs declaration." }],
    cta: { label: "Ask support", href: "/contact" },
    related: ["customs-forms"],
  },
  {
    slug: "eu-requirement",
    title: "New EU Requirement for Packages Up to €150",
    summary: "New import duties and requirements may apply from July 1, 2026.",
    sections: [{ heading: "What changes", body: "When you send merchandise valued up to €150 to a country following EU customs rules, new duties and data requirements may apply." }],
    cta: { label: "Print customs forms", href: serviceHref("customs-forms") },
    related: ["customs-forms", "hs-code-search"],
  },
  {
    slug: "postmarks",
    title: "Postmarks",
    summary: "Get a same-day postmark on your mail.",
    icon: "/images/postmark-home.png",
    sections: [{ heading: "Hand-cancel for free", body: "Ask a retail associate at the counter to hand-cancel your mail so it is postmarked the day you mail it." }],
    cta: { label: "Back to quick tools", href: serviceHref("quick-tools") },
    related: ["buy-stamps"],
  },
  {
    slug: "jobs",
    title: "Careers",
    summary: "Find nationwide opportunities to build your career.",
    sections: [{ heading: "Join the team", body: "Browse openings in delivery, logistics and customer support." }],
    cta: { label: "Contact us", href: "/contact" },
  },
  {
    slug: "anniversary",
    title: "Delivering Since 1775",
    summary: "Celebrating 250 years of delivering for the public.",
    sections: [{ heading: "250 years", body: "Explore the history behind the mail and the people who deliver it." }],
    cta: { label: "Back home", href: "/" },
  },
];

const BY_SLUG = new Map(SERVICES.map((s) => [s.slug, s]));

export function getService(slug: string) {
  return BY_SLUG.get(slug);
}
export function allServices() {
  return SERVICES;
}
