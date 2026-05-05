/**
 * Imports all tasks from content-pipeline/validated/*.json into the database.
 * Uses upsert so re-running is safe (updates existing tasks, inserts new ones).
 *
 * Run from repo root:
 *   npx tsx content-pipeline/scripts/importValidated.ts
 *   npx tsx content-pipeline/scripts/importValidated.ts --dry-run
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, TaskType, SkillCode, LessonSlot } from '../../backend/generated/prisma';

dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const isDryRun = process.argv.includes('--dry-run');

const VALIDATED_DIR = path.resolve(__dirname, '../validated');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const VALID_TASK_TYPES = new Set(Object.values(TaskType));
const VALID_SKILLS = new Set(Object.values(SkillCode));
const VALID_SLOTS = new Set(Object.values(LessonSlot));

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

interface RawTask {
  id: string;
  task_type: string;
  title: string;
  prompt_text: string;
  correct_answer: string;
  audio_url: string | null;
  image_url: string | null;
  primary_skill: string;
  secondary_skill: string | null;
  level_target: string;
  error_targets: string[];
  grade_band: string[];
  difficulty: number;
  estimated_time_seconds: number;
  review_after_days: number[];
  lesson_slot_fit: string;
  feedback_text: string;
  options: unknown;
}

async function main() {
  const files = fs.readdirSync(VALIDATED_DIR).filter((f) => f.endsWith('.json'));

  if (files.length === 0) {
    console.log('No JSON files found in validated/.');
    return;
  }

  const tasks: RawTask[] = [];
  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(VALIDATED_DIR, file), 'utf-8'));
    // Support two shapes: flat array OR { task_id, variants: [...] }
    const arr: RawTask[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw.variants)
        ? raw.variants
        : [raw];
    tasks.push(...arr);
  }

  console.log(`Found ${tasks.length} tasks in ${files.length} files.`);

  if (isDryRun) {
    for (const t of tasks) console.log(`  [dry-run] ${t.id} (${t.task_type})`);
    return;
  }

  let upserted = 0;
  let failed = 0;

  for (const t of tasks) {
    try {
      await prisma.task.upsert({
        where: { id: t.id },
        create: {
          id: t.id,
          task_type: toTaskType(t.task_type),
          title: t.title,
          prompt_text: t.prompt_text,
          correct_answer: t.correct_answer,
          audio_url: t.audio_url ?? null,
          image_url: t.image_url ?? null,
          primary_skill: toSkill(t.primary_skill)!,
          secondary_skill: toSkill(t.secondary_skill),
          level_target: t.level_target,
          error_targets: t.error_targets,
          grade_band: t.grade_band,
          difficulty: t.difficulty,
          estimated_time_seconds: t.estimated_time_seconds,
          review_after_days: t.review_after_days,
          lesson_slot_fit: toSlot(t.lesson_slot_fit),
          feedback_text: t.feedback_text,
          options: t.options as object,
        },
        update: {
          task_type: toTaskType(t.task_type),
          title: t.title,
          prompt_text: t.prompt_text,
          correct_answer: t.correct_answer,
          audio_url: t.audio_url ?? null,
          image_url: t.image_url ?? null,
          primary_skill: toSkill(t.primary_skill)!,
          secondary_skill: toSkill(t.secondary_skill),
          level_target: t.level_target,
          error_targets: t.error_targets,
          grade_band: t.grade_band,
          difficulty: t.difficulty,
          estimated_time_seconds: t.estimated_time_seconds,
          review_after_days: t.review_after_days,
          lesson_slot_fit: toSlot(t.lesson_slot_fit),
          feedback_text: t.feedback_text,
          options: t.options as object,
        },
      });
      upserted++;
      console.log(`  ✓ ${t.id}`);
    } catch (e) {
      console.error(`  ✗ ${t.id}: ${(e as Error).message}`);
      failed++;
    }
  }

  console.log(`\nDone — ${upserted} upserted, ${failed} failed.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
