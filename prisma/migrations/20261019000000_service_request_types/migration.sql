-- New service-request types (stamps, PO boxes, hold mail, supplies, redelivery, customs help).
ALTER TYPE "ServiceRequestType" ADD VALUE IF NOT EXISTS 'STAMPS';
ALTER TYPE "ServiceRequestType" ADD VALUE IF NOT EXISTS 'PO_BOX';
ALTER TYPE "ServiceRequestType" ADD VALUE IF NOT EXISTS 'HOLD_MAIL';
ALTER TYPE "ServiceRequestType" ADD VALUE IF NOT EXISTS 'SUPPLIES';
ALTER TYPE "ServiceRequestType" ADD VALUE IF NOT EXISTS 'REDELIVERY';
ALTER TYPE "ServiceRequestType" ADD VALUE IF NOT EXISTS 'CUSTOMS';
