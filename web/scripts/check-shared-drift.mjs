#!/usr/bin/env node
/**
 * web/ isn't an npm workspace member (web/AGENTS.md), so it can't import
 * @app/shared and instead hand-mirrors its types — lib/api/types.ts,
 * lib/api/task-type-map.ts, lib/skills.ts. This script catches drift the
 * same way mobile/src/features/exercise/__tests__/sharedDrift.test.ts does:
 * read the source-of-truth files as text (never imported, never executed —
 * this only reads files, it doesn't modify shared/ or mobile/, matching
 * web/AGENTS.md's "don't touch backend/, shared/, mobile/" rule) and assert
 * every name this mirror depends on still appears there.
 *
 * Run: node web/scripts/check-shared-drift.mjs  (wired as `npm run check:drift`)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");

function read(relPath) {
  return readFileSync(path.join(repoRoot, relPath), "utf-8");
}

let failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

// ── 1. Every TASK_TYPES entry has a task-type-map.ts key ───────────────────

const sharedTaskTs = read("shared/src/validators/task.ts");
const taskTypeMapTs = read("web/lib/api/task-type-map.ts");

const taskTypesMatch = sharedTaskTs.match(/export const TASK_TYPES = \[([\s\S]*?)\] as const;/);
assert(taskTypesMatch, "Could not find TASK_TYPES in shared/src/validators/task.ts — has it moved or been renamed?");

if (taskTypesMatch) {
  const taskTypes = [...taskTypesMatch[1].matchAll(/'([A-Z0-9_]+)'/g)].map((m) => m[1]);
  assert(taskTypes.length === 43, `Expected 43 task types in shared/, found ${taskTypes.length} — task-type-map.ts's coverage claim needs re-checking.`);

  for (const taskType of taskTypes) {
    const keyPattern = new RegExp(`\\b${taskType}:\\s*"`);
    assert(keyPattern.test(taskTypeMapTs), `${taskType} is a live task_type in shared/ but has no entry in web/lib/api/task-type-map.ts.`);
  }
}

// ── 2. DiagnosticResult / DiagnosticTask fields still exist ────────────────

const sharedDiagnosticTs = read("shared/src/validators/diagnostic.ts");
const apiTypesTs = read("web/lib/api/types.ts");

const resultFields = [
  "general_level", "level_confidence", "bank_coverage", "capped_by_bank", "confidence",
  "skill_levels", "skill_scores", "skill_confidence", "top_error_codes", "priority_skills",
  "recommended_daily_minutes",
];
for (const field of resultFields) {
  assert(sharedDiagnosticTs.includes(field), `DiagnosticResult field "${field}" (mirrored in web/lib/api/types.ts) is missing from shared/src/validators/diagnostic.ts.`);
  assert(apiTypesTs.includes(field), `DiagnosticResult field "${field}" exists in shared/ but web/lib/api/types.ts's mirror has drifted and no longer declares it.`);
}

const taskSelectTs = read("backend/src/lib/task-select.ts");
const taskFields = [
  "id", "task_type", "prompt_text", "interaction_form", "options",
  "audio_url", "image_url", "primary_skill", "estimated_time_seconds",
  "feedback_text", "feedback_correct", "feedback_wrong",
];
for (const field of taskFields) {
  assert(taskSelectTs.includes(field), `TASK_SELECT field "${field}" (mirrored as ApiDiagnosticTask) is missing from backend/src/lib/task-select.ts.`);
  assert(apiTypesTs.includes(field), `ApiDiagnosticTask field "${field}" exists in TASK_SELECT but web/lib/api/types.ts's mirror has drifted and no longer declares it.`);
}
// correct_answer is deliberately excluded from ApiDiagnosticTask (stripped
// server-side, see lib/api/server/sanitizeTask.ts) — not asserted here.

// ── 3. Skill labels ──────────────────────────────────────────────────────

const planFormatTs = read("mobile/src/features/plan/planFormat.ts");
const skillsTs = read("web/lib/skills.ts");
const skillLabelMatches = [...planFormatTs.matchAll(/(\d): '([^']+)'/g)];
assert(skillLabelMatches.length === 8, `Expected 8 SKILL_LABELS entries in mobile/src/features/plan/planFormat.ts, found ${skillLabelMatches.length}.`);
for (const [, num, label] of skillLabelMatches) {
  assert(skillsTs.includes(label), `mobile's SKILL_LABELS[${num}] = "${label}" has no match in web/lib/skills.ts — the copied labels have drifted.`);
}

// ── 4. Article Colour Palette (issue #108) ──────────────────────────────

const sharedArticleTs = read("shared/src/validators/article.ts");
const articleTypesTs = read("web/components/article/types.ts");
const globalsCss = read("web/app/globals.css");

const paletteMatch = sharedArticleTs.match(/export const PALETTE_COLORS = \[([\s\S]*?)\] as const;/);
assert(paletteMatch, "Could not find PALETTE_COLORS in shared/src/validators/article.ts — has it moved or been renamed?");

if (paletteMatch) {
  const paletteColors = [...paletteMatch[1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
  assert(paletteColors.length === 12, `Expected 12 Palette colours in shared/, found ${paletteColors.length} — web's mirror and globals.css tokens need re-checking too.`);
  for (const color of paletteColors) {
    assert(articleTypesTs.includes(`"${color}"`), `Palette colour "${color}" is live in shared/ but missing from web/components/article/types.ts's mirrored PALETTE_COLORS.`);
    assert(globalsCss.includes(`--color-palette-${color}:`), `Palette colour "${color}" has no --color-palette-${color} token in web/app/globals.css.`);
    assert(globalsCss.includes(`--color-palette-${color}-tint:`), `Palette colour "${color}" has no --color-palette-${color}-tint token in web/app/globals.css.`);
  }
}

const colourFields = ["color", "highlight", "background"];
for (const field of colourFields) {
  assert(sharedArticleTs.includes(field), `Colour field "${field}" (mirrored in web/components/article/types.ts) is missing from shared/src/validators/article.ts.`);
  assert(articleTypesTs.includes(field), `Colour field "${field}" exists in shared/ but web/components/article/types.ts's mirror has drifted and no longer declares it.`);
}

// ── Report ───────────────────────────────────────────────────────────────

if (failures.length > 0) {
  console.error(`check-shared-drift: ${failures.length} drift issue(s) found:\n`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("check-shared-drift: OK — web's hand-mirrored types match shared/backend/mobile source of truth.");
