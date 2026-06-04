import * as fs from "fs";
import * as path from "path";

const IMAGES_DIR = path.resolve(__dirname, "../images");
const SEED_WORDS_PATH = path.resolve(__dirname, "../generated/seed-words.json");

interface SeedWord {
  id: string;
  word: string;
  image_ok: boolean;
  image_prompt?: string;
}

interface Variant {
  id: string;
  task_type: string;
  correct_answer: string;
  options: Record<string, unknown>;
  image_url: string | null;
  grade_band?: string[];
}

interface TaskFile {
  task_id: string;
  variants: Variant[];
}

interface QueueRow {
  task_id: string;
  variant: string;
  type: string;
  word: string;
  base_word: string;
  prompt_source: string;
  prompt: string;
  filename: string;
  grade_band: string;
}

function variantSuffix(variantId: string): string {
  const match = variantId.match(/-v(\d+)$/);
  return match ? `v${match[1]}` : "v1";
}

function loadSeedWords(): Map<string, SeedWord> {
  if (!fs.existsSync(SEED_WORDS_PATH)) return new Map();
  const { words } = JSON.parse(fs.readFileSync(SEED_WORDS_PATH, "utf8")) as {
    words: SeedWord[];
  };
  return new Map(words.map((w) => [w.word, w]));
}

interface PromptResult {
  prompt: string;
  source: "seed" | "fallback";
  baseWord: string;
}

function findSeedEntry(word: string, seedWords: Map<string, SeedWord>): SeedWord | null {
  // Exact match
  const exact = seedWords.get(word);
  if (exact) return exact;

  // Prefix match — Mongolian words inflect by suffix (ном→номоо, гэр→гэртээ)
  // Sort by word length descending so longer matches win
  const candidates = [...seedWords.values()]
    .filter((d) => word.startsWith(d.word) && d.word.length >= 2)
    .sort((a, b) => b.word.length - a.word.length);

  return candidates[0] ?? null;
}

function resolvePrompt(word: string, seedWords: Map<string, SeedWord>): PromptResult | null {
  const seed = findSeedEntry(word, seedWords);

  if (seed) {
    // If seed says no image, skip this word entirely
    if (!seed.image_ok) return null;
    if (seed.image_prompt) {
      return { prompt: seed.image_prompt, source: "seed", baseWord: seed.word };
    }
  }

  // Fallback — use English so DALL-E generates better results
  return {
    prompt: `A simple, clear illustration of "${word}" for a children's Mongolian spelling app`,
    source: "fallback",
    baseWord: word,
  };
}

function loadTasks(sourceDir: string): TaskFile[] {
  const files = fs.readdirSync(sourceDir).filter(
    (f) => f.endsWith(".json") && !f.startsWith("_")
  );
  return files.flatMap((f) => {
    const raw = JSON.parse(fs.readFileSync(path.join(sourceDir, f), "utf8"));
    // stage2 files are arrays; validated files are objects with task_id + variants
    if (Array.isArray(raw)) {
      if (raw.length === 0) return [];
      const taskId = raw[0].id.replace(/-v\d+$/, "");
      return [{ task_id: taskId, variants: raw as Variant[] }];
    }
    return [raw as TaskFile];
  });
}

