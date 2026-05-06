import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { runValidation } from "./validateAudio";

dotenv.config({ path: path.resolve(__dirname, "../../backend/.env") });

const AUDIO_DIR = path.resolve(__dirname, "../audio");
const CSV_PATH = path.resolve(__dirname, "../audio/audio-queue.csv");

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

function toVariantId(taskId: string, variant: string): string {
  return `${taskId}-${variant}`;
}

function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.error("Missing R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY in .env");
    process.exit(1);
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const skipDb = args.includes("--skip-db");

  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!bucket || !publicUrl) {
    console.error("Missing R2_BUCKET_NAME or R2_PUBLIC_URL in .env");
    process.exit(1);
  }

  console.log(`\nUpload Audio to R2`);
  console.log(`==================`);
  console.log(`Bucket:     ${bucket}`);
  console.log(`Public URL: ${publicUrl}`);
  if (isDryRun) console.log(`[DRY RUN] No files will be uploaded or DB updated.`);

  // Step 1: validate — abort only on corrupt/failed files, warn on missing
  console.log(`\nStep 1: Validating audio files...`);
  const { missing, failed: invalid } = await runValidation();
  if (invalid > 0) {
    console.error(`\nAborted: ${invalid} files are corrupt/invalid. Fix them before uploading.`);
    process.exit(1);
  }
  if (missing > 0) {
    console.warn(`\nWarning: ${missing} files are missing — they will be skipped. Run generateTts.ts to generate them.`);
  }

  if (!fs.existsSync(CSV_PATH)) {
    console.error("audio-queue.csv not found.");
    process.exit(1);
  }

  const rows = parseCsv(CSV_PATH);
  const s3 = getR2Client();

  // Step 2: upload WAVs to R2
  console.log(`\nStep 2: Uploading ${rows.length} audio files to R2 (audio/ prefix)...`);

  for (const row of rows) {
    const src = path.join(AUDIO_DIR, row.filename);
    if (!fs.existsSync(src)) {
      console.log(`  skipped  ${row.filename} (missing)`);
      continue;
    }

    const key = `audio/${row.filename}`;
    const url = `${publicUrl}/${key}`;

    if (isDryRun) {
      console.log(`  [DRY] ${row.filename} → ${url}`);
      continue;
    }

    const body = fs.readFileSync(src);
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "audio/wav",
    }));
    console.log(`  uploaded ${row.filename}`);
  }

  // Step 3: update DB
  if (skipDb) {
    console.log(`\nStep 3: Skipped (--skip-db).`);
    return;
  }

  console.log(`\nStep 3: Updating Task.audio_url in database...`);

  if (isDryRun) {
    for (const row of rows) {
      const variantId = toVariantId(row.task_id, row.variant);
      console.log(`  [DRY] ${variantId} → audio_url = "${publicUrl}/audio/${row.filename}"`);
    }
    return;
  }

  const { PrismaClient } = await import("../../backend/generated/prisma");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    let updated = 0;
    for (const row of rows) {
      if (!fs.existsSync(path.join(AUDIO_DIR, row.filename))) continue;
      const variantId = toVariantId(row.task_id, row.variant);
      const audioUrl = `${publicUrl}/audio/${row.filename}`;
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
    console.log(`\nDB: ${updated}/${rows.length} tasks updated.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
