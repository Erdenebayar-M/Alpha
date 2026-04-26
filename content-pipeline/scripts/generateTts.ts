import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../backend/.env") });

const AUDIO_DIR = path.resolve(__dirname, "../audio");
const CSV_PATH = path.resolve(__dirname, "../audio/audio-queue.csv");
const LOG_PATH = path.resolve(__dirname, "../audio/audio-generation-log.json");
const ERRORS_PATH = path.resolve(__dirname, "../audio/audio-errors.json");

const MODEL = "gemini-3.1-flash-tts-preview";
const RATE_LIMIT_MS = 1200;
const COST_CAP_USD = 5;

const SYSTEM_DICTATION =
  "Read the following Mongolian words clearly for a children's spelling dictation. " +
  "Speak each word at natural pace. Mongolian long vowels must be pronounced as clearly doubled.";

const SYSTEM_PROMPT =
  "Read the following Mongolian instruction clearly for a children's spelling app aged 6-10. " +
  "Calm, friendly, clear pace.";

function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, channels = 1, bitDepth = 16): Buffer {
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * (bitDepth / 8), 28);
  header.writeUInt16LE(channels * (bitDepth / 8), 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmBuffer]);
}

interface CsvRow {
  task_id: string;
  variant: string;
  slot: string;
  text: string;
  voice: string;
  language_code: string;
  filename: string;
  type: string;
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
  estimated_cost_usd: number;
  model: string;
  voice: string;
  language: string;
  files?: LogEntry[];
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

function estimateCost(count: number): number {
  const audioTokens = count * 5 * 32;   // 5s avg × 32 tokens/s
  const inputTokens = count * 60;        // ~60 tokens per prompt
  const cost =
    (audioTokens / 1_000_000) * 20.0 +
    (inputTokens / 1_000_000) * 1.0;
  return Math.round(cost * 10000) / 10000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase() === "y" || ans.trim().toLowerCase() === "yes");
    });
  });
}

