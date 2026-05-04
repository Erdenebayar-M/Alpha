import * as fs from "fs";
import * as path from "path";

const IMAGES_DIR = path.resolve(__dirname, "../images");
const GENERATED_DIR = path.join(IMAGES_DIR, "generated");
const CSV_PATH = path.join(IMAGES_DIR, "image-queue.csv");

const MIN_FILE_BYTES = 1024;

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

export interface ValidationResult {
  pass: number;
  fail: number;
  missing: number;
}

export function runValidation(verbose = true): ValidationResult {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`image-queue.csv not found at ${CSV_PATH}`);
    process.exit(1);
  }

  const rows = parseCsv(CSV_PATH);
  let pass = 0, fail = 0, missing = 0;

  for (const row of rows) {
    const filePath = path.join(GENERATED_DIR, row.filename);

    if (!fs.existsSync(filePath)) {
      missing++;
      if (verbose) console.log(`  MISSING  ${row.filename}`);
      continue;
    }

    const { size } = fs.statSync(filePath);
    if (size < MIN_FILE_BYTES) {
      fail++;
      if (verbose) console.log(`  FAIL     ${row.filename} (${size} bytes, too small)`);
    } else {
      pass++;
      if (verbose) console.log(`  PASS     ${row.filename} (${size} bytes)`);
    }
  }

  return { pass, fail, missing };
}

if (require.main === module) {
  console.log(`\nValidate Images`);
  console.log(`===============`);
  const result = runValidation();
  console.log(`\nSummary: ${result.pass} PASS, ${result.fail} FAIL, ${result.missing} MISSING`);
  if (result.missing > 0 || result.fail > 0) process.exit(1);
}
