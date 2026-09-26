-- AlterTable
ALTER TABLE "parents" ADD COLUMN "google_id" TEXT,
ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "parents_google_id_key" ON "parents"("google_id");