function toCsv(headers: string[], rows: Record<string, string>[]): string {
  const escape = (v: string): string => {
    const s = v.replace(/\r?\n/g, " ").trim();
    return s.includes(",") || s.includes('"')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(String(row[h] ?? ""))).join(","));
  }
  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const sourceArg = args.find((a, i) => args[i - 1] === "--source") ?? "validated";
  const sourceDir = path.resolve(__dirname, `../${sourceArg}`);

  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory not found: ${sourceDir}`);
    process.exit(1);
  }

  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  fs.mkdirSync(path.join(IMAGES_DIR, "generated"), { recursive: true });

  const CHOICE_TYPES      = new Set(["TT_LISTEN_CHOOSE","TT_IMAGE_WORD_MATCH","TT_CHOOSE_CORRECT","TT_SIMPLE_SUFFIX","TT_WORD_FORM_CHOOSE","TT_SUFFIX_CHOOSE","TT_CONSONANT_CONFUSION","TT_LONG_VOWEL_CHALLENGE","TT_CASE_SUFFIX","TT_MIXED_REVIEW","TT_MIXED_WORD_SET","TT_MIXED_CHECKPOINT"]);
  const FILL_TYPES        = new Set(["TT_LETTER_FILL","TT_FILL_WRITE","TT_MISSING_LETTER","TT_WORD_ENDING","TT_LONG_VOWEL_FILL","TT_REDUCED_VOWEL","TT_SUFFIX_WRITE","TT_COMPOUND_SUFFIX","TT_SENTENCE_FILL","TT_LONG_VOWEL_IN_SENTENCE","TT_REDUCED_VOWEL_IN_SENTENCE"]);
  // TT_1_3: letters → images (right side), TT_3_3: images → words (left side)
  const MATCH_PAIRS_IMAGE_SIDE: Record<string, "left" | "right"> = { TT_1_3: "right", TT_3_3: "left" };
  const seedWords = loadSeedWords();
  const tasks = loadTasks(sourceDir);
  const rows: QueueRow[] = [];

  for (const task of tasks) {
    for (const v of task.variants) {
      const vSuffix = variantSuffix(v.id);

      if (CHOICE_TYPES.has(v.task_type) || FILL_TYPES.has(v.task_type)) {
        let word = "";

        if (CHOICE_TYPES.has(v.task_type)) {
          word = v.correct_answer;
        } else if (FILL_TYPES.has(v.task_type)) {
          // context_word is often an inflected/verb form (e.g. "бэлчинэ", "ажилдаа").
          // Only generate an image when the word has an explicit seed entry with image_ok=true.
          // Fallback (auto-prompt) is skipped for TT2_FILL — abstract words produce bad images.
          word = String((v.options as { context_word?: string }).context_word ?? v.correct_answer);
        }

        if (!word) continue;

        const resolved = resolvePrompt(word, seedWords);
        if (!resolved) continue; // image_ok=false for this word

        // Skip TT2_FILL words that only have a fallback prompt — they are typically
        // verbs, adjectives, or inflected forms that cannot be meaningfully illustrated.
        if (FILL_TYPES.has(v.task_type) && resolved.source === "fallback") continue;

        rows.push({
          task_id: task.task_id,
          variant: vSuffix,
          type: v.task_type,
          word,
          base_word: resolved.baseWord,
          prompt_source: resolved.source,
          prompt: resolved.prompt,
          filename: `img_${task.task_id}-${vSuffix}.png`,
          grade_band: JSON.stringify(v.grade_band ?? []),
        });

      } else if (v.task_type in MATCH_PAIRS_IMAGE_SIDE) {
        const imageSide = MATCH_PAIRS_IMAGE_SIDE[v.task_type];
        const opts = v.options as { pairs?: Array<{ left: string; right: string }>; image_side?: string };
        const pairs = opts.pairs ?? [];

        for (let i = 0; i < pairs.length; i++) {
          const pair = pairs[i];
          const word = imageSide === "left" ? pair.left : pair.right;
          if (!word) continue;

          const resolved = resolvePrompt(word, seedWords);
          if (!resolved) continue;

          rows.push({
            task_id: task.task_id,
            variant: `${vSuffix}-p${i}`,
            type: v.task_type,
            word,
            base_word: resolved.baseWord,
            prompt_source: resolved.source,
            prompt: resolved.prompt,
            filename: `img_${task.task_id}-${vSuffix}-p${i}.png`,
            grade_band: JSON.stringify(v.grade_band ?? []),
          });
        }
      }
    }
  }

  const headers = ["task_id", "variant", "type", "word", "base_word", "prompt_source", "prompt", "filename", "grade_band"];
  const csv = toCsv(headers, rows as unknown as Record<string, string>[]);
  const csvPath = path.join(IMAGES_DIR, "image-queue.csv");
  fs.writeFileSync(csvPath, csv, "utf8");

  const tt1 = rows.filter((r) => CHOICE_TYPES.has(r.type)).length;
  const tt2 = rows.filter((r) => FILL_TYPES.has(r.type)).length;
  const ttM = rows.filter((r) => r.type in MATCH_PAIRS_IMAGE_SIDE).length;
  const fromSeed = rows.filter((r) => r.prompt_source === "seed").length;
  const fromFallback = rows.filter((r) => r.prompt_source === "fallback").length;

  console.log(`\nImage Queue Plan`);
  console.log(`================`);
  console.log(`Source:            ${sourceDir}`);
  console.log(`Total images:      ${rows.length}`);
  console.log(`  Choice types:    ${tt1}`);
  console.log(`  Fill types:      ${tt2}`);
  console.log(`  Match-pairs:     ${ttM}`);
  console.log(`Prompt source:   ${fromSeed} from seed-words, ${fromFallback} fallback`);
  console.log(`Model:           flux.2-klein-4b (OpenRouter) — ~$0.003/image`);
  console.log(`\nOutput: ${csvPath}`);
}

main();
