import net from "node:net";
import { CarrierError } from "./types";

// Node gives each resolved address only 250 ms to connect before trying the next ("happy eyeballs").
// On high-latency links to carrier CDNs (Akamai for USPS) IPv4 loses that race and the fallback IPv6
// address is often unroutable, so the request fails with ETIMEDOUT. Allow a realistic connect time.
if (net.getDefaultAutoSelectFamilyAttemptTimeout() < 2_000) net.setDefaultAutoSelectFamilyAttemptTimeout(2_000);

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type Breaker = { failures: number; openUntil: number };
const breakers = new Map<string, Breaker>();
const BREAKER_THRESHOLD = 5;
const BREAKER_OPEN_MS = 60_000;

/** Test hook: clears circuit-breaker state. */
export function resetBreakers() {
  breakers.clear();
}

function parseRetryAfter(header: string | null, now = Date.now()): number | undefined {
  if (!header) return undefined;
  const secs = Number(header);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const at = Date.parse(header);
  return Number.isNaN(at) ? undefined : Math.max(0, at - now);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type RequestOptions = {
  /** Circuit-breaker key, normally the provider id. */
  breakerKey: string;
  fetch?: FetchLike;
  timeoutMs?: number;
  /** Retries after the first attempt, for network errors, timeouts, 5xx and short 429s. */
  retries?: number;
  /** Map a non-2xx response to an error kind before the default handling (e.g. 404 → not_found). */
  classify?: (status: number, body: unknown) => CarrierError | undefined;
  /** Base for exponential backoff between retries. */
  backoffMs?: number;
};

/**
 * JSON request with a per-attempt timeout, bounded retries with jittered exponential backoff,
 * Retry-After support and a per-provider circuit breaker. Error messages never include
 * credentials or response bodies.
 */
export async function requestJson<T = unknown>(url: string, init: RequestInit, opts: RequestOptions): Promise<{ status: number; body: T }> {
  const doFetch = opts.fetch ?? fetch;
  const retries = opts.retries ?? 2;
  const backoff = opts.backoffMs ?? 300;
  const breaker = breakers.get(opts.breakerKey) ?? { failures: 0, openUntil: 0 };
  breakers.set(opts.breakerKey, breaker);

  if (breaker.openUntil > Date.now()) {
    throw new CarrierError("unavailable", `${opts.breakerKey}: circuit open after repeated failures`);
  }

  let lastError: CarrierError | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(backoff * 2 ** (attempt - 1) * (0.5 + Math.random()));
    let res: Response;
    try {
      res = await doFetch(url, {
        ...init,
        headers: { Accept: "application/json", ...init.headers },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 8_000),
        cache: "no-store",
      });
    } catch (err) {
      const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
      lastError = new CarrierError("unavailable", `${opts.breakerKey}: ${timedOut ? "request timed out" : "network error"}`);
      continue;
    }

    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
    }

    if (res.ok) {
      if (text && body === null) {
        lastError = new CarrierError("bad_response", `${opts.breakerKey}: response was not JSON`, { httpStatus: res.status });
        break;
      }
      breaker.failures = 0;
      return { status: res.status, body: body as T };
    }

    const classified = opts.classify?.(res.status, body);
    if (classified) {
      // A definite answer from the carrier (e.g. not found) means the service is healthy.
      breaker.failures = 0;
      throw classified;
    }
    if (res.status === 401 || res.status === 403) {
      throw new CarrierError("auth", `${opts.breakerKey}: credentials rejected (HTTP ${res.status})`, { httpStatus: res.status });
    }
    if (res.status === 429) {
      const retryAfterMs = parseRetryAfter(res.headers.get("retry-after"));
      lastError = new CarrierError("rate_limited", `${opts.breakerKey}: rate limited`, { httpStatus: 429, retryAfterMs });
      // Only wait in-request for short limits; otherwise let the scheduler back off.
      if (retryAfterMs !== undefined && retryAfterMs <= 2_000 && attempt < retries) {
        await sleep(retryAfterMs);
        continue;
      }
      throw lastError;
    }
    if (res.status >= 500) {
      lastError = new CarrierError("unavailable", `${opts.breakerKey}: HTTP ${res.status}`, { httpStatus: res.status });
      continue;
    }
    throw new CarrierError("bad_response", `${opts.breakerKey}: unexpected HTTP ${res.status}`, { httpStatus: res.status });
  }

  if (lastError?.kind === "unavailable") {
    breaker.failures += 1;
    if (breaker.failures >= BREAKER_THRESHOLD) breaker.openUntil = Date.now() + BREAKER_OPEN_MS;
  }
  throw lastError ?? new CarrierError("unavailable", `${opts.breakerKey}: request failed`);
}
