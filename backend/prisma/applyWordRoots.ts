/*
 * Phase 2/3 of root-grouping: turn the LLM lemma cache (docs/word_lemmas.json,
 * built by lemmatizeWords.ts) into root↔form links across the whole word bank.
 *
 * For each current root row (root_word_id: null) we take its dictionary-form
 * lemma. Words whose lemma differs from themselves become forms of that lemma;
 * the lemma row is reused if it exists, otherwise a new root row is created
 * (WLEM-#### prefix). Single-level only: a word is never both a root and a form,
 * and a demoted word's own forms are re-pointed up to the new root.
 *
 *   --dry-run (default)  → write docs/word_root_groups_review.txt, touch nothing
 *   --apply              → create roots, link members, clear their capability
 *                          arrays (forms are non-eligible), re-point sub-forms
 *
 * Guardrails: members with lemma confidence < MIN_CONF stay standalone; a lemma
 * that is itself another word's form, or fails orthography, is skipped. All
 * skips are listed in the review file for manual follow-up.
 */
if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PROD_SEED) {
  console.error("Refusing to run root-grouping apply in production.");
  process.exit(1);
}

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma";
import { isAllMongolian, hasVowel } from "../src/lib/word-bank/import";
import { syllabify } from "../src/lib/error-engine/mongolian-utils";
import type { LemmaEntry } from "./lemmatizeWords";

const isApply = process.argv.includes("--apply");
const MIN_CONF = 0.7;
const CHUNK = 500;

const CACHE_FILE = path.join(__dirname, "../../../docs/word_lemmas.json");
const REVIEW_FILE = path.join(__dirname, "../../../docs/word_root_groups_review.txt");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

interface Row {
  id: string;
  word: string;
  root_word_id: string | null;
  grade_band: string[];
  grade: number | null;
  category: string;
  part_of_speech: string | null;
}

function mode<T>(vals: T[], skip: (v: T) => boolean): T | undefined {
  const counts = new Map<T, number>();
  for (const v of vals) { if (skip(v)) continue; counts.set(v, (counts.get(v) ?? 0) + 1); }
  let best: T | undefined; let n = 0;
  for (const [v, c] of counts) if (c > n) { n = c; best = v; }
  return best;
}

interface Group {
  lemma: string;
  rootId: string;        // existing row id, or the planned WLEM id
  create: boolean;       // true → root row must be created
  members: Row[];        // rows to demote to forms of the root
}

