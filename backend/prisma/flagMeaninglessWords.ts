/*
 * Meaning-check: cross-reference every active word against the words/ reference
 * corpora and flag those with no meaning found (candidates for manual deletion).
 *
 * Sources (read-only):
 *   words/khk/khk            — lemma + inflected-form paradigms (tab-separated)
 *   words/monwn/wn-data-mon.tsv — Mongolian WordNet: mon:lemma + mon:def glosses
 *
 * NEVER auto-deletes: khk/monwn are incomplete, so absence ≠ meaningless (see the
 * 2026-07-10 cleanup learnings). We only WRITE A REVIEW LIST. The user then
 * soft-deletes chosen rows via the admin UI (DELETE /words/:id?mode=…).
 *
 * A "malformed" heuristic additionally flags truncated junk (words with no vowel
 * in their first two characters, e.g. рийг, лбэрийн, йцэтгэж — words missing their
 * leading letters) which are the clearest deletion targets.
 *
 * Usage: npx ts-node prisma/flagMeaninglessWords.ts
 */
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma";

const KHK_FILE = path.join(__dirname, "../../../words/khk/khk");
const MONWN_FILE = path.join(__dirname, "../../../words/monwn/wn-data-mon.tsv");
const OUT_FILE = path.join(__dirname, "../../../docs/words_no_meaning_review.txt");

const MN_VOWELS = new Set([..."аэиоуөүеёяюы"]);

/** Truncated-junk heuristic: no vowel within the first two characters. */
function isMalformed(word: string): boolean {
  const chars = [...word.toLowerCase()];
  return !chars.slice(0, 2).some((ch) => MN_VOWELS.has(ch));
}

function loadKhk(): Set<string> {
  const vocab = new Set<string>();
  for (const line of fs.readFileSync(KHK_FILE, "utf-8").split("\n")) {
    const [lemma, form] = line.split("\t");
    if (lemma) vocab.add(lemma.trim().toLowerCase());
    if (form) vocab.add(form.trim().toLowerCase());
  }
  return vocab;
}

function loadMonwn(): { lemmas: Set<string>; defs: Map<string, string> } {
  const lemmas = new Set<string>();
  const synsetLemma = new Map<string, string>(); // synset → first lemma
  const synsetDef = new Map<string, string>();    // synset → def gloss
  for (const line of fs.readFileSync(MONWN_FILE, "utf-8").split("\n")) {
    const [synset, rel, value] = line.split("\t");
    if (!synset || !rel || !value) continue;
    if (rel === "mon:lemma") {
      const w = value.trim().toLowerCase();
      lemmas.add(w);
      if (!synsetLemma.has(synset)) synsetLemma.set(synset, w);
    } else if (rel.startsWith("mon:def")) {
      if (!synsetDef.has(synset)) synsetDef.set(synset, value.trim());
    }
  }
  // lemma → gloss, via shared synset id
  const defs = new Map<string, string>();
  for (const [synset, lemma] of synsetLemma) {
    const d = synsetDef.get(synset);
    if (d && !defs.has(lemma)) defs.set(lemma, d);
  }
  return { lemmas, defs };
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  console.log("Loading reference corpora…");
  const khk = loadKhk();
  const { lemmas: monwn, defs } = loadMonwn();
  console.log(`  khk vocab: ${khk.size} | monwn lemmas: ${monwn.size} | monwn defs: ${defs.size}\n`);

  const words = await prisma.word.findMany({
    where: { is_active: true },
    select: { id: true, word: true, root_word_id: true },
    orderBy: { word: "asc" },
  });

  const rows: string[] = [];
  let malformedCount = 0;
  for (const w of words) {
    const lc = w.word.toLowerCase();
    const inKhk = khk.has(lc);
    const inMonwn = monwn.has(lc);
    if (inKhk || inMonwn) continue; // has a meaning/paradigm somewhere → keep
    const malformed = isMalformed(w.word);
    if (malformed) malformedCount++;
    const kind = w.root_word_id === null ? "root" : "form";
    rows.push(`${w.word}\t${w.id}\t${kind}\t${malformed ? "MALFORMED" : "no-meaning"}`);
  }

  const header = [
    "# Active words NOT found in words/khk or words/monwn — candidates for manual deletion.",
    "# NOT auto-deleted (reference lists are incomplete). Soft-delete chosen rows in the",
    "# admin Words tab (DELETE /words/:id?mode=solo|detach|cascade).",
    "# MALFORMED = no vowel in first two chars (truncated junk e.g. рийг, лбэрийн).",
    "# TSV: word<TAB>id<TAB>root|form<TAB>MALFORMED|no-meaning",
    "",
  ].join("\n");
  fs.writeFileSync(OUT_FILE, header + rows.join("\n") + "\n");

  console.log("─── Meaning-check summary ───────────────");
  console.log(`Active words scanned: ${words.length}`);
  console.log(`Not found in khk/monwn: ${rows.length}`);
  console.log(`  of which MALFORMED (truncated): ${malformedCount}`);
  console.log(`Review file: ${OUT_FILE}`);
  console.log("─────────────────────────────────────────");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
