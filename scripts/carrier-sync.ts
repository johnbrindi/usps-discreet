/** Runs one round of carrier polling — for a system cron when the HTTP cron route isn't used. */
import "./load-env";
import { db } from "@/lib/db";
import { syncDueShipments } from "@/server/tracking/sync";

syncDueShipments({ limit: 100, concurrency: 3, budgetMs: 5 * 60_000 })
  .then((summary) => console.log(JSON.stringify(summary)))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
