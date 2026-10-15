export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatPlace(parts: { city?: string | null; region?: string | null; country?: string | null }) {
  return [parts.city, parts.region, parts.country].filter(Boolean).join(", ");
}
