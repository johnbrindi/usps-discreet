/**
 * Brand & contact configuration. Every value can be overridden with NEXT_PUBLIC_* env
 * variables so the app can be adapted to the operator's own, authorized brand.
 * "Meridian Parcel" is a neutral placeholder name — replace it before launch.
 */
const env = (key: string, fallback: string) => process.env[key]?.trim() || fallback;

export const siteConfig = {
  name: env("NEXT_PUBLIC_BRAND_NAME", "Meridian Parcel"),
  shortName: env("NEXT_PUBLIC_BRAND_SHORT_NAME", "Meridian"),
  tagline: env("NEXT_PUBLIC_BRAND_TAGLINE", "Parcel tracking you can rely on"),
  description: env(
    "NEXT_PUBLIC_BRAND_DESCRIPTION",
    "Track your parcel, see every scan in order, and reach our support team when you need help.",
  ),
  url: env(
    "NEXT_PUBLIC_SITE_URL",
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000",
  ),
  supportEmail: env("NEXT_PUBLIC_SUPPORT_EMAIL", "support@example.com"),
  /** E.164 digits only, used to build the wa.me link. */
  whatsappNumber: env("NEXT_PUBLIC_WHATSAPP_NUMBER", "18603983750"),
  whatsappDisplay: env("NEXT_PUBLIC_WHATSAPP_DISPLAY", "+1 860 398 3750"),
  chatAgentName: env("NEXT_PUBLIC_CHAT_AGENT_NAME", "James"),
  /** Legal entity shown in the footer and policies. */
  legalName: env("NEXT_PUBLIC_LEGAL_NAME", "Meridian Parcel (placeholder operator)"),
} as const;

/** Staffed support hours. Drives the chat availability indicator — no fake "online" badge. */
export const supportHours = {
  timeZone: env("NEXT_PUBLIC_SUPPORT_TIMEZONE", "America/New_York"),
  /** 0 = Sunday … 6 = Saturday */
  days: [1, 2, 3, 4, 5],
  openHour: Number(env("NEXT_PUBLIC_SUPPORT_OPEN_HOUR", "8")),
  closeHour: Number(env("NEXT_PUBLIC_SUPPORT_CLOSE_HOUR", "18")),
} as const;

export const whatsappUrl = `https://wa.me/${siteConfig.whatsappNumber.replace(/\D/g, "")}`;

export const mainNav = [
  { href: "/track", label: "Track" },
  { href: "/tools", label: "Quick Tools" },
  { href: "/help", label: "Help" },
  { href: "/contact", label: "Contact" },
] as const;
