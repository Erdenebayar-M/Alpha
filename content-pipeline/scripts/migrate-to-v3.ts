/**
 * Propose v3 task types for the legacy (TT1_CHOICE…TT6_SELF_CHECK) variants in
 * validated/. Writes to v3-proposed/ for human review — never touches validated/.
 *
 * Usage: npm run pipeline:migrate-v3
 */
import * as fs from 'fs';
import * as path from 'path';
import { validateTaskContent } from '@app/shared';

const ROOT = path.join(__dirname, '..');
export const VALIDATED_DIR = path.join(ROOT, 'validated');
export const PROPOSED_DIR = path.join(ROOT, 'v3-proposed');

type Variant = Record<string, any>;

export interface Conversion {
  variant: Variant;
  needsReview: boolean;
  note: string | null;
}

// Same formula as backend/prisma/seed.ts buildGradeLevels (also copied in
// repairGradeLevels.ts / ingest.ts) — derives grade×level cells traceably.
const LEVEL_CODES = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5'];
function buildGradeLevels(gradeBand: string[], levelTarget: string): string[] {
  const range = levelTarget.match(/^(M[0-5])-(M[0-5])$/);
  let levels: string[];
  if (range) {
    const start = LEVEL_CODES.indexOf(range[1]);
    const end = LEVEL_CODES.indexOf(range[2]);
    levels = start >= 0 && end >= 0 ? LEVEL_CODES.slice(start, end + 1) : ['M0'];
  } else {
    levels = LEVEL_CODES.includes(levelTarget) ? [levelTarget] : ['M0'];
  }
  return gradeBand.flatMap((g) => levels.map((l) => `${g}:${l}`));
}

interface Mapping {
  type: string;
  review: boolean;
  note?: string;
}

// TT3_CORRECTION: target by options.error_type. Codes without a clean v3
// correction type fall back to TT_2_6 and are flagged.
const CORRECTION_BY_ERROR: Record<string, Mapping> = {
  G1: { type: 'TT_6_3', review: false },
  G2: { type: 'TT_6_3', review: false },
  G3: { type: 'TT_6_4', review: false },
  G4: { type: 'TT_6_4', review: false },
  G5: { type: 'TT_6_3', review: true, note: 'G5 has no exact v3 correction type' },
  B1: { type: 'TT_2_6', review: false },
  C1: { type: 'TT_3_5', review: false },
};

// TT2_FILL: best guess from primary_skill; always flagged.
const FILL_BY_SKILL: Record<string, string> = {
  S1: 'TT_2_1',
  S2: 'TT_2_1',
  S3: 'TT_3_2',
  S5: 'TT_5_5',
  S8: 'TT_4_4',
};

function mapType(v: Variant): Mapping {
  const opts = v.options ?? {};
  switch (v.task_type) {
    case 'TT4_DICTATION':
      if (typeof opts.word_count !== 'number') {
        return { type: 'TT_7_3', review: true, note: 'word_count missing; word vs sentence unknown' };
      }
      return { type: opts.word_count <= 3 ? 'TT_7_3' : 'TT_7_4', review: false };
    case 'TT5_MINI_TEXT':
      return { type: 'TT_7_6', review: false };
    case 'TT6_SELF_CHECK':
      return { type: 'TT_8_4', review: false };
    case 'TT3_CORRECTION':
      return Object.hasOwn(CORRECTION_BY_ERROR, opts.error_type)
        ? CORRECTION_BY_ERROR[opts.error_type]
        : {
            type: 'TT_2_6',
            review: true,
            note: `error_type ${opts.error_type} has no mapped v3 correction type`,
          };
    case 'TT1_CHOICE': {
      // TT_3_1 / TT_1_x are listening types — only plausible when audio exists.
      const type = v.primary_skill === 'S3' ? (v.audio_url ? 'TT_3_1' : 'TT_3_4') : 'TT_2_3';
      return { type, review: true, note: `best guess from primary_skill ${v.primary_skill}` };
    }
    case 'TT2_FILL': {
      const type = FILL_BY_SKILL[v.primary_skill] ?? 'TT_2_1';
      return { type, review: true, note: `best guess from primary_skill ${v.primary_skill}` };
    }
    default:
      throw new Error(`Not a legacy task type: ${v.task_type}`);
  }
}

