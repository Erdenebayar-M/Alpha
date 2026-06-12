#!/usr/bin/env ts-node
/**
 * Delete load-test data from the database.
 *
 * Usage:
 *   npx ts-node load-test/cleanup.ts --run <runId>   # single run
 *   npx ts-node load-test/cleanup.ts --all            # all loadtest accounts
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';

// Load the backend's DATABASE_URL (this script runs from the repo root).
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('../backend/generated/prisma');

async function main(): Promise<void> {
  const runArg = process.argv.find((a) => a.startsWith('--run='))?.split('=')[1]
    ?? (process.argv.indexOf('--run') !== -1 ? process.argv[process.argv.indexOf('--run') + 1] : undefined);
  const all = process.argv.includes('--all');

  if (!runArg && !all) {
    console.error('Usage: cleanup.ts --run <runId>  OR  cleanup.ts --all');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found — expected it in backend/.env');
    process.exit(1);
  }

  // Mirror the backend's Prisma construction (driver adapter + connection string).
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const parents = await prisma.parent.findMany({
    where: { email: { contains: '@loadtest.local' } },
    select: { id: true, email: true },
  });

  const toDelete = all
    ? parents
    : parents.filter((p: { id: string; email: string }) =>
        p.email.startsWith(`loadbot+${runArg}-`),
      );

  if (toDelete.length === 0) {
    console.log('Nothing to delete.');
    await prisma.$disconnect();
    return;
  }

  const ids = toDelete.map((p: { id: string }) => p.id);
  console.log(`Deleting ${toDelete.length} parent account(s) and all cascaded data...`);

  // Cascade via FK: Parent → Learner → everything else
  const result = await prisma.parent.deleteMany({ where: { id: { in: ids } } });
  console.log(`Done. Deleted ${result.count} parent row(s).`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
