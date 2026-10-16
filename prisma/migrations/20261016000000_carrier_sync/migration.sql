-- CreateEnum
CREATE TYPE "TrackingMode" AS ENUM ('MANUAL', 'CARRIER');

-- CreateEnum
CREATE TYPE "ShipmentOrigin" AS ENUM ('ADMIN', 'PUBLIC_LOOKUP');

-- AlterTable
ALTER TABLE "shipments" ADD COLUMN     "carrier_provider" VARCHAR(20),
ADD COLUMN     "carrier_status_text" VARCHAR(280),
ADD COLUMN     "carrier_tracking_number" VARCHAR(40),
ADD COLUMN     "created_via" "ShipmentOrigin" NOT NULL DEFAULT 'ADMIN',
ADD COLUMN     "last_sync_error" VARCHAR(280),
ADD COLUMN     "last_synced_at" TIMESTAMPTZ(6),
ADD COLUMN     "next_sync_at" TIMESTAMPTZ(6),
ADD COLUMN     "sync_failure_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sync_lease_until" TIMESTAMPTZ(6),
ADD COLUMN     "tracking_mode" "TrackingMode" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "tracking_events" ADD COLUMN     "carrier_status_code" VARCHAR(64),
ADD COLUMN     "external_id" VARCHAR(128);

-- CreateTable
CREATE TABLE "carrier_sync_logs" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "provider" VARCHAR(20) NOT NULL,
    "trigger" VARCHAR(16) NOT NULL,
    "outcome" VARCHAR(24) NOT NULL,
    "http_status" INTEGER,
    "duration_ms" INTEGER NOT NULL,
    "events_added" INTEGER NOT NULL DEFAULT 0,
    "events_removed" INTEGER NOT NULL DEFAULT 0,
    "error" VARCHAR(280),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carrier_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "carrier_sync_logs_shipment_id_created_at_idx" ON "carrier_sync_logs"("shipment_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "carrier_sync_logs_created_at_idx" ON "carrier_sync_logs"("created_at");

-- CreateIndex
CREATE INDEX "shipments_tracking_mode_next_sync_at_idx" ON "shipments"("tracking_mode", "next_sync_at");

-- CreateIndex
CREATE INDEX "shipments_carrier_tracking_number_idx" ON "shipments"("carrier_tracking_number");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_events_shipment_id_external_id_key" ON "tracking_events"("shipment_id", "external_id");

-- AddForeignKey
ALTER TABLE "carrier_sync_logs" ADD CONSTRAINT "carrier_sync_logs_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Same posture as every app table: no Supabase Data API access (Prisma connects as owner).
ALTER TABLE "carrier_sync_logs" ENABLE ROW LEVEL SECURITY;
