/**
 * Imports existing pipeline JSON files into the task_drafts table.
 * Safe to re-run — uses upsert.
 *
 * Run from repo root:
 *   npx tsx content-pipeline/scripts/importDrafts.ts
 *   npx tsx content-pipeline/scripts/importDrafts.ts --dry-run
 *   npx tsx content-pipeline/scripts/importDrafts.ts --stages stage1,stage2
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  DraftStage,
  TaskType,
  SkillCode,
  LessonSlot,
} from '../../backend/generated/prisma';

dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const isDryRun = process.argv.includes('--dry-run');
const stagesArg = process.argv.find((a) => a.startsWith('--stages='))?.split('=')[1];
const requestedStages = stagesArg ? stagesArg.split(',') : ['stage1', 'stage2', 'flagged', 'needs_revision'];

const PIPELINE_ROOT = path.resolve(__dirname, '..');
const REJECTED_DIR  = path.join(PIPELINE_ROOT, 'rejected', 'stage2');

const STAGE_MAP: Record<string, { dir: string; stage: DraftStage }> = {
  stage1:         { dir: path.join(PIPELINE_ROOT, 'stage1'),         stage: DraftStage.STAGE1 },
  stage2:         { dir: path.join(PIPELINE_ROOT, 'stage2'),         stage: DraftStage.STAGE2 },
  flagged:        { dir: path.join(PIPELINE_ROOT, 'flagged'),        stage: DraftStage.FLAGGED },
  needs_revision: { dir: path.join(PIPELINE_ROOT, 'needs_revision'), stage: DraftStage.NEEDS_REVISION },
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const VALID_TASK_TYPES = new Set(Object.values(TaskType));
const VALID_SKILLS     = new Set(Object.values(SkillCode));
const VALID_SLOTS      = new Set(Object.values(LessonSlot));

function toTaskType(raw: string): TaskType {
  if (!VALID_TASK_TYPES.has(raw as TaskType)) throw new Error(`Unknown task_type: ${raw}`);
  return raw as TaskType;
}

function toSkill(raw: string | null | undefined): SkillCode | null {
  if (!raw) return null;
  if (!VALID_SKILLS.has(raw as SkillCode)) throw new Error(`Unknown skill: ${raw}`);
  return raw as SkillCode;
}

function toSlot(raw: string): LessonSlot {
  if (!VALID_SLOTS.has(raw as LessonSlot)) throw new Error(`Unknown lesson_slot_fit: ${raw}`);
  return raw as LessonSlot;
}

function readVariants(filePath: string): Record<string, unknown>[] {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.variants)) return raw.variants;
  return [raw];
}

function deriveTaskId(id: string): string {
  return id.replace(/-v\d+$/, '');
}

async function importStage(stageName: string, dir: string, stage: DraftStage) {
  if (!fs.existsSync(dir)) {
    console.log(`[SKIP] ${stageName}/ not found`);
    return;
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  console.log(`\n[${stageName}] ${files.length} files`);

  let upserted = 0;
  let failed = 0;

  for (const file of files) {
    let variants: Record<string, unknown>[];
    try {
      variants = readVariants(path.join(dir, file));
    } catch {
      console.error(`  [SKIP] Failed to parse ${file}`);
      continue;
    }

    for (const v of variants) {
      const id = v.id as string;
      if (!id) { console.error(`  [SKIP] Missing id in ${file}`); continue; }

      if (isDryRun) {
        console.log(`  [dry-run] ${id} → ${stageName}`);
        upserted++;
        continue;
      }

      try {
        const review = v.review as Record<string, unknown> | undefined;
        await prisma.taskDraft.upsert({
          where: { id },
          create: {
            id,
            task_id:                deriveTaskId(id),
            stage,
            task_type:              toTaskType(v.task_type as string),
            title:                  v.title as string,
            prompt_text:            v.prompt_text as string,
            correct_answer:         v.correct_answer as string,
            options:                v.options as object,
            audio_url:              (v.audio_url as string) ?? null,
            image_url:              (v.image_url as string) ?? null,
            primary_skill:          toSkill(v.primary_skill as string)!,
            secondary_skill:        toSkill(v.secondary_skill as string | undefined),
            level_target:           v.level_target as string,
            error_targets:          (v.error_targets as string[]) ?? [],
            grade_band:             (v.grade_band as string[]) ?? [],
            difficulty:             v.difficulty as number,
            estimated_time_seconds: v.estimated_time_seconds as number,
            review_after_days:      (v.review_after_days as number[]) ?? [],
            lesson_slot_fit:        toSlot(v.lesson_slot_fit as string),
            feedback_text:          v.feedback_text as string,
            is_diagnostic:          (v.is_diagnostic as boolean) ?? false,
            ai_review_severity:     (review?.severity as string) ?? null,
            ai_review_issues:       (review?.issues as string[]) ?? [],
            ai_fix_suggestion:      (review?.fix_suggestion as string) ?? null,
            ai_reviewed_at:         review?.reviewed_at ? new Date(review.reviewed_at as string) : null,
            flag_reason:            (v.flag_reason as string) ?? null,
            revision_reason:        (v.revision_reason as string) ?? null,
          },
          update: {
            stage,
            task_type:              toTaskType(v.task_type as string),
            title:                  v.title as string,
            prompt_text:            v.prompt_text as string,
            correct_answer:         v.correct_answer as string,
            options:                v.options as object,
            audio_url:              (v.audio_url as string) ?? null,
            image_url:              (v.image_url as string) ?? null,
            primary_skill:          toSkill(v.primary_skill as string)!,
            secondary_skill:        toSkill(v.secondary_skill as string | undefined),
            level_target:           v.level_target as string,
            error_targets:          (v.error_targets as string[]) ?? [],
            grade_band:             (v.grade_band as string[]) ?? [],
            difficulty:             v.difficulty as number,
            estimated_time_seconds: v.estimated_time_seconds as number,
            review_after_days:      (v.review_after_days as number[]) ?? [],
            lesson_slot_fit:        toSlot(v.lesson_slot_fit as string),
            feedback_text:          v.feedback_text as string,
            is_diagnostic:          (v.is_diagnostic as boolean) ?? false,
            ai_review_severity:     (review?.severity as string) ?? null,
            ai_review_issues:       (review?.issues as string[]) ?? [],
            ai_fix_suggestion:      (review?.fix_suggestion as string) ?? null,
            ai_reviewed_at:         review?.reviewed_at ? new Date(review.reviewed_at as string) : null,
            flag_reason:            (v.flag_reason as string) ?? null,
            revision_reason:        (v.revision_reason as string) ?? null,
          },
        });
        console.log(`  ✓ ${id}`);
        upserted++;
      } catch (e) {
        console.error(`  ✗ ${id}: ${(e as Error).message}`);
        failed++;
      }
    }
  }

  console.log(`  → ${upserted} upserted, ${failed} failed`);
}

async function importRejected() {
  if (!fs.existsSync(REJECTED_DIR)) {
    console.log(`\n[SKIP] rejected/stage2/ not found`);
    return;
  }

  const files = fs.readdirSync(REJECTED_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  console.log(`\n[rejected] ${files.length} files → audit log only`);

  let inserted = 0;
  let failed = 0;

  for (const file of files) {
    let variants: Record<string, unknown>[];
    try {
      variants = readVariants(path.join(REJECTED_DIR, file));
    } catch {
      console.error(`  [SKIP] Failed to parse ${file}`);
      continue;
    }

    for (const v of variants) {
      const id = v.id as string;
      if (!id) continue;

      if (isDryRun) {
        console.log(`  [dry-run] audit ${id}`);
        inserted++;
        continue;
      }

      try {
        const existing = await prisma.taskDraftAuditLog.findFirst({ where: { task_id: deriveTaskId(id), action: 'rejected' } });
        if (!existing) {
          await prisma.taskDraftAuditLog.create({
            data: {
              draft_id:    null,
              task_id:     deriveTaskId(id),
              action:      'rejected',
              from_stage:  DraftStage.STAGE2,
              to_stage:    DraftStage.REJECTED,
              reason:      (v.rejection_reason as string) ?? null,
              snapshot:    v as object,
            },
          });
          console.log(`  ✓ audit ${id}`);
          inserted++;
        } else {
          console.log(`  ~ skip ${id} (audit already exists)`);
        }
      } catch (e) {
        console.error(`  ✗ ${id}: ${(e as Error).message}`);
        failed++;
      }
    }
  }

  console.log(`  → ${inserted} inserted, ${failed} failed`);
}

async function main() {
  console.log(isDryRun ? '[DRY RUN]\n' : '[LIVE RUN]\n');

  for (const stageName of requestedStages) {
    const entry = STAGE_MAP[stageName];
    if (!entry) { console.warn(`[WARN] Unknown stage: ${stageName}`); continue; }
    await importStage(stageName, entry.dir, entry.stage);
  }

  if (!stagesArg || requestedStages.includes('rejected')) {
    await importRejected();
  }

  console.log('\nDone.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
