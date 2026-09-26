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

// ── 5. Image Block sources ───────────────────────────────────────────────
// ArticleBody.tsx picks next/image vs a plain <img> off `source` — a drift
// here would silently misrender rather than throw, so it's worth the same
// guard as the Colour palette above.

const sourceMatch = sharedArticleTs.match(/export const IMAGE_SOURCES = \[([\s\S]*?)\] as const;/);
assert(sourceMatch, "Could not find IMAGE_SOURCES in shared/src/validators/article.ts — has it moved or been renamed?");

if (sourceMatch) {
  const imageSources = [...sourceMatch[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
  assert(imageSources.length === 2, `Expected 2 image sources in shared/, found ${imageSources.length} — web's mirrored ImageBlock.source needs re-checking too.`);
  for (const source of imageSources) {
    assert(articleTypesTs.includes(`"${source}"`), `Image source "${source}" is live in shared/ but missing from web/components/article/types.ts's mirrored ImageBlock.source.`);
  }
}

// ── 6. List Markers and split-list numbering (ADR 0005) ─────────────────
// Nothing checked list/marker fields before this — added alongside the List
// Marker feature so this script actually catches the next drift, not just
// this one.

const listFields = ["markerColor", "startsAt", "alignment"];
for (const field of listFields) {
  assert(sharedArticleTs.includes(field), `List field "${field}" (mirrored in web/components/article/types.ts) is missing from shared/src/validators/article.ts.`);
  assert(articleTypesTs.includes(field), `List field "${field}" exists in shared/ but web/components/article/types.ts's mirror has drifted and no longer declares it.`);
}

// ── 7. Login rules (issue #120) ─────────────────────────────────────────
// web/lib/auth/loginRules.ts mirrors loginSchema (client validation +
// the sign-in route handler), and the sign-in page maps the backend's error
// codes to copy — a drift in either would silently mis-validate or show the
// wrong message.

const sharedAuthTs = read("shared/src/validators/auth.ts");
const loginRulesTs = read("web/lib/auth/loginRules.ts");

const loginSchemaMatch = sharedAuthTs.match(/export const loginSchema = z\.object\(\{([\s\S]*?)\}\);/);
assert(loginSchemaMatch, "Could not find loginSchema in shared/src/validators/auth.ts — has it moved or been renamed?");

if (loginSchemaMatch) {
  const fields = loginSchemaMatch[1].replace(/\s+/g, " ").trim();
  assert(
    fields === "email: z.string().email(), password: z.string(),",
    `loginSchema changed to { ${fields} } — web/lib/auth/loginRules.ts mirrors { email: z.string().email(), password: z.string() } and needs updating.`,
  );
}
assert(loginRulesTs.includes("isValidLoginEmail"), "web/lib/auth/loginRules.ts no longer exports isValidLoginEmail.");

const backendErrorsTs = read("backend/src/lib/errors.ts");
const signInComponent = read("web/components/auth/SignInForm.tsx");
for (const code of ["INVALID_CREDENTIALS", "RATE_LIMITED", "VALIDATION_ERROR"]) {
  assert(backendErrorsTs.includes(`${code}:`) || backendErrorsTs.includes(`'${code}'`), `Backend error code ${code} (handled by the sign-in page) is missing from backend/src/lib/errors.ts.`);
  assert(signInComponent.includes(code), `web/components/auth/SignInForm.tsx no longer maps backend error code ${code}.`);
}

// ── 8. Register rules (issue #121) ──────────────────────────────────────
// web/lib/auth/registerRules.ts mirrors registerSchema; the sign-up form
// maps the backend's DUPLICATE_EMAIL code to a link to /signin.

const registerRulesTs = read("web/lib/auth/registerRules.ts");
const registerSchemaMatch = sharedAuthTs.match(/export const registerSchema = z\.object\(\{([\s\S]*?)\}\);/);
assert(registerSchemaMatch, "Could not find registerSchema in shared/src/validators/auth.ts — has it moved or been renamed?");

if (registerSchemaMatch) {
  const fields = registerSchemaMatch[1].replace(/\s+/g, " ").trim();
  assert(
    fields === "email: z.string().email(), name: z.string().min(2), surname: z.string().optional(), password: z.string().min(8),",
    `registerSchema changed to { ${fields} } — web/lib/auth/registerRules.ts mirrors { email: z.string().email(), name: z.string().min(2), surname: z.string().optional(), password: z.string().min(8) } and needs updating.`,
  );
}
assert(registerRulesTs.includes("NAME_MIN_LENGTH = 2"), "web/lib/auth/registerRules.ts no longer declares NAME_MIN_LENGTH = 2.");
assert(registerRulesTs.includes("PASSWORD_MIN_LENGTH = 8"), "web/lib/auth/registerRules.ts no longer declares PASSWORD_MIN_LENGTH = 8.");
assert(!registerSchemaMatch || !/confirm/i.test(registerSchemaMatch[1]), "registerSchema in shared/src/validators/auth.ts gained a confirmation field — password confirmation is meant to be client-only (issue #121).");

const signUpComponent = read("web/components/auth/SignUpForm.tsx");
for (const code of ["DUPLICATE_EMAIL", "RATE_LIMITED"]) {
  assert(backendErrorsTs.includes(`${code}:`) || backendErrorsTs.includes(`'${code}'`), `Backend error code ${code} (handled by the sign-up page) is missing from backend/src/lib/errors.ts.`);
  assert(signUpComponent.includes(code), `web/components/auth/SignUpForm.tsx no longer maps backend error code ${code}.`);
}

// ── 9. Forgot-password rules (issue #123) ───────────────────────────────
// web/lib/auth/forgotPasswordRules.ts mirrors forgotPasswordSchema with the
// login email rule; the forgot-password card maps RATE_LIMITED to copy.

const forgotSchemaMatch = sharedAuthTs.match(/export const forgotPasswordSchema = z\.object\(\{([\s\S]*?)\}\);/);
assert(forgotSchemaMatch, "Could not find forgotPasswordSchema in shared/src/validators/auth.ts — has it moved or been renamed?");

if (forgotSchemaMatch) {
  const fields = forgotSchemaMatch[1].replace(/\s+/g, " ").trim();
  assert(
    fields === "email: z.string().email(),",
    `forgotPasswordSchema changed to { ${fields} } — web/lib/auth/forgotPasswordRules.ts mirrors { email: z.string().email() } and needs updating.`,
  );
}

const forgotComponent = read("web/components/auth/ForgotPasswordCard.tsx");
for (const code of ["RATE_LIMITED", "VALIDATION_ERROR"]) {
  assert(backendErrorsTs.includes(`${code}:`) || backendErrorsTs.includes(`'${code}'`), `Backend error code ${code} (handled by the forgot-password page) is missing from backend/src/lib/errors.ts.`);
  assert(forgotComponent.includes(code), `web/components/auth/ForgotPasswordCard.tsx no longer maps backend error code ${code}.`);
}

// ── 10. Reset-password rules (issue #124) ───────────────────────────────
// web/lib/auth/resetPasswordRules.ts mirrors resetPasswordSchema with
// registerRules.ts's PASSWORD_MIN_LENGTH; the reset card turns
// INVALID_RESET_TOKEN into its "link expired or invalid" state.

const resetSchemaMatch = sharedAuthTs.match(/export const resetPasswordSchema = z\.object\(\{([\s\S]*?)\}\);/);
assert(resetSchemaMatch, "Could not find resetPasswordSchema in shared/src/validators/auth.ts — has it moved or been renamed?");

if (resetSchemaMatch) {
  const fields = resetSchemaMatch[1].replace(/\s+/g, " ").trim();
  assert(
    fields === "token: z.string().min(1), password: z.string().min(8),",
    `resetPasswordSchema changed to { ${fields} } — web/lib/auth/resetPasswordRules.ts mirrors { token: z.string().min(1), password: z.string().min(8) } and needs updating.`,
  );
  assert(!/confirm/i.test(resetSchemaMatch[1]), "resetPasswordSchema in shared/src/validators/auth.ts gained a confirmation field — password confirmation is meant to be client-only (issue #124).");
}

const resetComponent = read("web/components/auth/ResetPasswordCard.tsx");
for (const code of ["INVALID_RESET_TOKEN", "RATE_LIMITED"]) {
  assert(backendErrorsTs.includes(`${code}:`) || backendErrorsTs.includes(`'${code}'`), `Backend error code ${code} (handled by the reset-password page) is missing from backend/src/lib/errors.ts.`);
  assert(resetComponent.includes(code), `web/components/auth/ResetPasswordCard.tsx no longer maps backend error code ${code}.`);
}

// ── Report ───────────────────────────────────────────────────────────────

if (failures.length > 0) {
  console.error(`check-shared-drift: ${failures.length} drift issue(s) found:\n`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("check-shared-drift: OK — web's hand-mirrored types match shared/backend/mobile source of truth.");
