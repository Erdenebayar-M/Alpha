/**
 * Upload per-word illustration PNGs from docs/images/ to R2, then write
 * the public URL to words.image_url and set image_ok = true.
 *
 * Filename convention:  <word>.png  (Mongolian Cyrillic, NFC-normalised)
 * R2 object key:        words/<word_id>.png
 * Public URL:           ${R2_PUBLIC_URL}/words/<word_id>.png
 *
 * Idempotent: re-runs overwrite the same R2 object and same DB value.
 *
 * Usage:
 *   npx ts-node prisma/uploadWordImages.ts --dry-run   # preview, no writes
 *   npx ts-node prisma/uploadWordImages.ts             # upload + update DB
 *
 * Optional: pass a custom images directory as the first non-flag arg.
 *   npx ts-node prisma/uploadWordImages.ts /path/to/images
 */
if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PROD_SEED) {
  console.error("Cannot run word-image upload in production!");
  process.exit(1);
}

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma";
import { r2Enabled, r2Upload } from "../src/lib/r2";

const isDryRun = process.argv.includes("--dry-run");
const argPath = process.argv.slice(2).find((a) => !a.startsWith("--"));
const IMAGES_DIR = argPath
  ? path.resolve(argPath)
  : path.resolve(__dirname, "../../../docs/images");

const UNMATCHED_OUT = path.resolve(__dirname, "../../../docs/word_images_unmatched.txt");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ── File helpers ─────────────────────────────────────────────────────────────

function walkPngs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkPngs(full));
    else if (entry.name.toLowerCase().endsWith(".png")) out.push(full);
  }
  return out;
}

/** Derive the word stem from a PNG filename (strips dup suffix like " (2)"). */
function toStem(filePath: string): string {
  return path.basename(filePath, ".png")
    .normalize("NFC")
    .trim()
    .replace(/\s*\(\d+\)\s*$/, "");
}

// ── Matching logic ────────────────────────────────────────────────────────────

interface WordRow { id: string; word: string }

function buildLookups(words: WordRow[]): {
  byExact: Map<string, WordRow>;
  byLower: Map<string, WordRow>;
} {
  const byExact = new Map<string, WordRow>();
  const byLower = new Map<string, WordRow>();
  for (const w of words) {
    const nfc = w.word.normalize("NFC").trim();
    byExact.set(nfc, w);
    byLower.set(nfc.toLowerCase(), w);
  }
  return { byExact, byLower };
}

function matchWord(
  stem: string,
  byExact: Map<string, WordRow>,
  byLower: Map<string, WordRow>,
): WordRow | null {
  return byExact.get(stem) ?? byLower.get(stem.toLowerCase()) ?? null;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (isDryRun) console.log("[DRY RUN] No uploads or DB writes will be made.\n");

  if (!r2Enabled()) {
    console.error(
      "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, " +
        "R2_BUCKET_NAME, and R2_PUBLIC_URL in .env before running this script.",
    );
    process.exit(1);
  }

  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`Images directory not found: ${IMAGES_DIR}`);
    process.exit(1);
  }
  console.log(`Images source: ${IMAGES_DIR}`);

  // ── Collect + group files by stem ─────────────────────────────────────────
  const allPngs = walkPngs(IMAGES_DIR);
  console.log(`Found ${allPngs.length} PNG files (recursive)\n`);

  // Group by stem — e.g. авга.png + авга (2).png → stem "авга"
  const byStem = new Map<string, string[]>();
  for (const f of allPngs) {
    const s = toStem(f);
    const arr = byStem.get(s) ?? [];
    arr.push(f);
    byStem.set(s, arr);
  }

  // ── Load words ────────────────────────────────────────────────────────────
  const words = await prisma.word.findMany({ select: { id: true, word: true } });
  console.log(`Loaded ${words.length} words from DB\n`);
  const { byExact, byLower } = buildLookups(words);

  // ── Process each stem ─────────────────────────────────────────────────────
  let uploaded = 0;
  let dupSkipped = 0;
  const unmatched: string[] = [];
  const sampleMatches: string[] = [];

  for (const [stem, files] of byStem) {
    const wordRow = matchWord(stem, byExact, byLower);

    if (!wordRow) {
      // Collect all filenames (incl. dup variants) for the report
      unmatched.push(...files.map((f) => path.relative(IMAGES_DIR, f)));
      continue;
    }

    // Pick the canonical file (prefer the one without a dup suffix)
    const canonical = files.find((f) => !/\(\d+\)/.test(path.basename(f))) ?? files[0];
    const extras = files.filter((f) => f !== canonical);
    dupSkipped += extras.length;

    const key = `words/${wordRow.id}.png`;
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    if (sampleMatches.length < 8) {
      sampleMatches.push(`  ${wordRow.word} (${wordRow.id}) → ${key}`);
    }

    if (!isDryRun) {
      const buf = fs.readFileSync(canonical);
      const url = await r2Upload(key, buf, "image/png");
      await prisma.word.update({
        where: { id: wordRow.id },
        data: { image_url: url, image_ok: true },
      });
    }
    uploaded++;
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("─── Sample matches ──────────────────────────────────────────────");
  console.log(sampleMatches.join("\n"));
  console.log();
  console.log("─── Upload Summary ──────────────────────────────────────────────");
  console.log(`Words ${isDryRun ? "that WOULD be uploaded" : "uploaded + updated"}: ${uploaded}`);
  console.log(`Dup-variant files skipped (non-canonical):                        ${dupSkipped}`);
  console.log(`Unmatched file stems (no word row):                               ${unmatched.length}`);

  if (!isDryRun) {
    const withImage = await prisma.word.count({ where: { image_url: { not: null } } });
    console.log(`\nWords now with image_url: ${withImage} of ${words.length}`);
  }
  console.log("─────────────────────────────────────────────────────────────────\n");

  // ── Write unmatched report ────────────────────────────────────────────────
  const unmatchedReport = [
    "# Word images with no matching DB word row",
    "#",
    `# Source dir: ${IMAGES_DIR}`,
    `# Generated:  ${new Date().toISOString().slice(0, 10)}`,
    "#",
    "# These filenames did not match any word in the words table.",
    "# Causes: multi-word phrases (гэр бүл), ordinal forms (гуравдугаар),",
    "# inflected forms (найзууд), typo/digit suffixes (од2), or words not",
    "# yet in the bank. Needs a manual filename→word_id map for the next pass.",
    "#",
    `# Count: ${unmatched.length}`,
    "",
    ...unmatched,
    "",
  ].join("\n");

  if (!isDryRun) {
    fs.writeFileSync(UNMATCHED_OUT, unmatchedReport, "utf8");
    console.log(`Unmatched report written to: ${UNMATCHED_OUT}`);
  } else {
    console.log("Sample unmatched (dry-run, not written):");
    console.log(unmatched.slice(0, 20).map((f) => `  ${f}`).join("\n"));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
