import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../backend/.env") });

const IMAGES_DIR = path.resolve(__dirname, "../images");
const GENERATED_DIR = path.join(IMAGES_DIR, "generated");
const CSV_PATH = path.join(IMAGES_DIR, "image-queue.csv");
const LOG_PATH = path.join(IMAGES_DIR, "image-generation-log.json");
const ERRORS_PATH = path.join(IMAGES_DIR, "image-errors.json");

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const MODEL = "black-forest-labs/flux.2-klein-4b";
const COST_PER_IMAGE = 0.003;
const COST_CAP_USD = 5;

interface CsvRow {
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

interface LogEntry {
  task_id: string;
  filename: string;
  status: "success" | "failed" | "skipped";
  error?: string;
}

interface GenerationLog {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  estimated_cost_usd: number;
  model: string;
  files: LogEntry[];
}

function parseCsv(filePath: string): CsvRow[] {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n").filter((l) => l.trim());
  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const fields: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuote = !inQuote; }
      } else if (ch === "," && !inQuote) {
        fields.push(cur); cur = "";
      } else {
        cur += ch;
      }
    }
    fields.push(cur);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (fields[i] ?? "").trim(); });
    return row as unknown as CsvRow;
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildMongolianImagePrompt(subject: string, gradeBand?: string[]): string {
  const isGrade1_2 = !gradeBand || gradeBand.length === 0 || gradeBand.includes("G12") || gradeBand.includes("G1") || gradeBand.includes("G2");

  const mongolianElements = {
    nature: "Mongolian landscape with blue sky, mountains, steppe grass",
    culture: "wearing traditional Mongolian deel, ger tent, or Mongolian patterns",
    colors: "warm earthy tones with bright accent colors",
    style: "soft, friendly, illustrated style suitable for young children",
  };

  const complexity = isGrade1_2
    ? "simple shapes, bold outlines, cheerful mood"
    : "more detailed, scenic background, educational focus";

  return (
    `Illustrate the following for a Mongolian children's book (grades 1-4): ${subject}. ` +
    `Style: ${mongolianElements.style}, ${complexity}. ` +
    `Include Mongolian cultural elements (${mongolianElements.culture}). ` +
    `Colors: ${mongolianElements.colors}. ` +
    `Setting: ${mongolianElements.nature}. ` +
    `No text or labels. Bright, educational, culturally authentic.`
  );
}

