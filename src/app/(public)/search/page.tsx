import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/card";
import { allServices, serviceHref } from "@/config/services";
import { normalizeTrackingNumber, isValidTrackingNumber, splitTrackingNumbers } from "@/domain/tracking-number";

type Props = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = (await searchParams).q?.trim() ?? "";
  return {
    title: q ? `Search: ${q}` : "Search",
    description: "Search for services or enter a tracking number.",
    robots: { index: false, follow: false },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const q = ((await searchParams).q ?? "").trim();

  // If it looks like one or more tracking numbers, redirect immediately
  if (q) {
    const numbers = splitTrackingNumbers(q, 10);
    if (numbers.length === 1 && isValidTrackingNumber(q)) {
      redirect(`/track/${encodeURIComponent(normalizeTrackingNumber(q))}`);
    }
    if (numbers.length > 1 && numbers.every((n) => isValidTrackingNumber(n))) {
      // Multiple tracking numbers → tracking list page
      redirect(`/track?trackingNumber=${encodeURIComponent(numbers[0]!)}`);
    }
  }

  // Service search
  const lower = q.toLowerCase();
  const results =
    q.length >= 2
      ? allServices().filter(
          (s) =>
            s.title.toLowerCase().includes(lower) ||
            s.summary.toLowerCase().includes(lower) ||
            s.slug.toLowerCase().includes(lower),
        )
      : [];

  return (
    <>
      <div className="border-b border-line bg-surface">
        <Container className="py-8 sm:py-10">
          <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
            {q ? `Search results for "${q}"` : "Search"}
          </h1>
          {q && (
            <p className="mt-1 text-sm text-muted">
              {results.length} service{results.length !== 1 ? "s" : ""} found
            </p>
          )}
        </Container>
      </div>

      <Container className="py-8 sm:py-10">
        {/* Search form */}
        <form action="/search" method="get" className="mb-8 flex gap-2">
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search services or enter a tracking number…"
            autoFocus
            className="h-11 min-w-0 flex-1 rounded-md border border-line-strong bg-white px-4 text-sm text-ink placeholder:text-muted/70 focus:border-usps-blue focus:outline-none focus:ring-2 focus:ring-usps-blue/20"
          />
          <button
            type="submit"
            className="inline-flex h-11 items-center rounded-md bg-usps-blue px-5 text-sm font-semibold text-white transition-colors hover:bg-usps-blue-dark"
          >
            Search
          </button>
        </form>

        {q.length > 0 && q.length < 2 && (
          <p className="text-sm text-muted">Enter at least 2 characters to search.</p>
        )}

        {results.length > 0 && (
          <ul className="divide-y divide-line rounded-lg border border-line bg-white shadow-xs">
            {results.map((s) => (
              <li key={s.slug}>
                <Link
                  href={serviceHref(s.slug)}
                  className="flex flex-col gap-0.5 px-5 py-4 transition-colors hover:bg-slate-50"
                >
                  <span className="font-semibold text-navy-900">{s.title}</span>
                  <span className="text-sm text-muted">{s.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {q.length >= 2 && results.length === 0 && (
          <div className="rounded-lg border border-line bg-white px-5 py-10 text-center">
            <p className="font-medium text-ink">No services found for &ldquo;{q}&rdquo;</p>
            <p className="mt-1 text-sm text-muted">
              Try a different term, or{" "}
              <Link href="/contact" className="font-medium text-navy-700 underline underline-offset-2">
                contact support
              </Link>{" "}
              if you need help.
            </p>
          </div>
        )}

        {!q && (
          <div className="text-sm text-muted">
            <p>Type a service name to search, or enter a tracking number to go directly to its tracking page.</p>
          </div>
        )}
      </Container>
    </>
  );
}
