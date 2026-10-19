-- CreateEnum
CREATE TYPE "ServiceKind" AS ENUM ('CATEGORY', 'SERVICE');

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "summary" VARCHAR(400) NOT NULL,
    "icon" VARCHAR(200),
    "kind" "ServiceKind" NOT NULL DEFAULT 'SERVICE',
    "children" TEXT[],
    "sections" JSONB NOT NULL DEFAULT '[]',
    "cta_label" VARCHAR(80),
    "cta_href" VARCHAR(300),
    "related" TEXT[],
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");

-- CreateIndex
CREATE INDEX "services_published_sort_order_idx" ON "services"("published", "sort_order");
