import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { runValidation } from "./validateImages";

dotenv.config({ path: path.resolve(__dirname, "../../backend/.env") });

const GENERATED_DIR = path.resolve(__dirname, "../images/generated");
const CSV_PATH = path.resolve(__dirname, "../images/image-queue.csv");

interface CsvRow {
  task_id: string;
  variant: string;
  type: string;
  word: string;
  prompt: string;
  filename: string;
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

  console.log(`\nUpload Images to R2`);
  console.log(`===================`);
  console.log(`Bucket:     ${bucket}`);
  console.log(`Public URL: ${publicUrl}`);
  if (isDryRun) console.log(`[DRY RUN] No files will be uploaded or DB updated.`);

  // Step 1: validate — abort if any MISSING
  console.log(`\nStep 1: Validating image files...`);
  const { missing } = runValidation(false);
  if (missing > 0) {
    console.error(`\nAborted: ${missing} files are MISSING. Run generateImages.ts first.`);
    process.exit(1);
  }

  if (!fs.existsSync(CSV_PATH)) {
    console.error("image-queue.csv not found.");
    process.exit(1);
  }

  const rows = parseCsv(CSV_PATH);
  const s3 = getR2Client();

  // Step 2: upload PNGs to R2
  console.log(`\nStep 2: Uploading ${rows.length} images to R2 (images/ prefix)...`);

  for (const row of rows) {
    const src = path.join(GENERATED_DIR, row.filename);
    const key = `images/${row.filename}`;
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
      ContentType: "image/png",
    }));
    console.log(`  uploaded ${row.filename}`);
  }

  // Step 3: update DB
  if (skipDb) {
    console.log(`\nStep 3: Skipped (--skip-db).`);
    return;
  }

  console.log(`\nStep 3: Updating Task.image_url in database...`);

  if (isDryRun) {
    for (const row of rows) {
      const variantId = toVariantId(row.task_id, row.variant);
      console.log(`  [DRY] ${variantId} → image_url = "${publicUrl}/images/${row.filename}"`);
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
      const variantId = toVariantId(row.task_id, row.variant);
      const imageUrl = `${publicUrl}/images/${row.filename}`;
      try {
        await prisma.task.update({
          where: { id: variantId },
          data: { image_url: imageUrl },
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
