/**
 * Seeds clearly-labelled DEMO shipments for development. Idempotent: existing demo records
 * are left alone and non-demo data is never touched. Demo shipments are flagged `isDemo`,
 * use the DEMO prefix, carry `source = DEMO` events, and are hidden in production unless
 * ENABLE_DEMO_DATA=true.
 */
import "../scripts/load-env";
import { PrismaClient, type ShipmentStatus } from "@prisma/client";

const db = new PrismaClient({ transactionOptions: { maxWait: 10_000, timeout: 15_000 } });
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);

type DemoEvent = { status: ShipmentStatus; description: string; city: string; region: string; tz: string; at: Date };

const demos: Array<{
  trackingNumber: string;
  serviceLevel: string;
  origin: [string, string];
  destination: [string, string];
  events: DemoEvent[];
}> = [
  {
    trackingNumber: "DEMO00000000000001",
    serviceLevel: "Standard (demo)",
    origin: ["Hartford", "CT"],
    destination: ["Denver", "CO"],
    events: [
      { status: "INFO_RECEIVED", description: "Shipping label created (sample data).", city: "Hartford", region: "CT", tz: "America/New_York", at: hoursAgo(80) },
      { status: "ACCEPTED", description: "Parcel accepted at drop-off point (sample data).", city: "Hartford", region: "CT", tz: "America/New_York", at: hoursAgo(72) },
      { status: "ARRIVED_AT_FACILITY", description: "Arrived at regional sorting facility (sample data).", city: "Columbus", region: "OH", tz: "America/New_York", at: hoursAgo(50) },
      { status: "IN_TRANSIT", description: "Departed facility, in transit to next facility (sample data).", city: "Columbus", region: "OH", tz: "America/New_York", at: hoursAgo(44) },
      { status: "ARRIVED_AT_FACILITY", description: "Arrived at destination facility (sample data).", city: "Denver", region: "CO", tz: "America/Denver", at: hoursAgo(10) },
    ],
  },
  {
    trackingNumber: "DEMO00000000000002",
    serviceLevel: "Express (demo)",
    origin: ["Austin", "TX"],
    destination: ["Seattle", "WA"],
    events: [
      { status: "INFO_RECEIVED", description: "Shipping label created (sample data).", city: "Austin", region: "TX", tz: "America/Chicago", at: hoursAgo(60) },
      { status: "ACCEPTED", description: "Parcel accepted (sample data).", city: "Austin", region: "TX", tz: "America/Chicago", at: hoursAgo(55) },
      { status: "IN_TRANSIT", description: "In transit (sample data).", city: "Austin", region: "TX", tz: "America/Chicago", at: hoursAgo(48) },
      { status: "OUT_FOR_DELIVERY", description: "Out for delivery (sample data).", city: "Seattle", region: "WA", tz: "America/Los_Angeles", at: hoursAgo(9) },
      { status: "DELIVERED", description: "Delivered, left at front door (sample data).", city: "Seattle", region: "WA", tz: "America/Los_Angeles", at: hoursAgo(5) },
    ],
  },
  {
    trackingNumber: "DEMO00000000000003",
    serviceLevel: "Standard (demo)",
    origin: ["Portland", "OR"],
    destination: ["Miami", "FL"],
    events: [
      { status: "INFO_RECEIVED", description: "Shipping label created (sample data).", city: "Portland", region: "OR", tz: "America/Los_Angeles", at: hoursAgo(30) },
      { status: "ACCEPTED", description: "Parcel accepted (sample data).", city: "Portland", region: "OR", tz: "America/Los_Angeles", at: hoursAgo(26) },
      { status: "EXCEPTION", description: "Weather delay at sorting facility; parcel will move when conditions allow (sample data).", city: "Salt Lake City", region: "UT", tz: "America/Denver", at: hoursAgo(6) },
    ],
  },
];

async function main() {
  for (const demo of demos) {
    const exists = await db.shipment.findUnique({ where: { trackingNumber: demo.trackingNumber }, select: { isDemo: true } });
    if (exists) {
      console.log(`• ${demo.trackingNumber} already present${exists.isDemo ? "" : " (NOT a demo record — left untouched)"}`);
      continue;
    }
    const last = demo.events.at(-1)!;
    await db.$transaction(async (tx) => {
      await tx.shipment.create({
        data: {
          trackingNumber: demo.trackingNumber,
          isDemo: true,
          status: last.status,
          serviceLevel: demo.serviceLevel,
          originCity: demo.origin[0],
          originRegion: demo.origin[1],
          originCountry: "US",
          destinationCity: demo.destination[0],
          destinationRegion: demo.destination[1],
          destinationCountry: "US",
          deliveredAt: last.status === "DELIVERED" ? last.at : null,
          internalNotes: "Demo record created by prisma/seed.ts",
          events: {
            create: demo.events.map((e) => ({
              status: e.status,
              description: e.description,
              city: e.city,
              region: e.region,
              country: "US",
              timeZone: e.tz,
              occurredAt: e.at,
              source: "DEMO" as const,
            })),
          },
        },
      });
    });
    console.log(`✓ created ${demo.trackingNumber} (${last.status})`);
  }
}

main()
  .catch((err: unknown) => {
    console.error(`✗ Seed failed: ${err instanceof Error ? err.message.slice(0, 300) : String(err)}`);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
