-- Root <-> inflected-form self-relation on the words table.
-- root_word_id null = the row is a root (lemma); non-null = an inflected surface
-- form pointing at its root lemma (e.g. "ахтайгаа" -> "ах"). Populated by
-- prisma/populateWordForms.ts from the grade-2 workbook's "Илэрсэн хэлбэрүүд".
-- Cascade so deleting a root removes its form rows.

-- AlterTable
ALTER TABLE "words" ADD COLUMN "root_word_id" TEXT;

-- CreateIndex
CREATE INDEX "words_root_word_id_idx" ON "words"("root_word_id");

-- AddForeignKey
ALTER TABLE "words" ADD CONSTRAINT "words_root_word_id_fkey" FOREIGN KEY ("root_word_id") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;
