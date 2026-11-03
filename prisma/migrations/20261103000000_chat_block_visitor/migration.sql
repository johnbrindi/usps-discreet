ALTER TABLE "chat_conversations" ADD COLUMN "visitor_ip" VARCHAR(64),
ADD COLUMN "blocked_at" TIMESTAMPTZ(6),
ADD COLUMN "blocked_ip" VARCHAR(64);

CREATE INDEX "chat_conversations_blocked_at_idx" ON "chat_conversations"("blocked_at");
