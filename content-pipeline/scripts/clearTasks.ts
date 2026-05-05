/**
 * Deletes all Task records from the database.
 *
 * Run from repo root:
 *   npx tsx content-pipeline/scripts/clearTasks.ts
 *   npx tsx content-pipeline/scripts/clearTasks.ts --dry-run
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../backend/generated/prisma';

dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const isDryRun = process.argv.includes('--dry-run');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const count = await prisma.task.count();
  console.log(`Tasks in DB: ${count}`);

  if (count === 0) {
    console.log('Nothing to delete.');
    return;
  }

  if (isDryRun) {
    console.log(`[dry-run] Would delete ${count} tasks.`);
    return;
  }

  const { count: deleted } = await prisma.task.deleteMany({});
  console.log(`Deleted ${deleted} tasks.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
