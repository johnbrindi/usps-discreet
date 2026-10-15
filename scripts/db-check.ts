/** Verifies database connectivity and migration state without printing credentials. */
import "./load-env";
import { PrismaClient } from "@prisma/client";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const host = new URL(url).hostname;
  const db = new PrismaClient();
  try {
    const [row] = await db.$queryRaw<{ version: string }[]>`select split_part(version(), ' ', 2) as version`;
    const tables = await db.$queryRaw<{ n: bigint }[]>`select count(*) as n from pg_tables where schemaname = 'public'`;
    const migrations = await db.$queryRaw<{ n: bigint }[]>`select count(*) as n from _prisma_migrations where finished_at is not null`;
    console.log(`✓ Connected to PostgreSQL ${row?.version} at ${host.replace(/^[^.]+/, "***")}`);
    console.log(`✓ public tables: ${tables[0]?.n}, applied migrations: ${migrations[0]?.n}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message.replace(/postgres(ql)?:\/\/\S+/g, "<redacted-url>") : String(err);
  console.error(`✗ Database check failed: ${msg.slice(0, 300)}`);
  process.exit(1);
});
