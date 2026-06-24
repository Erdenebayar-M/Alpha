/*
 * Reusable word-bank import logic for classified-word spreadsheets
 * (e.g. docs/grade1_words_classified.xlsx).
 *
 * Pure / side-effect-free: parsing, filtering and mapping are split out so both
 * the CLI (prisma/importWordBank.ts) and the admin upload route
 * (routes/content.ts → POST /words/import) can reuse them.
 */

import * as XLSX from "xlsx";
import { syllabify } from "../error-engine/mongolian-utils";

// Complete Mongolian Cyrillic alphabet. (mongolian-utils' isVowel/isConsonant
// omit я/ю/ы because they target error-classification, not alphabet validation,
// so they are NOT reused here.)
const MN_VOWELS = new Set([..."аэиоуөүеёяюы"]);
const MN_CONSONANTS = new Set([..."бвгджзйклмнпрстфхцчшщъь"]);

// Sheet + column names as they appear in the source spreadsheets.
const SHEET_CLASSIFIED = "Ангилсан_үгс";
const SHEET_REVIEW = "Хянах_үгс";

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

/** One raw row from the classified sheet, after light normalisation. */
export interface ClassifiedRow {
  no: number;
  word: string;
  grade: number | null; // null when the sheet uses a non-numeric grade like "MVP"
  grade_raw: string;    // the raw "Анги" cell (e.g. "1" or "MVP"), kept for the id prefix
  app_level: string;
  meaning_complexity: number | null;
  spelling_complexity: number | null;
  morph_complexity: number | null;
  suggested_exercises: string;
  spelling_tag: string;
  topic: string;
  part_of_speech: string;
  meaning_type: string;
}

/** A row dropped during filtering, with the reason why. */
export interface DroppedRow {
  no: number;
  word: string;
  reason: "review" | "duplicate" | "orthography";
  detail?: string;
}

export interface FilterResult {
  kept: ClassifiedRow[];
  dropped: DroppedRow[];
}