/** Converts one legacy variant. Returns null when it is not a legacy type. */
export function convertVariant(legacy: Variant): Conversion | null {
  if (!/^TT[1-6]_[A-Z_]+$/.test(String(legacy.task_type))) return null;
  const map = mapType(legacy);
  let options = legacy.options ?? {};
  if (legacy.task_type === 'TT3_CORRECTION') {
    options = { incorrect_text: options.incorrect_text, correct_text: options.correct_text };
  }
  const variant: Variant = {
    ...legacy,
    task_type: map.type,
    options,
    grade_levels: buildGradeLevels(legacy.grade_band ?? [], legacy.level_target ?? ''),
    is_diagnostic: legacy.is_diagnostic ?? false,
  };
  if (map.review) {
    variant.needs_review = true;
    variant.migration_note = `${legacy.task_type} → ${map.type}: ${map.note ?? 'ambiguous mapping'}`;
  } else if (legacy.task_type === 'TT3_CORRECTION') {
    // error_type/hint are dropped from options; keep the original code traceable.
    variant.migration_note = `${legacy.task_type} → ${map.type}: legacy error_type ${legacy.options?.error_type}`;
  }
  return { variant, needsReview: map.review, note: map.note ?? null };
}

export interface Report {
  converted: number;
  flagged: number;
  failed: { id: string; file: string; errors: string[] }[];
  skipped: number;
}

/** Converts every file in `inDir` into `outDir`. Never writes to `inDir`. */
export function migrateDir(inDir: string, outDir: string): Report {
  if (path.resolve(inDir) === path.resolve(outDir)) {
    throw new Error('Output folder must differ from the validated folder');
  }
  const report: Report = { converted: 0, flagged: 0, failed: [], skipped: 0 };
  // Drop proposals from earlier runs so stale conversions can't linger.
  if (fs.existsSync(outDir)) {
    for (const f of fs.readdirSync(outDir).filter((f) => f.endsWith('.json'))) {
      fs.unlinkSync(path.join(outDir, f));
    }
  }
  for (const file of fs.readdirSync(inDir).filter((f) => f.endsWith('.json')).sort()) {
    const data = JSON.parse(fs.readFileSync(path.join(inDir, file), 'utf8'));
    const out: Variant[] = [];
    for (const legacy of data.variants ?? []) {
      let conv: Conversion | null;
      try {
        conv = convertVariant(legacy);
      } catch (e) {
        report.failed.push({ id: legacy.id, file, errors: [(e as Error).message] });
        continue;
      }
      if (!conv) {
        out.push(legacy); // already v3 — carry over unchanged
        report.skipped++;
        continue;
      }
      const check = validateTaskContent(conv.variant);
      if (!check.ok) {
        report.failed.push({ id: legacy.id, file, errors: check.errors });
        continue;
      }
      out.push(conv.variant);
      report.converted++;
      if (conv.needsReview) report.flagged++;
    }
    if (out.length > 0) {
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, file), JSON.stringify({ ...data, variants: out }, null, 2) + '\n');
    }
  }
  return report;
}

if (require.main === module) {
  const r = migrateDir(VALIDATED_DIR, PROPOSED_DIR);
  console.log(`Converted: ${r.converted} (flagged needs_review: ${r.flagged})`);
  console.log(`Skipped (already v3): ${r.skipped}`);
  console.log(`Failed: ${r.failed.length}`);
  for (const f of r.failed) console.log(`  ${f.file} ${f.id}: ${f.errors.join('; ')}`);
  console.log(`Output: ${PROPOSED_DIR}`);
  if (r.failed.length > 0) process.exitCode = 1;
}
