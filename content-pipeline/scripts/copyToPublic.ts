import * as fs from "fs";
import * as path from "path";
import { runValidation } from "./validateAudio";

const AUDIO_DIR = path.resolve(__dirname, "../audio");
const CSV_PATH = path.resolve(__dirname, "../audio/audio-queue.csv");
const PUBLIC_AUDIO_DIR = path.resolve(__dirname, "../../public/audio");

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

// Map variant filename back to the DB task id (e.g. "G12-002-v1" from task_id + variant)
function toVariantId(taskId: string, variant: string): string {
  return `${taskId}-${variant}`;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const skipDb = args.includes("--skip-db");

  console.log(`\nCopy Audio to Public`);
  console.log(`====================`);
  if (isDryRun) console.log(`[DRY RUN] No files will be written or DB updated.`);

  // Step 1: validate — abort if any MISSING
  console.log(`\nStep 1: Validating audio files...`);
  const { missing } = await runValidation();
  if (missing > 0) {
    console.error(`\nAborted: ${missing} files are MISSING. Run generateTts.ts first.`);
    process.exit(1);
  }

  if (!fs.existsSync(CSV_PATH)) {
    console.error("audio-queue.csv not found.");
    process.exit(1);
  }

  const rows = parseCsv(CSV_PATH);

  // Step 2: copy WAVs to public/audio/
  console.log(`\nStep 2: Copying ${rows.length} files to ${PUBLIC_AUDIO_DIR}...`);
  if (!isDryRun) {
    fs.mkdirSync(PUBLIC_AUDIO_DIR, { recursive: true });
  }

  for (const row of rows) {
    const src = path.join(AUDIO_DIR, row.filename);
    const dest = path.join(PUBLIC_AUDIO_DIR, row.filename);
    if (isDryRun) {
      console.log(`  [DRY] copy ${row.filename}`);
    } else {
      fs.copyFileSync(src, dest);
      console.log(`  copied ${row.filename}`);
    }
  }

  // Step 3: update DB
  if (skipDb) {
    console.log(`\nStep 3: Skipped (--skip-db).`);
    return;
  }

  console.log(`\nStep 3: Updating Task.audio_url in database...`);

  // Only import Prisma when actually needed (avoids startup error if DB is not ready)
  const { PrismaClient } = await import("../../backend/generated/prisma");
  const prisma = new PrismaClient();

  try {
    let updated = 0;
    for (const row of rows) {
      const variantId = toVariantId(row.task_id, row.variant);
      const audioUrl = `/audio/${row.filename}`;

      if (isDryRun) {
        console.log(`  [DRY] task ${variantId} → audio_url = "${audioUrl}"`);
        continue;
      }

      try {
        await prisma.task.update({
          where: { id: variantId },
          data: { audio_url: audioUrl },
        });
        updated++;
        console.log(`  updated ${variantId}`);
      } catch (err) {
        console.warn(`  WARN: could not update ${variantId}: ${err instanceof Error ? err.message : err}`);
      }
    }
    if (!isDryRun) console.log(`\nDB: ${updated}/${rows.length} tasks updated.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
