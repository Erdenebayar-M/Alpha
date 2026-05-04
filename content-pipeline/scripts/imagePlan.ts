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

  const seedWords = loadSeedWords();
  const tasks = loadTasks(sourceDir);
  const rows: QueueRow[] = [];

  for (const task of tasks) {
    for (const v of task.variants) {
      if (v.task_type !== "TT1_CHOICE" && v.task_type !== "TT2_FILL") continue;

      const vSuffix = variantSuffix(v.id);
      let word = "";

      if (v.task_type === "TT1_CHOICE") {
        word = v.correct_answer;
      } else if (v.task_type === "TT2_FILL") {
        word = String((v.options as { context_word?: string }).context_word ?? v.correct_answer);
      }

      if (!word) continue;

      const resolved = resolvePrompt(word, seedWords);
      if (!resolved) continue; // image_ok=false for this word

      rows.push({
        task_id: task.task_id,
        variant: vSuffix,
        type: v.task_type,
        word,
        base_word: resolved.baseWord,
        prompt_source: resolved.source,
        prompt: resolved.prompt,
        filename: `img_${task.task_id}-${vSuffix}.png`,
      });
    }
  }

  const headers = ["task_id", "variant", "type", "word", "base_word", "prompt_source", "prompt", "filename"];
  const csv = toCsv(headers, rows as unknown as Record<string, string>[]);
  const csvPath = path.join(IMAGES_DIR, "image-queue.csv");
  fs.writeFileSync(csvPath, csv, "utf8");

  const tt1 = rows.filter((r) => r.type === "TT1_CHOICE").length;
  const tt2 = rows.filter((r) => r.type === "TT2_FILL").length;
  const fromSeed = rows.filter((r) => r.prompt_source === "seed").length;
  const fromFallback = rows.filter((r) => r.prompt_source === "fallback").length;

  console.log(`\nImage Queue Plan`);
  console.log(`================`);
  console.log(`Source:          ${sourceDir}`);
  console.log(`Total images:    ${rows.length}`);
  console.log(`  TT1_CHOICE:    ${tt1}`);
  console.log(`  TT2_FILL:      ${tt2}`);
  console.log(`Prompt source:   ${fromSeed} from seed-words, ${fromFallback} fallback`);
  console.log(`Model:           dall-e-3 (OpenAI) — $0.04/image`);
  console.log(`\nOutput: ${csvPath}`);
}

main();
