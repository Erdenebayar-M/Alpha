/**
 * Populate derived word-capability columns on the `words` table.
 *
 * Reads every word, runs deriveCapability({ word, part_of_speech, imageable }),
 * and writes back skills_possible / errors_possible / task_types_possible /
 * primary_feature / primary_skill / balarhai_unknown.
 *
 * imageable is sourced from meaning_type === "бодит/зурагтай холбож болно"
 * (NFC-normalised both sides — the comparison runs in Node, not SQL, to avoid
 * the Windows psql argv-encoding pitfall).
 *
 * Idempotent: keyed on word.id, overwrites the six columns each run.
 *
 *   npx ts-node prisma/populateWordCapability.ts --dry-run   # report only
 *   npx ts-node prisma/populateWordCapability.ts             # write
 */
if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PROD_SEED) {
  console.error("Cannot run word-capability populate in production!");
  process.exit(1);
}

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma";
import { deriveCapability } from "../src/lib/word-bank/derive-capability";

const isDryRun = process.argv.includes("--dry-run");

const IMAGEABLE_MEANING = "бодит/зурагтай холбож болно".normalize("NFC");
const isImageable = (meaningType: string | null): boolean =>
  (meaningType ?? "").normalize("NFC") === IMAGEABLE_MEANING;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  if (isDryRun) console.log("[DRY RUN] No writes will be made.\n");

  const words = await prisma.word.findMany({
    where: { root_word_id: null }, // roots only — inflected-form rows stay non-eligible (empty capability arrays)
    select: { id: true, word: true, part_of_speech: true, meaning_type: true },
  });
  console.log(`Loaded ${words.length} words.\n`);

  // ── meaning_type distribution + imageable match (JS comparison) ─────────────
  const meaningCounts = new Map<string, number>();
  let imageableCount = 0;
  for (const w of words) {
    const key = w.meaning_type ?? "<NULL>";
    meaningCounts.set(key, (meaningCounts.get(key) ?? 0) + 1);
    if (isImageable(w.meaning_type)) imageableCount++;
  }
  console.log("meaning_type distribution:");
  for (const [k, n] of [...meaningCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n}\t${k}`);
  }
  console.log(`\nimageable (meaning_type === "${IMAGEABLE_MEANING}"): ${imageableCount}\n`);

  // ── Derive + (optionally) write ─────────────────────────────────────────────
  const skillCount: Record<string, number> = {};
  let written = 0;
  let nonEmptySkills = 0;
  let balarhaiUnknown = 0;

  for (const w of words) {
    const cap = deriveCapability({
      word: w.word,
      part_of_speech: w.part_of_speech ?? "",
      imageable: isImageable(w.meaning_type),
    });

    if (cap.skills_possible.length > 0) nonEmptySkills++;
    for (const s of new Set(cap.skills_possible)) skillCount[s] = (skillCount[s] ?? 0) + 1;
    if (cap.flags.balarhai_unknown) balarhaiUnknown++;

    if (!isDryRun) {
      await prisma.word.update({
        where: { id: w.id },
        data: {
          skills_possible: cap.skills_possible,
          errors_possible: cap.errors_possible,
          task_types_possible: cap.task_types_possible,
          primary_feature: cap.primary_feature,
          primary_skill: cap.primary_skill,
          balarhai_unknown: cap.flags.balarhai_unknown,
        },
      });
      written++;
    }
  }

  console.log("─".repeat(50));
  console.log(`Rows ${isDryRun ? "that WOULD be written" : "written"}: ${isDryRun ? words.length : written}`);
  console.log(`Rows with non-empty skills_possible: ${nonEmptySkills}`);
  console.log("Per-skill coverage (rows with skill in skills_possible):");
  for (const s of ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"]) {
    console.log(`  ${s}: ${skillCount[s] ?? 0}`);
  }
  console.log(`imageable rows: ${imageableCount}`);
  console.log(`balarhai_unknown total: ${balarhaiUnknown}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
