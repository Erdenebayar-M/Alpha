/*
 * Phase 1 of root-grouping: LLM-lemmatize every root word in the bank.
 *
 * For each `root_word_id: null` word we ask the LLM for its dictionary-form
 * lemma (verbs → -х infinitive: аваад/авав/авъя → авах; nouns → nominative
 * singular: нэрийн/нэрд → нэр). Results are cached to docs/word_lemmas.json so
 * the run is resumable and Phase 2 (applyWordRoots.ts) can consume it offline.
 *
 * Reuses the OpenRouter (OpenAI SDK) pattern from
 * content-pipeline/scripts/llmGenerate.ts. No DB writes — read-only over `words`,
 * writes only the cache file. Human review happens in Phase 2, never here.
 *
 * Usage:
 *   npx ts-node prisma/lemmatizeWords.ts --max-cost 3     # cap spend at $3
 *   npx ts-node prisma/lemmatizeWords.ts --batch 60       # smaller batches
 */
if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PROD_SEED) {
  console.error("Refusing to run LLM lemmatization in production.");
  process.exit(1);
}

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import OpenAI from "openai";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma";

// ─── Args / constants ─────────────────────────────────────────────────────────

function flag(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i !== -1 && i + 1 < process.argv.length ? process.argv[i + 1] : null;
}
const MAX_COST = (() => { const v = flag("--max-cost"); return v ? parseFloat(v) : 5; })();
const BATCH = (() => { const v = flag("--batch"); return v ? parseInt(v, 10) : 80; })();

const MODEL = "google/gemini-2.5-flash";
const TEMPERATURE = 0;
const MAX_TOKENS = 8000;
const RATE_LIMIT_MS = 1000;
const COST_PER_M_IN = 0.15;
const COST_PER_M_OUT = 0.6;

const CACHE_FILE = path.join(__dirname, "../../../docs/word_lemmas.json");

export interface LemmaEntry {
  lemma: string;
  pos: string;
  confidence: number;
}
type Cache = Record<string, LemmaEntry>;

const SYSTEM_PROMPT =
  "You are a precise morphological lemmatizer for Khalkha Mongolian (Cyrillic script). " +
  "Given surface word forms, return each word's DICTIONARY (citation) form:\n" +
  "- Verbs → the infinitive ending in -х (аваад, авав, авъя, авлаа → авах; ирнэ, ирээд → ирэх).\n" +
  "- Nouns/adjectives/numerals → nominative singular with no case/plural/possessive suffix " +
  "(нэрийн, нэрд, нэрээс → нэр; модны, модон → мод).\n" +
  "- If the word is ALREADY its dictionary form, return it unchanged.\n" +
  "- Preserve exact Cyrillic spelling. NEVER invent a lemma you are unsure of — in that case " +
  "return the word itself with a low confidence.\n" +
  "Return STRICT JSON only: an array of {\"word\":..,\"lemma\":..,\"pos\":..,\"confidence\":0-1}, " +
  "pos ∈ verb|noun|adjective|numeral|pronoun|adverb|other, same words as the input.";

// ─── JSON extraction (from llmGenerate.ts) ────────────────────────────────────

function extractJson(raw: string): unknown {
  const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const startBrace = stripped.indexOf("{");
  const startBracket = stripped.indexOf("[");
  const start = Math.min(
    startBrace === -1 ? Infinity : startBrace,
    startBracket === -1 ? Infinity : startBracket,
  );
  if (start === Infinity) throw new Error("No JSON found in response");
  return JSON.parse(stripped.slice(start));
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// ─── Main ─────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) { console.error("OPENROUTER_API_KEY not set in backend/.env"); process.exit(1); }
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: { "HTTP-Referer": "http://localhost:3000", "X-Title": "Mongolian Writing App - Lemmatize" },
  });

  const words = await prisma.word.findMany({
    where: { root_word_id: null },
    select: { word: true },
    orderBy: { word: "asc" },
  });

  const cache: Cache = fs.existsSync(CACHE_FILE)
    ? JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"))
    : {};

  const todo = words.map((w) => w.word).filter((w) => !(w in cache));
  console.log(`Root words: ${words.length} | cached: ${words.length - todo.length} | to do: ${todo.length}`);
  console.log(`Model ${MODEL} · batch ${BATCH} · cost cap $${MAX_COST.toFixed(2)}\n`);

  let cost = 0;
  let done = 0;
  for (let i = 0; i < todo.length; i += BATCH) {
    if (cost >= MAX_COST) { console.log(`\n⚠ Cost cap $${MAX_COST} reached ($${cost.toFixed(4)}). Stopping; re-run to continue.`); break; }
    const batch = todo.slice(i, i + BATCH);
    const userPrompt = `Lemmatize these ${batch.length} Mongolian words. Return the JSON array only.\n${JSON.stringify(batch)}`;

    let content = "";
    try {
      const res = await client.chat.completions.create({
        model: MODEL, max_tokens: MAX_TOKENS, temperature: TEMPERATURE,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }],
      });
      content = res.choices[0]?.message?.content ?? "";
      const u = res.usage as Record<string, number> | undefined;
      cost += ((u?.prompt_tokens ?? 0) / 1e6) * COST_PER_M_IN + ((u?.completion_tokens ?? 0) / 1e6) * COST_PER_M_OUT;
    } catch (e) {
      console.error(`  batch ${i / BATCH} API error:`, e instanceof Error ? e.message : e);
      await sleep(RATE_LIMIT_MS);
      continue;
    }

    let parsed: unknown;
    try { parsed = extractJson(content); } catch { console.error(`  batch ${i / BATCH}: unparseable response, skipping`); await sleep(RATE_LIMIT_MS); continue; }
    if (!Array.isArray(parsed)) { console.error(`  batch ${i / BATCH}: response not an array, skipping`); await sleep(RATE_LIMIT_MS); continue; }

    for (const row of parsed as Array<Record<string, unknown>>) {
      const word = typeof row.word === "string" ? row.word.trim() : "";
      const lemma = typeof row.lemma === "string" ? row.lemma.trim() : "";
      if (!word || !lemma || !batch.includes(word)) continue;
      const conf = typeof row.confidence === "number" ? row.confidence : Number(row.confidence);
      cache[word] = {
        lemma,
        pos: typeof row.pos === "string" ? row.pos.trim() : "other",
        confidence: Number.isFinite(conf) ? Math.max(0, Math.min(1, conf)) : 0.5,
      };
      done++;
    }

    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 0));
    process.stdout.write(`\r  lemmatized ${done}/${todo.length}  ·  cost $${cost.toFixed(4)}   `);
    await sleep(RATE_LIMIT_MS);
  }

  console.log(`\n\nDone. Cache: ${CACHE_FILE}`);
  console.log(`Total cached now: ${Object.keys(cache).length} / ${words.length} root words · spend $${cost.toFixed(4)}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
