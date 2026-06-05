/*
  Warnings:

  - You are about to drop the column `title` on the `task_drafts` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `tasks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "task_drafts" DROP COLUMN "title";

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "title";
