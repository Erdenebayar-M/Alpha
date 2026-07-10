/*
 * Import docs/grade2_words_mvp9_corrected_full.xlsx into the `words` table.
 *
 * Unlike the grade-1 / MVP-9 workbooks, this file has:
 *   - Two data sheets ("2-р анги_MVP9" + "2-р анги_Бусад"), both imported.
 *   - An "Анги" column of the form "2-р анги" (not a bare number) — grade is
 *     extracted as the leading integer.
 *   - A "Хянах" column that flags classification-confidence ("Дунд" vs
 *     "Өндөр"), not word validity — per user decision (2026-07-10 session)
 *     it is NOT used to drop rows, unlike the old workbooks' review sheet.
 *   - A "Хассан_хэлбэр" sheet of already-excluded forms (particles/stopwords)
 *     that never appear in the two data sheets — nothing to do with it here.
 *
 * Words already present in the `words` table (any grade/prefix) are not
 * duplicated: their grade_band gets "G2" unioned in if missing. Only genuinely
 * new words get a new WG2-#### row. New words not found in the words/khk or
 * words/monwn reference lists are appended to
 * docs/words_not_in_reference_list.txt for manual review (never auto-removed
 * on that signal alone — see 2026-07-10 cleanup learnings).
 *
 * Usage:
 *   npx ts-node prisma/importGrade2WordBank.ts --dry-run   # report only
 *   npx ts-node prisma/importGrade2WordBank.ts             # write
 */
if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PROD_SEED) {
  console.error("Cannot run word-bank import in production!");
  process.exit(1);
}

import "dotenv/config";
import * as path from "path";
import * as fs from "fs";
import * as XLSX from "xlsx";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma";
import { isAllMongolian, hasVowel, toWordRecords, type ClassifiedRow } from "../src/lib/word-bank/import";

const isDryRun = process.argv.includes("--dry-run");

const FILE = path.join(__dirname, "../../../docs/grade2_words_mvp9_corrected_full.xlsx");
const REF_LIST_FILE = path.join(__dirname, "../../../docs/words_not_in_reference_list.txt");
const KHK_FILE = path.join(__dirname, "../../../words/khk/khk");
const MONWN_FILE = path.join(__dirname, "../../../words/monwn/wn-data-mon.tsv");

const DATA_SHEETS = ["2-р анги_MVP9", "2-р анги_Бусад"] as const;

