import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import "dotenv/config";

const TTS_DIR = path.resolve(__dirname, "../audio/tts");
const CSV_PATH = path.resolve(__dirname, "../audio/tts-queue.csv");
const LOG_PATH = path.resolve(__dirname, "../audio/tts-generation-log.json");
const ERRORS_PATH = path.resolve(__dirname, "../audio/tts-errors.json");

const MODEL = "gemini-3.1-flash-tts-preview";

// Gemini TTS returns raw PCM (linear16). We must add a WAV header to make it playable.
function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, channels = 1, bitDepth = 16): Buffer {
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);                             // PCM chunk size
  header.writeUInt16LE(1, 20);                              // PCM format
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * (bitDepth / 8), 28); // byte rate
  header.writeUInt16LE(channels * (bitDepth / 8), 32);     // block align
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmBuffer]);
}
const STYLE_PROMPT =
  "You are reading instructions for a Mongolian spelling app for children aged 6-10. " +
  "Speak clearly, at a calm and friendly pace, in Mongolian.";
const DICTATION_PROMPT = "Read each word clearly with a pause between them.";

// Cost constants (Gemini TTS pricing)
const INPUT_COST_PER_M_TOKENS = 1.0;
const OUTPUT_AUDIO_COST_PER_M_TOKENS = 20.0;
const AUDIO_TOKENS_PER_SECOND = 32;
const AVG_SECONDS_PER_FILE = 5;

interface CsvRow {
  task_id: string;
  variant: string;
  text: string;
  voice: string;
  language_code: string;
  filename: string;
  dictation_text: string;
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
  language: string;
  voice: string;
  files: LogEntry[];
}

function parseCsv(filePath: string): CsvRow[] {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n").filter((l) => l.trim());
  const headers = lines[0].split(",");

  return lines.slice(1).map((line) => {
    // Handle quoted fields with commas
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
    headers.forEach((h, i) => { row[h.trim()] = (fields[i] ?? "").trim(); });
    return row as unknown as CsvRow;
  });
}

function estimateCost(count: number): number {
  const audioTokens = count * AVG_SECONDS_PER_FILE * AUDIO_TOKENS_PER_SECOND;
  const inputTokens = count * 50; // ~50 tokens per prompt
  const cost =
    (audioTokens / 1_000_000) * OUTPUT_AUDIO_COST_PER_M_TOKENS +
    (inputTokens / 1_000_000) * INPUT_COST_PER_M_TOKENS;
  return Math.round(cost * 10000) / 10000;
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateOne(
  ai: GoogleGenAI,
  row: CsvRow,
  errors: unknown[]
): Promise<"success" | "failed"> {
  const useDictation = row.dictation_text && row.dictation_text.length > 0;
  const rawText = useDictation ? row.dictation_text : row.text;
  const prefix = useDictation ? DICTATION_PROMPT + " " : STYLE_PROMPT + " ";
  const spokenText = prefix + rawText;

  const outputFilename = row.filename.replace(".mp3", ".wav");
  const outputPath = path.join(TTS_DIR, outputFilename);

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: spokenText }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: row.voice },
            },
            languageCode: row.language_code,
          },
        },
      } as Parameters<typeof ai.models.generateContent>[0]);

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (audioData?.data) {
        const pcm = Buffer.from(audioData.data, "base64");
        // Parse sample rate from mimeType e.g. "audio/pcm;rate=24000"
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
  const track2Only = args.includes("--track2-only");

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`tts-queue.csv not found. Run audioPlan.ts first.`);
    process.exit(1);
  }

  let rows = parseCsv(CSV_PATH);

  if (onlyId) {
    rows = rows.filter((r) => r.task_id === onlyId || r.filename.includes(onlyId));
    if (rows.length === 0) {
      console.error(`No rows found for task_id "${onlyId}"`);
      process.exit(1);
    }
  }

  if (track2Only) {
    console.log("--track2-only: using all TTS rows (Track 1 CSVs untouched)");
  }

  const estimatedCost = estimateCost(rows.length);

  console.log(`\nGemini TTS Generation Plan`);
  console.log(`==========================`);
  console.log(`Model:     ${MODEL}`);
  console.log(`Voice:     Kore`);
  console.log(`Language:  mn-MN`);
  console.log(`Files:     ${rows.length}`);
  console.log(`Est. cost: $${estimatedCost} (at avg ${AVG_SECONDS_PER_FILE}s/file)`);
  console.log(`Output:    ${TTS_DIR}`);

  if (isDryRun) {
    console.log(`\n[DRY RUN] Would generate ${rows.length} files:`);
    rows.forEach((r) => {
      const wav = r.filename.replace(".mp3", ".wav");
      console.log(`  ${wav}  —  "${r.text.slice(0, 60)}${r.text.length > 60 ? "…" : ""}"`);
    });
    console.log(`\nDry run complete. No API calls made.`);
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error(`\nERROR: GEMINI_API_KEY not set in .env`);
    console.error(`Add it to .env: GEMINI_API_KEY=AIza...`);
    console.error(`Get a free key at: https://aistudio.google.com`);
    process.exit(1);
  }

  if (!onlyId) {
    const ok = await confirm(
      `\nProceed with generating ${rows.length} files (~$${estimatedCost})? [y/N] `
    );
    if (!ok) {
      console.log("Aborted.");
      return;
    }
  }

  fs.mkdirSync(TTS_DIR, { recursive: true });

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const errors: unknown[] = [];
  const logFiles: LogEntry[] = [];
  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const wav = row.filename.replace(".mp3", ".wav");
    const outPath = path.join(TTS_DIR, wav);

    if (fs.existsSync(outPath)) {
      console.log(`${i + 1}/${rows.length} — ${row.task_id} — skipped (exists)`);
      skipped++;
      logFiles.push({ task_id: row.task_id, filename: wav, status: "skipped" });
      continue;
    }

    const status = await generateOne(ai, row, errors);
    console.log(`${i + 1}/${rows.length} — ${row.task_id} — ${status}`);

    if (status === "success") success++;
    else failed++;

    logFiles.push({ task_id: row.task_id, filename: wav, status });

    // Rate limiting: 1s between calls (free tier: 10 RPM)
    if (i < rows.length - 1) await sleep(1000);
  }

  const log: GenerationLog = {
    total: rows.length,
    success,
    failed,
    skipped,
    estimated_cost_usd: estimatedCost,
    model: MODEL,
    language: "mn-MN",
    voice: "Kore",
    files: logFiles,
  };

  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2), "utf8");

  if (errors.length > 0) {
    const existing = fs.existsSync(ERRORS_PATH)
      ? JSON.parse(fs.readFileSync(ERRORS_PATH, "utf8"))
      : [];
    fs.writeFileSync(
      ERRORS_PATH,
      JSON.stringify([...existing, ...errors], null, 2),
      "utf8"
    );
  }

  console.log(`\nDone: ${success} success, ${failed} failed, ${skipped} skipped`);
  console.log(`Log: ${LOG_PATH}`);
  if (errors.length > 0) console.log(`Errors: ${ERRORS_PATH}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
