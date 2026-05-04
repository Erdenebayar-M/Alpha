import * as fs from "fs";
import * as path from "path";
import { runValidation } from "./validateImages";

const GENERATED_DIR = path.resolve(__dirname, "../images/generated");
const CSV_PATH = path.resolve(__dirname, "../images/image-queue.csv");
const PUBLIC_IMAGES_DIR = path.resolve(__dirname, "../../frontend/public/images");

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

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const skipDb = args.includes("--skip-db");

  console.log(`\nCopy Images to Public`);
  console.log(`=====================`);
  if (isDryRun) console.log(`[DRY RUN] No files will be written or DB updated.`);

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

  // Step 2: copy PNGs to frontend/public/images/
  console.log(`\nStep 2: Copying ${rows.length} files to ${PUBLIC_IMAGES_DIR}...`);
  if (!isDryRun) {
    fs.mkdirSync(PUBLIC_IMAGES_DIR, { recursive: true });
  }

  for (const row of rows) {
    const src = path.join(GENERATED_DIR, row.filename);
    const dest = path.join(PUBLIC_IMAGES_DIR, row.filename);
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

  console.log(`\nStep 3: Updating Task.image_url in database...`);

  const { PrismaClient } = await import("../../backend/generated/prisma");
  const prisma = new PrismaClient();

  try {
    let updated = 0;
    for (const row of rows) {
      const variantId = toVariantId(row.task_id, row.variant);
      const imageUrl = `/images/${row.filename}`;

      if (isDryRun) {
        console.log(`  [DRY] task ${variantId} → image_url = "${imageUrl}"`);
        continue;
      }

      try {
        await prisma.task.update({
          where: { id: variantId },
          data: { image_url: imageUrl },
        });
        updated++;
        console.log(`  updated ${variantId}`);
      } catch (err) {
        console.warn(
          `  WARN: could not update ${variantId}: ${err instanceof Error ? err.message : err}`
        );
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
