import * as fs from "fs";
import * as path from "path";
import { parseFile } from "music-metadata";

const AUDIO_DIR = path.resolve(__dirname, "../audio");
const CSV_PATH = path.resolve(__dirname, "../audio/audio-queue.csv");

const MIN_SIZE_BYTES = 1000;
const MIN_DURATION_SEC = 0.3;

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

type Status = "PASS" | "FAIL" | "MISSING";

interface Result {
  filename: string;
  status: Status;
  reason?: string;
}

async function validateFile(filePath: string): Promise<{ status: Status; reason?: string }> {
  if (!fs.existsSync(filePath)) {
    return { status: "MISSING" };
  }

  const stat = fs.statSync(filePath);
  if (stat.size <= MIN_SIZE_BYTES) {
    return { status: "FAIL", reason: `size ${stat.size} bytes ≤ ${MIN_SIZE_BYTES}` };
  }

  try {
    const meta = await parseFile(filePath);
    const duration = meta.format.duration ?? 0;
    if (duration < MIN_DURATION_SEC) {
      return { status: "FAIL", reason: `duration ${duration.toFixed(2)}s < ${MIN_DURATION_SEC}s` };
    }
    return { status: "PASS" };
  } catch (err) {
    return { status: "FAIL", reason: `metadata parse error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function runValidation(): Promise<{ passed: number; failed: number; missing: number }> {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`audio-queue.csv not found. Run audioPlan.ts first.`);
    process.exit(1);
  }

  const rows = parseCsv(CSV_PATH);
  const results: Result[] = [];

  for (const row of rows) {
    const filePath = path.join(AUDIO_DIR, row.filename);
    const { status, reason } = await validateFile(filePath);
    results.push({ filename: row.filename, status, reason });

    const label = status === "PASS" ? "✓ PASS" : status === "MISSING" ? "✗ MISS" : "✗ FAIL";
    const detail = reason ? `  (${reason})` : "";
    console.log(`  ${label}  ${row.filename}${detail}`);
  }

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const missing = results.filter((r) => r.status === "MISSING").length;

  console.log(`\nSummary: ${passed} passed, ${failed} failed, ${missing} missing`);
  return { passed, failed, missing };
}

async function main() {
  console.log(`\nAudio Validation`);
  console.log(`================`);
  await runValidation();
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
}
