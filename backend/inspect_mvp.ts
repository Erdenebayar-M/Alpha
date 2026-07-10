import * as XLSX from "xlsx";

const filePath = "D:\\Ajil\\Alpha\\docs\\mvp_9_categories_words_classified.xlsx";

const wb = XLSX.readFile(filePath);

console.log("=== SHEET NAMES ===");
console.log(JSON.stringify(wb.SheetNames));

const SHEET = "Ангилсан_үгс";
const sheet = wb.Sheets[SHEET];
if (!sheet) {
  console.log(`\nERROR: Sheet "${SHEET}" NOT FOUND. Available: ${wb.SheetNames.join(", ")}`);
  process.exit(1);
}
console.log(`\nSheet "${SHEET}": FOUND`);

const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

if (rawRows.length === 0) {
  console.log("No rows found.");
  process.exit(1);
}

const EXPECTED_COLS = [
  "№", "Үндсэн үг", "Анги", "Апп түвшин",
  "Утгын төвөгшил", "Зөв бичих төвөгшил", "Морфологийн төвөгшил",
  "Санал болгох дасгал", "Зөв бичих tag", "Сэдэв", "Үгийн аймаг", "Утгын төрөл",
];
const actualCols = Object.keys(rawRows[0]);
console.log("\n=== ACTUAL HEADERS ===");
actualCols.forEach((c) => console.log(`  "${c}"`));

console.log("\n=== HEADER CHECK ===");
let allMatch = true;
for (const col of EXPECTED_COLS) {
  const found = actualCols.includes(col);
  if (!found) allMatch = false;
  console.log(`  ${found ? "OK" : "MISSING"} "${col}"`);
}
const extra = actualCols.filter((c) => !EXPECTED_COLS.includes(c));
if (extra.length) console.log(`  Extra cols: ${extra.map((c) => `"${c}"`).join(", ")}`);
console.log(`  All expected present: ${allMatch}`);

const gradeCounts: Record<string, number> = {};
for (const r of rawRows) {
  const g = String(r["Анги"] ?? "").trim() || "(empty)";
  gradeCounts[g] = (gradeCounts[g] ?? 0) + 1;
}
console.log("\n=== GRADE COLUMN DISTRIBUTION ===");
for (const [k, v] of Object.entries(gradeCounts)) {
  console.log(`  "${k}": ${v} rows`);
}

console.log(`\n=== TOTAL RAW ROWS: ${rawRows.length} ===`);
console.log("\n=== FIRST 6 ROWS ===");
(rawRows as Record<string, unknown>[]).slice(0, 6).forEach((r, i) => {
  console.log(
    `  [${i}] word="${r["Үндсэн үг"]}" grade="${r["Анги"]}" tag="${r["Зөв бичих tag"]}" topic="${r["Сэдэв"]}"`
  );
});
