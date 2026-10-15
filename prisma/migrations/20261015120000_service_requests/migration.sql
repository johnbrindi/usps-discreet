-- CreateEnum
CREATE TYPE "ServiceRequestType" AS ENUM ('QUOTE', 'PICKUP', 'SHIPPING', 'ADDRESS_CHANGE', 'CLAIM');

-- CreateTable
CREATE TABLE "service_requests" (
    "id" TEXT NOT NULL,
    "reference" VARCHAR(16) NOT NULL,
    "type" "ServiceRequestType" NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(40),
    "tracking_number" VARCHAR(40),
    "details" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_requests_reference_key" ON "service_requests"("reference");

-- CreateIndex
CREATE INDEX "service_requests_status_created_at_idx" ON "service_requests"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "service_requests_type_idx" ON "service_requests"("type");


-- Same posture as every app table: no Supabase Data API access (Prisma connects as owner).
ALTER TABLE "service_requests" ENABLE ROW LEVEL SECURITY;
