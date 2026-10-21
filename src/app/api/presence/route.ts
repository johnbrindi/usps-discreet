import { after, NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getStaffUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { presenceLimiter } from "@/lib/rate-limit";
import { notifyStaff } from "@/server/push";
import { BOT_UA, describeDevice, describeDuration, describePlace } from "@/server/visits";

export const dynamic = "force-dynamic";
// Leaving waits out LEAVE_GRACE_MS before alerting staff.
export const maxDuration = 60;

/** A reload or a quick look at another tab sends "leave" then "enter"; only alert if they stay gone this long. */
const LEAVE_GRACE_MS = 30_000;

const presenceSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
  event: z.enum(["enter", "leave"]),
  path: z.string().max(300).startsWith("/"),
  referrer: z.string().max(300).optional(),
});

function ipOf(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Vercel's geo headers; city is URL-encoded. Empty when not deployed on Vercel. */
function geoOf(req: NextRequest) {
  const decode = (v: string | null) => {
    try {
      return v ? decodeURIComponent(v).slice(0, 120) : null;
    } catch {
      return null;
    }
  };
  const country = req.headers.get("x-vercel-ip-country");
  return {
    city: decode(req.headers.get("x-vercel-ip-city")),
    region: decode(req.headers.get("x-vercel-ip-country-region")),
    country: country && /^[A-Z]{2}$/.test(country) ? country : null,
  };
}

/** Visit pings from the public site (see VisitBeacon). Alerts staff devices when a visitor arrives and leaves. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin || new URL(origin).host !== req.headers.get("host")) {
    return new NextResponse(null, { status: 403 });
  }
  const ua = req.headers.get("user-agent")?.slice(0, 300) ?? null;
  if (!ua || BOT_UA.test(ua)) return new NextResponse(null, { status: 204 });
  if (!presenceLimiter(`presence:${ipOf(req)}`).allowed) return new NextResponse(null, { status: 429 });

  let parsed;
  try {
    parsed = presenceSchema.safeParse(JSON.parse(await req.text()));
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const { id, event, path, referrer } = parsed.data;

  // Staff browsing the public site shouldn't alert themselves.
  if (await getStaffUser().catch(() => null)) return new NextResponse(null, { status: 204 });

  try {
    const now = new Date();
    if (event === "enter") {
      const existing = await db.siteVisit.findUnique({ where: { id }, select: { leftNotified: true } });
      if (!existing) {
        const visit = await db.siteVisit.create({
          data: { id, path, referrer: referrer || null, userAgent: ua, ...geoOf(req) },
        });
        after(() =>
          notifyStaff({
            title: "Visitor on the site",
            body: [describePlace(visit), describeDevice(ua), `viewing ${path}`].filter(Boolean).join(" · "),
            url: "/admin/visitors",
            tag: `visit-${id}`,
          }),
        );
      } else {
        await db.siteVisit.update({ where: { id }, data: { lastSeenAt: now, leftAt: null, leftNotified: false, path } });
        // Staff were told this visitor left; tell them they're back.
        if (existing.leftNotified) {
          after(() =>
            notifyStaff({
              title: "Visitor is back",
              body: [describeDevice(ua), `viewing ${path}`].filter(Boolean).join(" · "),
              url: "/admin/visitors",
              tag: `visit-${id}`,
            }),
          );
        }
      }
    } else {
      const { count } = await db.siteVisit.updateMany({ where: { id }, data: { leftAt: now, path } });
      if (count > 0) after(() => alertIfStillGone(id, now));
    }
  } catch (err) {
    logger.error("presence.failed", err);
  }
  return new NextResponse(null, { status: 204 });
}

async function alertIfStillGone(id: string, leftAt: Date) {
  await new Promise((r) => setTimeout(r, LEAVE_GRACE_MS));
  // Claim the alert atomically, and only if no "enter" arrived since (which clears leftAt).
  const { count } = await db.siteVisit.updateMany({
    where: { id, leftAt, leftNotified: false },
    data: { leftNotified: true },
  });
  if (count === 0) return;
  const visit = await db.siteVisit.findUnique({ where: { id } });
  if (!visit) return;
  await notifyStaff({
    title: "Visitor left the site",
    body: [describePlace(visit), describeDevice(visit.userAgent), `stayed ${describeDuration(leftAt.getTime() - visit.startedAt.getTime())}`]
      .filter(Boolean)
      .join(" · "),
    url: "/admin/visitors",
    tag: `visit-${id}`,
  });
}