async function generateOne(
  ai: GoogleGenAI,
  row: CsvRow,
  errors: unknown[]
): Promise<"success" | "failed"> {
  const system = row.slot === "dictation" ? SYSTEM_DICTATION : SYSTEM_PROMPT;
  const spokenText = `${system}\n\n${row.text}`;
  const outputPath = path.join(AUDIO_DIR, row.filename);

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: spokenText }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: row.voice } },
            languageCode: row.language_code,
          },
        },
      } as Parameters<typeof ai.models.generateContent>[0]);

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (audioData?.data) {
        const pcm = Buffer.from(audioData.data, "base64");
        const rateMatch = audioData.mimeType?.match(/rate=(\d+)/);
        const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
        const wav = pcmToWav(pcm, sampleRate);
        fs.writeFileSync(outputPath, wav);
        return "success";
      } else {
        throw new Error("No audio data in response");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === 1 && msg.includes("429")) {
        console.log(`  429 rate limit — waiting 6s then retrying...`);
        await sleep(6000);
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
  const onlyId = args.find((a, i) => args[i - 1] === "--only");
  const slotFilter = args.find((a, i) => args[i - 1] === "--slot");

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`audio-queue.csv not found at ${CSV_PATH}`);
    console.error(`Run audioPlan.ts first: npx tsx content-pipeline/scripts/audioPlan.ts`);
    process.exit(1);
  }

  let rows = parseCsv(CSV_PATH);

  if (onlyId) {
    rows = rows.filter((r) => r.task_id === onlyId);
    if (rows.length === 0) {
      console.error(`No rows found for task_id "${onlyId}" in audio-queue.csv`);
      const ids = [...new Set(parseCsv(CSV_PATH).map((r) => r.task_id))].slice(0, 5).join(", ");
      console.error(`Available task IDs (first 5): ${ids}`);
      process.exit(1);
    }
  }

  if (slotFilter) {
    if (slotFilter !== "dictation" && slotFilter !== "prompt") {
      console.error(`--slot must be "dictation" or "prompt"`);
      process.exit(1);
    }
    rows = rows.filter((r) => r.slot === slotFilter);
    if (rows.length === 0) {
      console.log(`No rows with slot="${slotFilter}" in audio-queue.csv.`);
      process.exit(0);
    }
  }

  const estimatedCost = estimateCost(rows.length);
  const dictCount = rows.filter((r) => r.slot === "dictation").length;
  const promptCount = rows.filter((r) => r.slot === "prompt").length;

  console.log(`\nGemini TTS Generation`);
  console.log(`=====================`);
  console.log(`Model:      ${MODEL}`);
  console.log(`Voice:      Kore  |  Language: mn-MN`);
  console.log(`Files:      ${rows.length} total (${dictCount} dictation, ${promptCount} prompt)`);
  console.log(`Est. cost:  $${estimatedCost}`);
  console.log(`Output dir: ${AUDIO_DIR}`);
  if (slotFilter) console.log(`Slot filter: --slot ${slotFilter}`);
  if (onlyId)    console.log(`Task filter: --only ${onlyId}`);

  if (isDryRun) {
    console.log(`\n[DRY RUN] Would generate ${rows.length} files:`);
    rows.forEach((r) => {
      const preview = r.text.slice(0, 55) + (r.text.length > 55 ? "…" : "");
      console.log(`  [${r.slot.padEnd(9)}] ${r.filename.padEnd(35)} "${preview}"`);
    });
    console.log(`\nDry run complete. No API calls made.`);
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error(`\nERROR: GEMINI_API_KEY not set in .env`);
    process.exit(1);
  }

  if (estimatedCost > COST_CAP_USD) {
    const ok = await confirm(
      `\nWARNING: Estimated cost $${estimatedCost} exceeds $${COST_CAP_USD} cap.\nProceed anyway? [y/N] `
    );
    if (!ok) { console.log("Aborted."); return; }
  } else if (!onlyId) {
    const ok = await confirm(
      `\nProceed with generating ${rows.length} files (~$${estimatedCost})? [y/N] `
    );
    if (!ok) { console.log("Aborted."); return; }
  }

  fs.mkdirSync(AUDIO_DIR, { recursive: true });

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const errors: unknown[] = [];
  const logFiles: LogEntry[] = [];
  let success = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const outPath = path.join(AUDIO_DIR, row.filename);

    if (fs.existsSync(outPath)) {
      console.log(`${i + 1}/${rows.length} — ${row.filename} — skipped (exists)`);
      logFiles.push({ task_id: row.task_id, filename: row.filename, status: "skipped" });
      continue;
    }

    console.log(`${i + 1}/${rows.length} — ${row.filename} [${row.slot}]…`);
    const status = await generateOne(ai, row, errors);
    console.log(`  → ${status}`);

    if (status === "success") success++;
    else failed++;

    logFiles.push({ task_id: row.task_id, filename: row.filename, status });

    if (i < rows.length - 1) await sleep(RATE_LIMIT_MS);
  }

  const log: GenerationLog = {
    total: rows.length,
    success,
    failed,
    estimated_cost_usd: estimatedCost,
    model: MODEL,
    voice: "Kore",
    language: "mn-MN",
    files: logFiles,
  };
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2), "utf8");

  if (errors.length > 0) {
    const existing = fs.existsSync(ERRORS_PATH)
      ? JSON.parse(fs.readFileSync(ERRORS_PATH, "utf8"))
      : [];
    fs.writeFileSync(ERRORS_PATH, JSON.stringify([...existing, ...errors], null, 2), "utf8");
  }

  console.log(`\nDone: ${success} success, ${failed} failed`);
  console.log(`Log: ${LOG_PATH}`);
  if (errors.length > 0) console.log(`Errors: ${ERRORS_PATH}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