const COL = {
  no: "№",
  word: "Үндсэн үг",
  grade: "Анги",
  appLevel: "Апп түвшин",
  meaningComplexity: "Утгын төвөгшил",
  spellingComplexity: "Зөв бичих төвөгшил",
  morphComplexity: "Морфологийн төвөгшил",
  suggestedExercises: "Санал болгох дасгал",
  spellingTag: "Зөв бичих tag",
  topic: "Сэдэв",
  partOfSpeech: "Үгийн аймаг",
  meaningType: "Утгын төрөл",
} as const;

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function intOrNull(v: unknown): number | null {
  const s = str(v);
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** "2-р анги" → 2. Falls back to plain-integer parsing for safety. */
function extractGrade(raw: string): number | null {
  const m = raw.match(/\d+/);
  if (m) return Number(m[0]);
  return intOrNull(raw);
}

// ─── Reference vocab (words/khk + words/monwn) ─────────────────────────────

function loadReferenceVocab(): Set<string> {
  const vocab = new Set<string>();

  const khk = fs.readFileSync(KHK_FILE, "utf-8");
  for (const line of khk.split("\n")) {
    const [lemma, form] = line.split("\t");
    if (lemma) vocab.add(lemma.trim().toLowerCase());
    if (form) vocab.add(form.trim().toLowerCase());
  }

  const monwn = fs.readFileSync(MONWN_FILE, "utf-8");
  for (const line of monwn.split("\n")) {
    const parts = line.split("\t");
    if (parts[1]?.trim() === "mon:lemma" && parts[2]) {
      const w = parts[2].trim().toLowerCase();
      if (!w.includes(" ")) vocab.add(w);
    }
  }

  return vocab;
}

function loadExistingRefListWords(): Set<string> {
  const words = new Set<string>();
  if (!fs.existsSync(REF_LIST_FILE)) return words;
  const content = fs.readFileSync(REF_LIST_FILE, "utf-8");
  for (const line of content.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const [, word] = line.split("\t");
    if (word) words.add(word.trim());
  }
  return words;
}

// ─── Parsing ────────────────────────────────────────────────────────────────

interface RawRow extends ClassifiedRow {
  sheet: string;
}

function parseDataSheets(): RawRow[] {
  const wb = XLSX.readFile(FILE);
  const rows: RawRow[] = [];

  for (const sheetName of DATA_SHEETS) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found (have: ${wb.SheetNames.join(", ")})`);

    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    for (const r of rawRows) {
      const word = str(r[COL.word]);
      if (word === "") continue;
      const gradeRaw = str(r[COL.grade]);
      const grade = extractGrade(gradeRaw);
      rows.push({
        sheet: sheetName,
        no: intOrNull(r[COL.no]) ?? 0,
        word,
        grade,
        // toWordRecords' parseGradeBand only understands bare integers /
        // comma lists (e.g. "1" or "1,2,3,4"), not free text like "2-р анги" —
        // normalise to the bare number so grade_band comes out ["G2"].
        grade_raw: grade != null ? String(grade) : gradeRaw,
        app_level: str(r[COL.appLevel]),
        meaning_complexity: intOrNull(r[COL.meaningComplexity]),
        spelling_complexity: intOrNull(r[COL.spellingComplexity]),
        morph_complexity: intOrNull(r[COL.morphComplexity]),
        suggested_exercises: str(r[COL.suggestedExercises]),
        spelling_tag: str(r[COL.spellingTag]),
        topic: str(r[COL.topic]),
        part_of_speech: str(r[COL.partOfSpeech]),
        meaning_type: str(r[COL.meaningType]),
      });
    }
  }
  return rows;
}

interface DroppedRow {
  sheet: string;
  no: number;
  word: string;
  reason: "duplicate" | "orthography";
  detail?: string;
}

function filterRows(rows: RawRow[]): { kept: RawRow[]; dropped: DroppedRow[] } {
  const kept: RawRow[] = [];
  const dropped: DroppedRow[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (seen.has(row.word)) {
      dropped.push({ sheet: row.sheet, no: row.no, word: row.word, reason: "duplicate" });
      continue;
    }
    if (!isAllMongolian(row.word)) {
      dropped.push({ sheet: row.sheet, no: row.no, word: row.word, reason: "orthography", detail: "non-Mongolian character" });
      continue;
    }
    if (!hasVowel(row.word)) {
      dropped.push({ sheet: row.sheet, no: row.no, word: row.word, reason: "orthography", detail: "no vowel" });
      continue;
    }
    seen.add(row.word);
    kept.push(row);
  }

  return { kept, dropped };
}

// ─── Main ───────────────────────────────────────────────────────────────────

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  if (isDryRun) console.log("[DRY RUN] No writes will be made.\n");
  if (!fs.existsSync(FILE)) {
    console.error(`File not found: ${FILE}`);
    process.exit(1);
  }
  console.log(`Source: ${FILE}\n`);

  const rawRows = parseDataSheets();
  const { kept, dropped } = filterRows(rawRows);
  const dupCount = dropped.filter((d) => d.reason === "duplicate").length;
  const orthoCount = dropped.filter((d) => d.reason === "orthography").length;

  console.log(`Parsed rows (both sheets): ${rawRows.length}`);
  console.log(`Removed (duplicate within file): ${dupCount}`);
  console.log(`Removed (orthography): ${orthoCount}  ${dropped.filter((d) => d.reason === "orthography").map((d) => `${d.word} (${d.detail})`).join(", ")}`);
  console.log(`Kept: ${kept.length}\n`);

  // ── Cross-reference against existing DB words ────────────────────────────
  const keptWords = kept.map((r) => r.word);
  const existingByWord = new Map<string, { id: string; grade_band: string[] }>();
  const CHUNK = 1000;
  for (let i = 0; i < keptWords.length; i += CHUNK) {
    const chunk = keptWords.slice(i, i + CHUNK);
    const found = await prisma.word.findMany({
      where: { word: { in: chunk } },
      select: { id: true, word: true, grade_band: true },
    });
    for (const f of found) existingByWord.set(f.word, { id: f.id, grade_band: f.grade_band });
  }

  const toMerge: { id: string; word: string; grade_band: string[] }[] = [];
  const newRows: ClassifiedRow[] = [];

  for (const row of kept) {
    const existing = existingByWord.get(row.word);
    if (existing) {
      if (!existing.grade_band.includes("G2")) {
        toMerge.push({ id: existing.id, word: row.word, grade_band: [...existing.grade_band, "G2"] });
      }
    } else {
      newRows.push(row);
    }
  }

  console.log(`Already in DB (grade_band merge candidates): ${existingByWord.size}`);
  console.log(`  → need G2 added: ${toMerge.length}`);
  console.log(`  → already have G2: ${existingByWord.size - toMerge.length}`);
  console.log(`New words to insert: ${newRows.length}\n`);

  const newRecords = toWordRecords(newRows, "WG2");

  // ── Reference-list check (new words only; existing words already assessed) ─
  const refVocab = loadReferenceVocab();
  const alreadyLogged = loadExistingRefListWords();
  const notInRef = newRecords.filter((r) => !refVocab.has(r.word.toLowerCase()) && !alreadyLogged.has(r.word));
  console.log(`New words not found in words/khk or words/monwn: ${notInRef.length}\n`);

  if (isDryRun) {
    console.log("Sample merges:", toMerge.slice(0, 5));
    console.log("Sample new records:", newRecords.slice(0, 5).map((r) => ({ id: r.id, word: r.word })));
    console.log("Sample not-in-ref:", notInRef.slice(0, 10).map((r) => r.word));
    return;
  }

  // ── Write: merges ──────────────────────────────────────────────────────────
  let mergedCount = 0;
  for (const m of toMerge) {
    await prisma.word.update({ where: { id: m.id }, data: { grade_band: m.grade_band } });
    mergedCount++;
  }

  // ── Write: new inserts ──────────────────────────────────────────────────────
  let createdCount = 0;
  for (const rec of newRecords) {
    const { id, ...data } = rec;
    await prisma.word.create({ data: { id, ...data } });
    createdCount++;
  }

  // ── Write: reference-list log ────────────────────────────────────────────
  if (notInRef.length > 0) {
    const lines = notInRef
      .map((r) => `${r.id}\t${r.word}\t${r.category}\t${r.part_of_speech ?? ""}`)
      .join("\n");
    fs.appendFileSync(REF_LIST_FILE, "\n" + lines + "\n");
  }

  console.log("─── Import Summary ──────────────────────");
  console.log(`Merged (G2 added to grade_band): ${mergedCount}`);
  console.log(`Created (new WG2-* rows): ${createdCount}`);
  console.log(`Logged to words_not_in_reference_list.txt: ${notInRef.length}`);
  const total = await prisma.word.count();
  console.log(`Total words in DB now: ${total}`);
  console.log("─────────────────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
