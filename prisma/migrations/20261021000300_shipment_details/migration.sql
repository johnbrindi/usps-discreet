-- AlterTable
ALTER TABLE "shipments" ADD COLUMN "payment_mode" VARCHAR(80),
ADD COLUMN "pickup_date" DATE,
ADD COLUMN "pickup_time" VARCHAR(5),
ADD COLUMN "departure_time" VARCHAR(5),
ADD COLUMN "shipment_type" VARCHAR(80),
ADD COLUMN "shipment_mode" VARCHAR(80),
ADD COLUMN "product" VARCHAR(120),
ADD COLUMN "quantity" VARCHAR(40),
ADD COLUMN "weight" VARCHAR(40),
ADD COLUMN "total_freight" VARCHAR(40),
ADD COLUMN "comments" VARCHAR(1000);
