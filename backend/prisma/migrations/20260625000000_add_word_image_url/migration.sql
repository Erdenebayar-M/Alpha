-- Asset URL for a word's illustration (R2 CDN or /content path).
-- Backfilled by prisma/uploadWordImages.ts. NULL where no image exists yet.
ALTER TABLE "words" ADD COLUMN "image_url" TEXT;
