-- Add is_edited flag: set true once an admin PATCHes any content field on a word
-- (not just is_active). Lets the admin UI highlight rows a human has touched.
ALTER TABLE "words" ADD COLUMN "is_edited" BOOLEAN NOT NULL DEFAULT false;
