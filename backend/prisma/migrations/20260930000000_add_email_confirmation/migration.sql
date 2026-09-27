-- AlterTable
ALTER TABLE "parents" ADD COLUMN "email_confirmed_at" TIMESTAMPTZ(6);

-- Parent accounts from before Email confirmation existed count as confirmed,
-- so none of them is locked out of Sign in.
UPDATE "parents" SET "email_confirmed_at" = "created_at";

-- CreateTable
CREATE TABLE "email_confirmation_tokens" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_confirmation_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_confirmation_tokens_token_hash_key" ON "email_confirmation_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "email_confirmation_tokens_parent_id_idx" ON "email_confirmation_tokens"("parent_id");

-- AddForeignKey
ALTER TABLE "email_confirmation_tokens" ADD CONSTRAINT "email_confirmation_tokens_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
