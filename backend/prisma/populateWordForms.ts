/*
 * Populate inflected-form rows for the word bank and link each to its root.
 *
 * Source: docs/grade2_words_mvp9_corrected_full.xlsx, column "Илэрсэн хэлбэрүүд"
 * — a comma-separated list of `form(frequency)` pairs per root word
 * (e.g. root "ах" → "ахтайгаа(12), ахдаа(5)"). Frequency is discarded (per the
 * 2026-07-10 decision); only the form string is kept.
 *
 * Each new form becomes its own `Word` row with `root_word_id` pointing at the
 * root lemma's row (self-relation added in migration
 * 20260710000000_add_word_root_form_self_relation). Form rows are intentionally
 * lightweight and NOT exercise-eligible: empty capability arrays, so
 * select-words never picks them, and every roots-only consumer additionally
 * filters `root_word_id: null`.
 *
 * Only the grade-2 workbook carries form data, so this is a grade-2-scoped
 * enrichment. Roots are matched to already-imported rows by exact `word`.
 *
 * Skips (never written):
 *   - form equal to its own root (the root row already represents it),
 *   - form failing orthography checks (non-Mongolian / no vowel),
 *   - form colliding with any existing `Word.word` (root or an earlier form) —
 *     logged to docs/word_form_collisions.txt for manual review. We never mutate
 *     an existing row's root_word_id (avoids demoting a legitimate standalone
 *     root like "нэг").
 *
 * A real run first deletes every existing form row (root_word_id IS NOT NULL) so
 * re-runs are idempotent — forms are produced exclusively by this script.
 *
 * Usage:
 *   npx ts-node prisma/populateWordForms.ts --dry-run   # report only
 *   npx ts-node prisma/populateWordForms.ts             # write
 */
if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PROD_SEED) {
  console.error("Cannot run word-form population in production!");
  process.exit(1);
}

import "dotenv/config";
import * as path from "path";
import * as fs from "fs";
import * as XLSX from "xlsx";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma";
import { isAllMongolian, hasVowel } from "../src/lib/word-bank/import";
import { syllabify } from "../src/lib/error-engine/mongolian-utils";

const isDryRun = process.argv.includes("--dry-run");

const FILE = path.join(__dirname, "../../../docs/grade2_words_mvp9_corrected_full.xlsx");
const COLLISIONS_FILE = path.join(__dirname, "../../../docs/word_form_collisions.txt");

const DATA_SHEETS = ["2-р анги_MVP9", "2-р анги_Бусад"] as const;
const COL_WORD = "Үндсэн үг";
const COL_FORMS = "Илэрсэн хэлбэрүүд";

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

/** "ахтайгаа(12), ахдаа(5)" → ["ахтайгаа", "ахдаа"] (frequency stripped). */
function parseForms(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((p) => p.replace(/\(\s*\d+\s*\)\s*$/, "").trim())
    .filter((p) => p.length > 0);
}

// ─── Parse the workbook: union of forms per unique root word ──────────────────