async function main() {
  if (!fs.existsSync(CACHE_FILE)) {
    console.error(`Lemma cache not found: ${CACHE_FILE}\nRun lemmatizeWords.ts first.`);
    process.exit(1);
  }
  const cache: Record<string, LemmaEntry> = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));

  const all: Row[] = await prisma.word.findMany({
    select: { id: true, word: true, root_word_id: true, grade_band: true, grade: true, category: true, part_of_speech: true },
  });
  const byWord = new Map<string, Row>();
  for (const r of all) byWord.set(r.word, r);
  const roots = all.filter((r) => r.root_word_id === null);

  // ── Classify each root word by its cached lemma ─────────────────────────────
  const memberLemma = new Map<string, string>(); // word → target lemma (word != lemma)
  const unprocessed: string[] = [];
  const lowConf: { word: string; lemma: string; conf: number }[] = [];

  for (const r of roots) {
    const entry = cache[r.word];
    if (!entry) { unprocessed.push(r.word); continue; }
    const lemma = entry.lemma.trim();
    if (lemma === r.word) continue; // its own dictionary form → a root, nothing to do
    if (entry.confidence < MIN_CONF) { lowConf.push({ word: r.word, lemma, conf: entry.confidence }); continue; }
    memberLemma.set(r.word, lemma);
  }

  // ── Build groups keyed by target lemma ──────────────────────────────────────
  const targets = new Set(memberLemma.values());
  const skipped: { lemma: string; reason: string; members: string[] }[] = [];
  const groups: Group[] = [];
  let lemSeq = 0;

  // First pass: resolve root id / create flag per lemma.
  for (const lemma of [...targets].sort((a, b) => a.localeCompare(b, "mn"))) {
    let members = roots.filter((r) => memberLemma.get(r.word) === lemma);
    const existing = byWord.get(lemma);

    if (existing) {
      if (existing.root_word_id !== null) {
        skipped.push({ lemma, reason: "lemma is itself a form of another word", members: members.map((m) => m.word) });
        continue;
      }
      groups.push({ lemma, rootId: existing.id, create: false, members });
    } else {
      if (!isAllMongolian(lemma) || !hasVowel(lemma)) {
        skipped.push({ lemma, reason: "lemma fails orthography (non-Mongolian / no vowel)", members: members.map((m) => m.word) });
        continue;
      }
      const id = `WLEM-${String(++lemSeq).padStart(4, "0")}`;
      groups.push({ lemma, rootId: id, create: true, members });
    }
  }

  // Enforce single level: a word that is a resolved root must never also be a
  // member of another group. Root status wins; drop such memberships + flag.
  const rootWords = new Set(groups.map((g) => g.lemma));
  const conflicts: { word: string; keptRoot: string; droppedLemma: string }[] = [];
  for (const g of groups) {
    g.members = g.members.filter((m) => {
      if (rootWords.has(m.word)) {
        conflicts.push({ word: m.word, keptRoot: m.word, droppedLemma: g.lemma });
        return false;
      }
      // idempotent: skip members already linked to this root
      if (m.root_word_id === g.rootId) return false;
      return true;
    });
  }
  const actionable = groups.filter((g) => g.members.length > 0);

  const toCreate = actionable.filter((g) => g.create);
  const toLink = actionable.filter((g) => !g.create);
  const totalMembers = actionable.reduce((n, g) => n + g.members.length, 0);

  console.log("─── Root-grouping plan ──────────────────");
  console.log(`Root rows scanned: ${roots.length}`);
  console.log(`Not yet lemmatized (run lemmatizeWords): ${unprocessed.length}`);
  console.log(`Low confidence (< ${MIN_CONF}, left standalone): ${lowConf.length}`);
  console.log(`Groups needing a NEW root: ${toCreate.length}`);
  console.log(`Groups linking to an EXISTING root: ${toLink.length}`);
  console.log(`Words to demote to forms: ${totalMembers}`);
  console.log(`Conflicts (root also proposed as a form — kept as root): ${conflicts.length}`);
  console.log(`Skipped lemmas (orthography / lemma-is-form): ${skipped.length}`);
  console.log("─────────────────────────────────────────\n");

  // ── Dry-run: write the review file, touch nothing ───────────────────────────
  if (!isApply) {
    const L: string[] = [];
    L.push("# Proposed root groupings from LLM lemmatization (docs/word_lemmas.json).");
    L.push("# Review before applying: `npx ts-node prisma/applyWordRoots.ts --apply`.");
    L.push("# docs/ is not committed (Hard Rule #5).");
    L.push("");
    L.push(`## SECTION A — NEW roots to create (${toCreate.length}) [Hard Rule: vocabulary derived from existing words, human-review gated]`);
    for (const g of toCreate.sort((a, b) => a.lemma.localeCompare(b.lemma, "mn")))
      L.push(`  + ${g.lemma}  (${g.rootId})  ⇐  ${g.members.map((m) => m.word).join(", ")}`);
    L.push("");
    L.push(`## SECTION B — link to EXISTING root (${toLink.length})`);
    for (const g of toLink.sort((a, b) => a.lemma.localeCompare(b.lemma, "mn")))
      L.push(`  ${g.lemma}  (${g.rootId})  ⇐  ${g.members.map((m) => m.word).join(", ")}`);
    L.push("");
    L.push(`## SECTION C — skipped / left standalone`);
    L.push(`# Low confidence (${lowConf.length}):`);
    for (const x of lowConf.sort((a, b) => a.word.localeCompare(b.word, "mn"))) L.push(`  ? ${x.word} → ${x.lemma} (conf ${x.conf.toFixed(2)})`);
    L.push(`# Conflicts kept as roots (${conflicts.length}):`);
    for (const c of conflicts) L.push(`  ! ${c.word} — kept as root, not demoted under ${c.droppedLemma}`);
    L.push(`# Skipped lemmas (${skipped.length}):`);
    for (const s of skipped) L.push(`  x ${s.lemma} [${s.reason}] ⇐ ${s.members.join(", ")}`);
    L.push(`# Not yet lemmatized (${unprocessed.length}):`);
    L.push(`  ${unprocessed.slice(0, 200).join(", ")}${unprocessed.length > 200 ? " …" : ""}`);
    L.push("");
    fs.writeFileSync(REVIEW_FILE, L.join("\n"));
    console.log(`[DRY RUN] Review file written: ${REVIEW_FILE}`);
    console.log(`Sample new roots:`, toCreate.slice(0, 6).map((g) => `${g.lemma}⇐${g.members.map((m) => m.word).join("/")}`));
    console.log(`Sample links:`, toLink.slice(0, 6).map((g) => `${g.lemma}⇐${g.members.map((m) => m.word).join("/")}`));
    return;
  }

  // ── Apply ───────────────────────────────────────────────────────────────────
  // 1. Create new root rows.
  const createData = toCreate.map((g) => {
    const m = g.members;
    const gradeBand = [...new Set(m.flatMap((x) => x.grade_band))].sort();
    const grades = m.map((x) => x.grade).filter((x): x is number => x != null);
    return {
      id: g.rootId,
      word: g.lemma,
      category: mode(m.map((x) => x.category), (v) => !v) ?? "",
      grade_band: gradeBand,
      grade: grades.length ? Math.min(...grades) : null,
      char_count: [...g.lemma].length,
      syllable_count: syllabify(g.lemma).length,
      skill_tags: [], error_tags: [], image_ok: false, audio_ok: false, distractors: [],
      part_of_speech: mode(m.map((x) => x.part_of_speech), (v) => v == null) ?? null,
    };
  });
  for (let i = 0; i < createData.length; i += CHUNK) {
    await prisma.word.createMany({ data: createData.slice(i, i + CHUNK) });
  }

  // 2 & 3. Per group: re-point any sub-forms of members up to the root, then
  //        demote members (link + clear capability so forms stay non-eligible).
  let linked = 0;
  let repointed = 0;
  for (const g of actionable) {
    const memberIds = g.members.map((m) => m.id);
    for (let i = 0; i < memberIds.length; i += CHUNK) {
      const idsChunk = memberIds.slice(i, i + CHUNK);
      const rp = await prisma.word.updateMany({
        where: { root_word_id: { in: idsChunk } },
        data: { root_word_id: g.rootId },
      });
      repointed += rp.count;
      const up = await prisma.word.updateMany({
        where: { id: { in: idsChunk } },
        data: {
          root_word_id: g.rootId,
          skills_possible: [], errors_possible: [], task_types_possible: [],
          primary_feature: null, primary_skill: null,
        },
      });
      linked += up.count;
    }
  }

  const rootsNow = await prisma.word.count({ where: { root_word_id: null } });
  const formsNow = await prisma.word.count({ where: { root_word_id: { not: null } } });
  console.log("─── Applied ─────────────────────────────");
  console.log(`New root rows created: ${createData.length}`);
  console.log(`Words demoted to forms: ${linked}`);
  console.log(`Sub-forms re-pointed to new root: ${repointed}`);
  console.log(`Roots now: ${rootsNow} | Forms now: ${formsNow} | Total: ${rootsNow + formsNow}`);
  console.log("─────────────────────────────────────────");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
