/**
 * Brand & contact configuration.
 * All NEXT_PUBLIC_* env vars override these defaults.
 */
const env = (key: string, fallback: string) => process.env[key]?.trim() || fallback;

export const siteConfig = {
  name:        env("NEXT_PUBLIC_BRAND_NAME",        "USPS"),
  shortName:   env("NEXT_PUBLIC_BRAND_SHORT_NAME",  "USPS"),
  tagline:     env("NEXT_PUBLIC_BRAND_TAGLINE",     "Delivering for America"),
  description: env(
    "NEXT_PUBLIC_BRAND_DESCRIPTION",
    "Track your packages, ship from home, buy stamps, and access all USPS services online.",
  ),
  url: env(
    "NEXT_PUBLIC_SITE_URL",
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000",
  ),
  supportEmail:    env("NEXT_PUBLIC_SUPPORT_EMAIL",    "support@usps.com"),
  /** E.164 digits only — used to build the wa.me link. */
  whatsappNumber:  env("NEXT_PUBLIC_WHATSAPP_NUMBER",  "18603983750"),
  whatsappDisplay: env("NEXT_PUBLIC_WHATSAPP_DISPLAY", "+1 860 398 3750"),
  chatAgentName:   env("NEXT_PUBLIC_CHAT_AGENT_NAME",  "James"),
  /** Legal entity shown in the footer. */
  legalName:       env("NEXT_PUBLIC_LEGAL_NAME",       "United States Postal Service"),
} as const;

/** Staffed support hours. Default 24/7. */
export const supportHours = {
  timeZone: env("NEXT_PUBLIC_SUPPORT_TIMEZONE", "America/New_York"),
  /** 0 = Sunday … 6 = Saturday */
  days:      [0, 1, 2, 3, 4, 5, 6],
  openHour:  Number(env("NEXT_PUBLIC_SUPPORT_OPEN_HOUR",  "0")),
  closeHour: Number(env("NEXT_PUBLIC_SUPPORT_CLOSE_HOUR", "24")),
} as const;

export const whatsappUrl = `https://wa.me/${siteConfig.whatsappNumber.replace(/\D/g, "")}`;

export const mainNav = [
  { href: "/track",   label: "Quick Tools" },
  { href: "/track",   label: "Send" },
  { href: "/track",   label: "Receive" },
  { href: "/help",    label: "Shop" },
  { href: "/help",    label: "Business" },
  { href: "/help",    label: "International" },
  { href: "/help",    label: "Help" },
] as const;
