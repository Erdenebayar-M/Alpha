/**
 * Runtime coercion of raw JSON strings to Prisma enum values, shared by the
 * pipeline import scripts (llmReview.ts, importDrafts.ts). Each helper validates
 * against the live enum and throws on an unknown value so bad drafts fail loudly
 * at import time rather than silently writing garbage.
 */
import { TaskType, SkillCode, LessonSlot } from '../../backend/generated/prisma';

const VALID_TASK_TYPES = new Set<string>(Object.values(TaskType));
const VALID_SKILLS     = new Set<string>(Object.values(SkillCode));
const VALID_SLOTS      = new Set<string>(Object.values(LessonSlot));

export function toTaskType(raw: string): TaskType {
  if (!VALID_TASK_TYPES.has(raw)) throw new Error(`Unknown task_type: ${raw}`);
  return raw as TaskType;
}

export function toSkill(raw: string | null | undefined): SkillCode | null {
  if (!raw) return null;
  if (!VALID_SKILLS.has(raw)) throw new Error(`Unknown skill: ${raw}`);
  return raw as SkillCode;
}

export function toSlot(raw: string): LessonSlot {
  if (!VALID_SLOTS.has(raw)) throw new Error(`Unknown lesson_slot_fit: ${raw}`);
  return raw as LessonSlot;
}
