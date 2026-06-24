if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PROD_SEED) {
  console.error("Cannot run word-bank import in production!");
  process.exit(1);
}

import "dotenv/config";
import * as path from "path";
import * as fs from "fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma";
import {
  parseClassifiedWorkbook,
  filterWords,
  toWordRecords,
  type DroppedRow,
} from "../src/lib/word-bank/import";

const isDryRun = process.argv.includes("--dry-run");

// First non-flag CLI arg overrides the default file; default = docs/grade1_words_classified.xlsx
const argPath = process.argv.slice(2).find((a) => !a.startsWith("--"));
const DEFAULT_FILE = path.join(__dirname, "../../../docs/grade1_words_classified.xlsx");
const filePath = argPath ? path.resolve(argPath) : DEFAULT_FILE;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function summariseDropped(dropped: DroppedRow[], reason: DroppedRow["reason"]): DroppedRow[] {
  return dropped.filter((d) => d.reason === reason);
}

async function main() {
  if (isDryRun) console.log("[DRY RUN] No writes will be made.\n");

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  console.log(`Source: ${filePath}\n`);

  const { rows, reviewNos } = parseClassifiedWorkbook(filePath);
  const { kept, dropped } = filterWords(rows, reviewNos);
  const records = toWordRecords(kept);

  // ── Report removals ──────────────────────────────────────────────────────
  const review = summariseDropped(dropped, "review");
  const dups = summariseDropped(dropped, "duplicate");
  const ortho = summariseDropped(dropped, "orthography");

  console.log(`Parsed rows:           ${rows.length}`);
  console.log(`Removed (review/№):    ${review.length}  ${review.map((d) => d.word).join(", ")}`);
  console.log(`Removed (duplicate):   ${dups.length}  ${dups.map((d) => d.word).join(", ")}`);
  console.log(`Removed (orthography): ${ortho.length}  ${ortho.map((d) => `${d.word} (${d.detail})`).join(", ")}`);
  console.log(`Kept for upsert:       ${records.length}\n`);

  // ── Upsert ───────────────────────────────────────────────────────────────
  let created = 0;
  let updated = 0;
  let errored = 0;

  for (const rec of records) {
    const { id, ...data } = rec;
    try {
      if (isDryRun) {
        const exists = await prisma.word.findUnique({ where: { id }, select: { id: true } });
        exists ? updated++ : created++;
      } else {
        const exists = await prisma.word.findUnique({ where: { id }, select: { id: true } });
        await prisma.word.upsert({ where: { id }, update: data, create: { id, ...data } });
        exists ? updated++ : created++;
      }
    } catch (e) {
      console.error(`  ERROR word ${id} (${rec.word}):`, (e as Error).message);
      errored++;
    }
  }

  console.log("─── Import Summary ──────────────────────");
  console.log(`Words upserted: ${created + updated} (${created} created, ${updated} updated, ${errored} errors)`);

  if (!isDryRun) {
    const gradeCount = await prisma.word.count({ where: { grade: { not: null } } });
    console.log(`Words with a grade in DB: ${gradeCount}`);
  }
  console.log("─────────────────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
