-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN "image_data" BYTEA,
ADD COLUMN "image_type" VARCHAR(40);
