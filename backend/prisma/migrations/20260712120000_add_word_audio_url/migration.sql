-- Add audio_url: stores the uploaded/recorded audio asset URL for a word,
-- mirroring the existing image_url column.
ALTER TABLE "words" ADD COLUMN "audio_url" TEXT;
