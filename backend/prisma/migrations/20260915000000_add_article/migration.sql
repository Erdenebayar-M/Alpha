-- CreateEnum
CREATE TYPE "ArticleCategory" AS ENUM ('READING', 'ORTHOGRAPHY', 'SPELLING');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "category" "ArticleCategory" NOT NULL,
    "body" JSONB NOT NULL,
    "thumbnail_url" TEXT,
    "thumbnail_alt" TEXT,
    "thumbnail_width" INTEGER,
    "thumbnail_height" INTEGER,
    "reading_time_minutes" INTEGER NOT NULL,
    "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");

-- CreateIndex
CREATE INDEX "articles_status_idx" ON "articles"("status");

-- CreateIndex
CREATE INDEX "articles_category_idx" ON "articles"("category");

-- CreateIndex
-- At most one row may have is_featured = true (ADR 0002). Not expressible in
-- Prisma's schema DSL — @@index/@@unique have no WHERE clause — so this
-- partial unique index exists only here, not in schema.prisma.
CREATE UNIQUE INDEX "articles_featured_key" ON "articles"("is_featured") WHERE "is_featured" = true;
