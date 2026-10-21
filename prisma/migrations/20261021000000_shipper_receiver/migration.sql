-- AlterTable
ALTER TABLE "shipments" ADD COLUMN "shipper_name" VARCHAR(160),
ADD COLUMN "shipper_email" VARCHAR(254),
ADD COLUMN "recipient_email" VARCHAR(254);
