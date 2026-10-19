import { NextResponse, type NextRequest } from "next/server";
import { allServices } from "@/config/services";
import { createRateLimiter } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

export const dynamic = "force-dynamic";

const searchLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

export type SearchResult = {
  slug: string;
  title: string;
  summary: string;
  href: string;
};

export async function GET(req: NextRequest) {
  const ip = await clientIp();
  if (!searchLimiter(`search:${ip}`).allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const services = allServices();
  const results: SearchResult[] = services
    .filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q),
    )
    .map((s) => ({
      slug: s.slug,
      title: s.title,
      summary: s.summary,
      href: `/services/${s.slug}`,
    }))
    .slice(0, 20);

  return NextResponse.json({ results });
}
