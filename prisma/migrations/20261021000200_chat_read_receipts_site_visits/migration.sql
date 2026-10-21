-- AlterTable
ALTER TABLE "chat_conversations" ADD COLUMN "visitor_read_at" TIMESTAMPTZ(6),
ADD COLUMN "agent_read_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "site_visits" (
    "id" VARCHAR(64) NOT NULL,
    "path" VARCHAR(300) NOT NULL,
    "referrer" VARCHAR(300),
    "user_agent" VARCHAR(300),
    "city" VARCHAR(120),
    "region" VARCHAR(120),
    "country" CHAR(2),
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ(6),
    "left_notified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "site_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_visits_last_seen_at_idx" ON "site_visits"("last_seen_at" DESC);