/** Shape ready to upsert into the Prisma `Word` model. */
export interface WordRecord {
  id: string;
  word: string;
  category: string;
  grade_band: string[];
  char_count: number;
  syllable_count: number;
  skill_tags: string[];
  error_tags: string[];
  image_ok: boolean;
  audio_ok: boolean;
  image_prompt: string | null;
  audio_text: string | null;
  sample_sentence: string | null;
  distractors: string[];
  blank_hint: string | null;
  grade: number | null;
  app_level: string | null;
  meaning_complexity: number | null;
  spelling_complexity: number | null;
  morph_complexity: number | null;
  suggested_exercises: string | null;
  spelling_tag: string | null;
  part_of_speech: string | null;
  meaning_type: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function intOrNull(v: unknown): number | null {
  const s = str(v);
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** Every character is a Mongolian Cyrillic letter (vowel or consonant). */
function isAllMongolian(word: string): boolean {
  return [...word.toLowerCase()].every((ch) => MN_VOWELS.has(ch) || MN_CONSONANTS.has(ch));
}

function hasVowel(word: string): boolean {
  return [...word.toLowerCase()].some((ch) => MN_VOWELS.has(ch));
}

/**
 * Id / delete-scope prefix for a dataset: `WG{grade}` for a numeric grade,
 * else `W{sanitised rawGrade}` (e.g. "MVP" → "WMVP"). Single source of truth
 * for both record ids and the replace-by-prefix delete in the import route.
 */
export function wordBankPrefix(grade: number | null, rawGrade?: string): string {
  if (grade != null) return `WG${grade}`;
  const slug = (rawGrade ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return slug ? `W${slug}` : "WGX";
}

/** Count dropped rows by reason. */
export function summarizeFilter(dropped: DroppedRow[]): {
  removed_review: number;
  removed_duplicate: number;
  removed_orthography: number;
} {
  return {
    removed_review: dropped.filter((d) => d.reason === "review").length,
    removed_duplicate: dropped.filter((d) => d.reason === "duplicate").length,
    removed_orthography: dropped.filter((d) => d.reason === "orthography").length,
  };
}

/** Dataset grade + prefix derived from the first parsed row (files are single-grade). */
export function datasetInfo(rows: ClassifiedRow[]): { grade: number | null; prefix: string } {
  const first = rows[0];
  const grade = first?.grade ?? null;
  return { grade, prefix: wordBankPrefix(grade, first?.grade_raw) };
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

export interface ParsedWorkbook {
  rows: ClassifiedRow[];
  reviewNos: Set<number>;
}

/**
 * Reads the classified + review sheets from a workbook.
 * Accepts a file path (string) or a raw buffer (for uploads).
 */
export function parseClassifiedWorkbook(source: string | Buffer): ParsedWorkbook {
  const wb =
    typeof source === "string"
      ? XLSX.readFile(source)
      : XLSX.read(source, { type: "buffer" });

  const classified = wb.Sheets[SHEET_CLASSIFIED];
  if (!classified) {
    throw new Error(`Sheet "${SHEET_CLASSIFIED}" not found (have: ${wb.SheetNames.join(", ")})`);
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(classified, { defval: "" });
  const rows: ClassifiedRow[] = rawRows
    .map((r) => ({
      no: intOrNull(r[COL.no]) ?? 0,
      word: str(r[COL.word]),
      grade: intOrNull(r[COL.grade]),
      grade_raw: str(r[COL.grade]),
      app_level: str(r[COL.appLevel]),
      meaning_complexity: intOrNull(r[COL.meaningComplexity]),
      spelling_complexity: intOrNull(r[COL.spellingComplexity]),
      morph_complexity: intOrNull(r[COL.morphComplexity]),
      suggested_exercises: str(r[COL.suggestedExercises]),
      spelling_tag: str(r[COL.spellingTag]),
      topic: str(r[COL.topic]),
      part_of_speech: str(r[COL.partOfSpeech]),
      meaning_type: str(r[COL.meaningType]),
    }))
    .filter((r) => r.word !== "");

  // The review sheet flags rows by their № in the classified sheet.
  const reviewNos = new Set<number>();
  const reviewSheet = wb.Sheets[SHEET_REVIEW];
  if (reviewSheet) {
    const reviewRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(reviewSheet, { defval: "" });
    for (const r of reviewRows) {
      const n = intOrNull(r[COL.no]);
      if (n != null) reviewNos.add(n);
    }
  }

  return { rows, reviewNos };
}

// ─── Filtering ───────────────────────────────────────────────────────────────

/**
 * Applies, in order: review removal (by №) → dedup (by word) → aggressive
 * auto-remove (non-Mongolian characters, or no vowel). Every drop is recorded.
 */
export function filterWords(rows: ClassifiedRow[], reviewNos: Set<number>): FilterResult {
  const kept: ClassifiedRow[] = [];
  const dropped: DroppedRow[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (reviewNos.has(row.no)) {
      dropped.push({ no: row.no, word: row.word, reason: "review" });
      continue;
    }
    if (seen.has(row.word)) {
      dropped.push({ no: row.no, word: row.word, reason: "duplicate" });
      continue;
    }
    if (!isAllMongolian(row.word)) {
      dropped.push({ no: row.no, word: row.word, reason: "orthography", detail: "non-Mongolian character" });
      continue;
    }
    if (!hasVowel(row.word)) {
      dropped.push({ no: row.no, word: row.word, reason: "orthography", detail: "no vowel" });
      continue;
    }
    seen.add(row.word);
    kept.push(row);
  }

  return { kept, dropped };
}

// ─── Mapping ─────────────────────────────────────────────────────────────────

/**
 * Maps a kept row to a `Word` record. `seq` is a stable index used only for the
 * id; pass the position within the sorted, filtered list so re-imports are
 * idempotent. `idPrefix` defaults to `wordBankPrefix(grade, grade_raw)`.
 */
export function toWordRecord(row: ClassifiedRow, seq: number, idPrefix?: string): WordRecord {
  const prefix = idPrefix ?? wordBankPrefix(row.grade, row.grade_raw);
  const id = `${prefix}-${String(seq).padStart(4, "0")}`;
  return {
    id,
    word: row.word,
    category: row.topic,
    grade_band: row.grade != null ? [`G${row.grade}`] : [],
    char_count: [...row.word].length,
    syllable_count: syllabify(row.word).length,
    skill_tags: [],
    error_tags: [],
    image_ok: false,
    audio_ok: false,
    image_prompt: null,
    audio_text: null,
    sample_sentence: null,
    distractors: [],
    blank_hint: null,
    grade: row.grade,
    app_level: row.app_level || null,
    meaning_complexity: row.meaning_complexity,
    spelling_complexity: row.spelling_complexity,
    morph_complexity: row.morph_complexity,
    suggested_exercises: row.suggested_exercises || null,
    spelling_tag: row.spelling_tag || null,
    part_of_speech: row.part_of_speech || null,
    meaning_type: row.meaning_type || null,
  };
}

/**
 * Convenience: kept rows → Word records with deterministic ids assigned over a
 * stable (word-sorted) order so re-runs reproduce the same ids. `idPrefix`
 * defaults to the dataset's prefix so a whole file shares one prefix.
 */
export function toWordRecords(kept: ClassifiedRow[], idPrefix?: string): WordRecord[] {
  const prefix = idPrefix ?? datasetInfo(kept).prefix;
  const sorted = [...kept].sort((a, b) => a.word.localeCompare(b.word, "mn"));
  return sorted.map((row, i) => toWordRecord(row, i + 1, prefix));
}
