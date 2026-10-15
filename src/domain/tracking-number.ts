/** Tracking numbers: 10–34 letters/digits after normalization. Spaces and dashes are ignored. */
export const TRACKING_NUMBER_PATTERN = /^[A-Z0-9]{10,34}$/;

export function normalizeTrackingNumber(input: string) {
  return input.replace(/[\s-]+/g, "").toUpperCase();
}

export function isValidTrackingNumber(input: string) {
  return TRACKING_NUMBER_PATTERN.test(normalizeTrackingNumber(input));
}

/** Readable grouping, e.g. "MP12 3456 7890 1234 5678". Display only. */
export function formatTrackingNumber(value: string) {
  return value.replace(/(.{4})(?=.)/g, "$1 ");
}

/** Accepts several numbers separated by commas or new lines (max `limit`). */
export function splitTrackingNumbers(input: string, limit = 10) {
  const seen = new Set<string>();
  for (const part of input.split(/[,\n;]+/)) {
    const n = normalizeTrackingNumber(part);
    if (n) seen.add(n);
  }
  return [...seen].slice(0, limit);
}
