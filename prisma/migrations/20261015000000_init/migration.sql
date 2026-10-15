-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('INFO_RECEIVED', 'ACCEPTED', 'IN_TRANSIT', 'ARRIVED_AT_FACILITY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION', 'RETURNED_TO_SENDER');

-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('MANUAL', 'CARRIER_API', 'DEMO');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "ChatStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ChatSender" AS ENUM ('VISITOR', 'AGENT');

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "tracking_number" VARCHAR(40) NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'INFO_RECEIVED',
    "service_level" VARCHAR(80),
    "origin_city" VARCHAR(120),
    "origin_region" VARCHAR(120),
    "origin_country" CHAR(2),
    "destination_city" VARCHAR(120),
    "destination_region" VARCHAR(120),
    "destination_country" CHAR(2),
    "recipient_name" VARCHAR(160),
    "destination_postcode" VARCHAR(20),
    "internal_notes" TEXT,
    "estimated_delivery_date" DATE,
    "estimate_source" VARCHAR(120),
    "delivered_at" TIMESTAMPTZ(6),
    "carrier" VARCHAR(80),
    "external_reference" VARCHAR(120),
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_events" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "description" VARCHAR(280) NOT NULL,
    "city" VARCHAR(120),
    "region" VARCHAR(120),
    "country" CHAR(2),
    "time_zone" VARCHAR(64),
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "source" "EventSource" NOT NULL DEFAULT 'MANUAL',
    "created_by_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_inquiries" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "tracking_number" VARCHAR(40),
    "topic" VARCHAR(40) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "contact_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_conversations" (
    "id" TEXT NOT NULL,
    "visitor_token_hash" CHAR(64) NOT NULL,
    "status" "ChatStatus" NOT NULL DEFAULT 'OPEN',
    "last_message_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender" "ChatSender" NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "agent_user_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" VARCHAR(80) NOT NULL,
    "entity_type" VARCHAR(40) NOT NULL,
    "entity_id" VARCHAR(40) NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'staff',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "token" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMPTZ(6),
    "refresh_token_expires_at" TIMESTAMPTZ(6),
    "scope" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipments_tracking_number_key" ON "shipments"("tracking_number");

-- CreateIndex
CREATE INDEX "shipments_status_idx" ON "shipments"("status");

-- CreateIndex
CREATE INDEX "shipments_created_at_idx" ON "shipments"("created_at");

-- CreateIndex
CREATE INDEX "tracking_events_shipment_id_occurred_at_idx" ON "tracking_events"("shipment_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "contact_inquiries_status_created_at_idx" ON "contact_inquiries"("status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "chat_conversations_visitor_token_hash_key" ON "chat_conversations"("visitor_token_hash");

-- CreateIndex
CREATE INDEX "chat_conversations_status_last_message_at_idx" ON "chat_conversations"("status", "last_message_at" DESC);

-- CreateIndex
CREATE INDEX "chat_messages_conversation_id_created_at_idx" ON "chat_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE INDEX "verifications_identifier_idx" ON "verifications"("identifier");

-- AddForeignKey
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_agent_user_id_fkey" FOREIGN KEY ("agent_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Supabase exposes the public schema through its Data API. Enable RLS with no
-- policies so anon/authenticated API roles cannot read or write these tables.
-- The application connects as the table owner and is unaffected.
ALTER TABLE "shipments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tracking_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contact_inquiries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verifications" ENABLE ROW LEVEL SECURITY;