function parseRootForms(): Map<string, Set<string>> {
  const wb = XLSX.readFile(FILE);
  const byRoot = new Map<string, Set<string>>();

  for (const sheetName of DATA_SHEETS) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found (have: ${wb.SheetNames.join(", ")})`);

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    for (const r of rows) {
      const root = str(r[COL_WORD]);
      if (root === "") continue;
      const forms = parseForms(str(r[COL_FORMS]));
      let set = byRoot.get(root);
      if (!set) {
        set = new Set<string>();
        byRoot.set(root, set);
      }
      for (const f of forms) set.add(f);
    }
  }
  return byRoot;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface Collision {
  form: string;
  wantedByRoot: string;
}

async function main() {
  if (isDryRun) console.log("[DRY RUN] No writes will be made.\n");
  if (!fs.existsSync(FILE)) {
    console.error(`File not found: ${FILE}`);
    process.exit(1);
  }
  console.log(`Source: ${FILE}\n`);

  const byRoot = parseRootForms();
  const totalFormMentions = [...byRoot.values()].reduce((n, s) => n + s.size, 0);
  console.log(`Root words in workbook: ${byRoot.size}`);
  console.log(`Distinct form mentions (pre-filter): ${totalFormMentions}\n`);

  // ── Clear existing form rows so re-runs are idempotent (real run only) ───────
  if (!isDryRun) {
    const del = await prisma.word.deleteMany({ where: { root_word_id: { not: null } } });
    if (del.count > 0) console.log(`Cleared ${del.count} existing form rows.\n`);
  }

  // ── Look up roots in the DB by exact word ────────────────────────────────────
  const rootWords = [...byRoot.keys()];
  const rootByWord = new Map<string, { id: string; grade_band: string[]; grade: number | null; category: string; part_of_speech: string | null }>();
  const CHUNK = 1000;
  for (let i = 0; i < rootWords.length; i += CHUNK) {
    const chunk = rootWords.slice(i, i + CHUNK);
    const found = await prisma.word.findMany({
      where: { word: { in: chunk }, root_word_id: null },
      select: { id: true, word: true, grade_band: true, grade: true, category: true, part_of_speech: true },
    });
    for (const f of found) {
      rootByWord.set(f.word, { id: f.id, grade_band: f.grade_band, grade: f.grade, category: f.category, part_of_speech: f.part_of_speech });
    }
  }

  // ── takenWords: every word string already in the DB (roots + any forms) ──────
  const taken = new Set<string>();
  {
    const all = await prisma.word.findMany({ select: { word: true } });
    for (const w of all) taken.add(w.word);
  }

  const toCreate: {
    id: string; word: string; category: string; grade_band: string[]; grade: number | null;
    char_count: number; syllable_count: number; part_of_speech: string | null; root_word_id: string;
  }[] = [];
  const collisions: Collision[] = [];
  let rootsNotFound = 0;
  let skippedSelf = 0;
  let skippedOrthography = 0;

  // Process roots in a stable order so ids are deterministic across runs.
  for (const root of [...byRoot.keys()].sort((a, b) => a.localeCompare(b, "mn"))) {
    const rootRow = rootByWord.get(root);
    if (!rootRow) {
      rootsNotFound++;
      continue;
    }
    const forms = [...byRoot.get(root)!].sort((a, b) => a.localeCompare(b, "mn"));
    let seq = 0;
    for (const form of forms) {
      if (form === root) { skippedSelf++; continue; }
      if (!isAllMongolian(form) || !hasVowel(form)) { skippedOrthography++; continue; }
      if (taken.has(form)) { collisions.push({ form, wantedByRoot: root }); continue; }

      seq++;
      taken.add(form);
      toCreate.push({
        id: `${rootRow.id}-F${String(seq).padStart(2, "0")}`,
        word: form,
        category: rootRow.category,
        grade_band: rootRow.grade_band,
        grade: rootRow.grade,
        char_count: [...form].length,
        syllable_count: syllabify(form).length,
        part_of_speech: rootRow.part_of_speech,
        root_word_id: rootRow.id,
      });
    }
  }

  console.log("─── Plan ────────────────────────────────");
  console.log(`Roots matched in DB: ${rootByWord.size}`);
  console.log(`Roots not found (forms skipped): ${rootsNotFound}`);
  console.log(`Form rows to create: ${toCreate.length}`);
  console.log(`Skipped — form equals root: ${skippedSelf}`);
  console.log(`Skipped — orthography: ${skippedOrthography}`);
  console.log(`Collisions (existing word, logged for review): ${collisions.length}`);
  console.log("─────────────────────────────────────────\n");

  if (isDryRun) {
    const showAll = process.argv.includes("--full");
    const n = showAll ? toCreate.length : 12;
    console.log("Forms to create:", toCreate.slice(0, n).map((r) => `${r.word} → ${r.root_word_id} (${r.id})`));
    console.log(`\nAll collisions (${collisions.length}):`, collisions.map((c) => `${c.form} ⇐ ${c.wantedByRoot}`));
    return;
  }

  // ── Write: form rows ─────────────────────────────────────────────────────────
  let created = 0;
  for (let i = 0; i < toCreate.length; i += CHUNK) {
    const batch = toCreate.slice(i, i + CHUNK);
    await prisma.word.createMany({
      data: batch.map((r) => ({
        id: r.id,
        word: r.word,
        category: r.category,
        grade_band: r.grade_band,
        grade: r.grade,
        char_count: r.char_count,
        syllable_count: r.syllable_count,
        skill_tags: [],
        error_tags: [],
        image_ok: false,
        audio_ok: false,
        distractors: [],
        part_of_speech: r.part_of_speech,
        root_word_id: r.root_word_id,
      })),
    });
    created += batch.length;
  }

  // ── Write: collisions review log (overwritten each run) ──────────────────────
  const header = [
    "# Inflected forms NOT stored because the surface form already exists as another",
    "# word (a root, or a form already assigned to an earlier root). Review manually:",
    "# a collision may be a genuine homograph, or a form that should stay linked to a",
    "# different root. This script never mutates existing rows. TSV: form<TAB>wanted_by_root",
    "",
  ].join("\n");
  const body = collisions
    .sort((a, b) => a.form.localeCompare(b.form, "mn"))
    .map((c) => `${c.form}\t${c.wantedByRoot}`)
    .join("\n");
  fs.writeFileSync(COLLISIONS_FILE, header + body + "\n");

  console.log("─── Import Summary ──────────────────────");
  console.log(`Created form rows: ${created}`);
  console.log(`Collisions logged to word_form_collisions.txt: ${collisions.length}`);
  const roots = await prisma.word.count({ where: { root_word_id: null } });
  const total = await prisma.word.count();
  console.log(`Roots: ${roots}  |  Forms: ${total - roots}  |  Total words: ${total}`);
  console.log("─────────────────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