async function generateOne(
  client: OpenAI,
  row: CsvRow,
  errors: unknown[]
): Promise<"success" | "failed"> {
  const outputPath = path.join(GENERATED_DIR, row.filename);

  let gradeBand: string[] = [];
  try { gradeBand = JSON.parse(row.grade_band || "[]"); } catch { /* leave empty */ }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Translate the Mongolian word to English for FLUX
      const translationChat = await client.chat.completions.create({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: `Translate to English for image generation. Return only the English word or short phrase, nothing else: "${row.word}"` }],
      });
      const englishSubject = translationChat.choices[0]?.message?.content?.trim() ?? row.word;

      const fullPrompt = buildMongolianImagePrompt(englishSubject, gradeBand);

      const chat = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: fullPrompt }],
      });

      const choice = chat.choices[0];
      const images = (choice?.message as { images?: { image_url?: { url?: string } }[] })?.images;
      const dataUri = images?.[0]?.image_url?.url ?? "";
      const b64 = dataUri.includes(",") ? dataUri.split(",")[1] : "";

      if (b64) {
        fs.writeFileSync(outputPath, Buffer.from(b64, "base64"));
        return "success";
      } else {
        throw new Error(`No image data found. Response: ${JSON.stringify(chat).slice(0, 400)}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit = msg.includes("429") || msg.includes("rate_limit");

      if (attempt < 3 && isRateLimit) {
        const wait = 5000 * attempt;
        console.log(`  rate limit (attempt ${attempt}) — waiting ${wait / 1000}s...`);
        await sleep(wait);
        continue;
      }
      errors.push({ task_id: row.task_id, filename: row.filename, error: msg, attempt });
      return "failed";
    }
  }
  return "failed";
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const showPrompts = args.includes("--show-prompts");
  const onlyId = args.find((a, i) => args[i - 1] === "--only");

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`image-queue.csv not found at ${CSV_PATH}`);
    console.error("Run imagePlan.ts first.");
    process.exit(1);
  }

  let rows = parseCsv(CSV_PATH);
  if (onlyId) rows = rows.filter((r) => r.task_id === onlyId);

  const todo = rows.filter((r) => !fs.existsSync(path.join(GENERATED_DIR, r.filename)));
  const skippedCount = rows.length - todo.length;

  const estCost = todo.length * COST_PER_IMAGE;
  console.log(`\nImage Generation`);
  console.log(`================`);
  console.log(`Model:     ${MODEL}`);
  console.log(`Queued:    ${rows.length} | To generate: ${todo.length} | Skipped: ${skippedCount}`);
  console.log(`Est. cost: $${estCost.toFixed(2)} (cap: $${COST_CAP_USD})`);

  if (estCost > COST_CAP_USD) {
    console.error(`\nCost estimate ($${estCost.toFixed(2)}) exceeds cap ($${COST_CAP_USD}). Aborting.`);
    process.exit(1);
  }

  if (isDryRun) {
    console.log("\n[DRY RUN] No files will be written.");
    for (const row of todo) {
      if (showPrompts) {
        let gradeBand: string[] = [];
        try { gradeBand = JSON.parse(row.grade_band || "[]"); } catch { /* leave empty */ }
        const examplePrompt = buildMongolianImagePrompt(`[translated: ${row.word}]`, gradeBand);
        console.log(`\n  ${row.filename}`);
        console.log(`    word:       ${row.word} (base: ${row.base_word}, source: ${row.prompt_source})`);
        console.log(`    grade_band: ${row.grade_band}`);
        console.log(`    prompt:     ${examplePrompt}`);
      } else {
        console.log(`  ${row.filename}  word="${row.word}"  grade_band=${row.grade_band}  source=${row.prompt_source}`);
      }
    }
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("OPENROUTER_API_KEY not set in backend/.env");
    process.exit(1);
  }

  const client = new OpenAI({ baseURL: OPENROUTER_BASE_URL, apiKey });
  fs.mkdirSync(GENERATED_DIR, { recursive: true });

  const errors: unknown[] = [];
  const logEntries: LogEntry[] = rows
    .filter((r) => fs.existsSync(path.join(GENERATED_DIR, r.filename)))
    .map((r) => ({ task_id: r.task_id, filename: r.filename, status: "skipped" as const }));

  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < todo.length; i++) {
    const row = todo[i];
    console.log(`[${i + 1}/${todo.length}] ${row.filename} (${row.word})...`);

    const result = await generateOne(client, row, errors);
    logEntries.push({ task_id: row.task_id, filename: row.filename, status: result });

    if (result === "success") {
      successCount++;
      console.log(`  ✓ saved`);
    } else {
      failedCount++;
      console.log(`  ✗ failed`);
    }
  }

  const log: GenerationLog = {
    total: rows.length,
    success: successCount,
    failed: failedCount,
    skipped: skippedCount,
    estimated_cost_usd: successCount * COST_PER_IMAGE,
    model: MODEL,
    files: logEntries,
  };
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2), "utf8");
  if (errors.length > 0) {
    fs.writeFileSync(ERRORS_PATH, JSON.stringify(errors, null, 2), "utf8");
  }

  console.log(`\nDone: ${successCount} generated, ${failedCount} failed, ${skippedCount} skipped`);
  console.log(`Actual cost: ~$${(successCount * COST_PER_IMAGE).toFixed(3)}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
