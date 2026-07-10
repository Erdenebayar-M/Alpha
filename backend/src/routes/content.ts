import { GoogleGenAI } from '@google/genai';
import { Hono } from 'hono';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { z } from 'zod';
import OpenAI from 'openai';
import { withAdmin } from '../lib/auth/adminMiddleware';
import { adminGenerateLimiter } from '../lib/auth/rateLimit';
import { ERRORS } from '../lib/errors';
import { ok } from '../lib/response';
import { env } from '../config/env';
import { r2Enabled, r2Upload, r2Move } from '../lib/r2';
import { prisma } from '../lib/db/client';
import {
  DraftStage,
  TaskType,
  SkillCode,
  LessonSlot,
  InteractionForm,
  TaskSource,
} from '../../generated/prisma';
import {
  createTaskSchema as sharedCreateTaskSchema,
  type CreateTaskInput,
} from '@app/shared';
import { generateForSpec, TASK_SPECS, AVAILABLE_TASK_IDS } from '../lib/pipeline/generator';
import { reviewTaskDraft, AIReviewResult } from '../lib/pipeline/aiReviewer';
import {
  parseClassifiedWorkbook,
  filterWords,
  toWordRecords,
  datasetInfo,
  summarizeFilter,
  isAllMongolian,
  hasVowel,
} from '../lib/word-bank/import';
import { deriveCapability } from '../lib/word-bank/derive-capability';
import { syllabify } from '../lib/error-engine/mongolian-utils';

// Verbatim from populateWordCapability.ts — keep in sync.
const IMAGEABLE_MEANING = 'бодит/зурагтай холбож болно'.normalize('NFC');
const isImageable = (meaningType: string | null | undefined): boolean =>
  (meaningType ?? '').normalize('NFC') === IMAGEABLE_MEANING;

const content = new Hono();
content.use('/*', withAdmin);

// ─── Paths (kept for image/audio asset storage only) ──────────────────────────

const PIPELINE = path.resolve(__dirname, '../../../content-pipeline');
const IMG_TEMP = path.join(PIPELINE, 'images', 'temp');
const IMG_GEN  = path.join(PIPELINE, 'images', 'generated');
const AUD_TEMP = path.join(PIPELINE, 'audio', 'temp');
const AUD_DIR  = path.join(PIPELINE, 'audio');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STAGE_ENUM: Record<string, DraftStage> = {
  stage1:         DraftStage.STAGE1,
  stage2:         DraftStage.STAGE2,
  flagged:        DraftStage.FLAGGED,
  needs_revision: DraftStage.NEEDS_REVISION,
  rejected:       DraftStage.REJECTED,
};

const VALID_TASK_TYPES   = new Set(Object.values(TaskType));
const VALID_SKILLS       = new Set(Object.values(SkillCode));
const VALID_SLOTS        = new Set(Object.values(LessonSlot));
const VALID_INT_FORMS    = new Set(Object.values(InteractionForm));

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
function toInteractionForm(raw: string | null | undefined): InteractionForm | null {
  if (!raw) return null;
  if (!VALID_INT_FORMS.has(raw as InteractionForm)) throw new Error(`Unknown interaction_form: ${raw}`);
  return raw as InteractionForm;
}

// ─── GET /api/admin/content/stats ────────────────────────────────────────────

content.get('/stats', async (c) => {
  const counts = await prisma.taskDraft.groupBy({
    by: ['stage'],
    _count: { id: true },
  });

  const tally: Record<string, number> = {
    stage1: 0, stage2: 0, flagged: 0, needs_revision: 0, rejected: 0,
  };
  for (const row of counts) {
    const key = Object.entries(STAGE_ENUM).find(([, v]) => v === row.stage)?.[0];
    if (key) tally[key] = row._count.id;
  }

  const validated = await prisma.task.count();

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const approvedToday = await prisma.taskDraftAuditLog.count({
    where: { action: 'approved', performed_at: { gte: todayStart } },
  });

  return ok(c, {
    pipeline: { ...tally, validated, approved_today: approvedToday },
  });
});

// ─── Serialization helper ────────────────────────────────────────────────────

function serializeVariant(draft: { options: unknown; [key: string]: unknown }) {
  const opts = (draft.options ?? {}) as Record<string, unknown>;
  if (Array.isArray(opts.choices)) {
    const distractors = (opts.choices as Array<{ text: string; is_correct: boolean }>)
      .filter((c) => !c.is_correct)
      .map((c) => c.text);
    return { ...draft, task_id: draft['id'], options: { ...opts, distractors } };
  }
  return { ...draft, task_id: draft['id'] };
}

// ─── GET /api/admin/content/tasks ────────────────────────────────────────────

const listQuerySchema = z.object({
  stage:    z.enum(['stage1', 'stage2', 'flagged', 'needs_revision', 'rejected']).default('stage2'),
  grade:    z.enum(['G12', 'G24']).optional(),
  type:     z.string().optional(),
  skill:    z.string().optional(),
  page:     z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(200).default(50),
});

content.get('/tasks', async (c) => {
  const parsed = listQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid query', parsed.error.flatten().fieldErrors);
  }
  const { stage, grade, type, skill, page, per_page } = parsed.data;

  const where = {
    stage: STAGE_ENUM[stage],
    ...(grade ? { grade_band: { has: grade } } : {}),
    ...(type  ? { task_type: toTaskType(type) } : {}),
    ...(skill ? { OR: [
      { primary_skill:   toSkill(skill) as SkillCode },
      { secondary_skill: toSkill(skill) as SkillCode },
    ]} : {}),
  } as const;

  const [tasks, total] = await Promise.all([
    prisma.taskDraft.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip:  (page - 1) * per_page,
      take:  per_page,
    }),
    prisma.taskDraft.count({ where }),
  ]);

  return ok(c, {
    stage,
    total,
    tasks: tasks.map(serializeVariant),
    meta: { page, per_page, total, has_next: page * per_page < total },
  });
});

// ─── POST /api/admin/content/tasks ───────────────────────────────────────────

// Use the shared canonical schema; alias keeps local type inference clean.
const createTaskSchema = sharedCreateTaskSchema;

content.post('/tasks', async (c) => {
  const body   = await c.req.json().catch(() => null);
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }

  const d = parsed.data;

  let taskType: TaskType;
  let primarySkill: SkillCode;
  let lessonSlot: LessonSlot;
  let interactionForm: InteractionForm | null;
  try {
    taskType        = toTaskType(d.task_type);
    primarySkill    = toSkill(d.primary_skill) as SkillCode;
    lessonSlot      = toSlot(d.lesson_slot_fit);
    interactionForm = toInteractionForm(d.interaction_form ?? null);
  } catch (err) {
    return ERRORS.VALIDATION_ERROR(c, (err as Error).message);
  }

  const secondarySkill = d.secondary_skill ? toSkill(d.secondary_skill) : null;

  const options = d.initial_text
    ? { ...d.options, initial_text: d.initial_text }
    : d.options;

  const { randomUUID } = await import('crypto');
  const id = randomUUID();

  const draft = await prisma.taskDraft.create({
    data: {
      id,
      stage:                  DraftStage.STAGE2,
      task_type:              taskType,
      prompt_text:            d.prompt_text,
      correct_answer:         d.correct_answer,
      options: options as object,
      audio_url:              d.audio_url ?? null,
      image_url:              d.image_url ?? null,
      primary_skill:          primarySkill,
      secondary_skill:        secondarySkill,
      level_target:           d.level_target,
      error_targets:          d.error_targets,
      grade_band:             d.grade_band,
      difficulty:             d.difficulty,
      estimated_time_seconds: d.estimated_time_seconds,
      lesson_slot_fit:        lessonSlot,
      interaction_form:       interactionForm,
      feedback_text:          d.feedback_text,
      feedback_correct:       d.feedback_correct ?? null,
      feedback_wrong:         d.feedback_wrong ?? null,
      is_diagnostic:          d.is_diagnostic,
      source:                 TaskSource.HUMAN,
      ai_review_severity:     null,
      ai_review_issues:       [],
    },
  });

  return ok(c, { task_id: draft.id, variant_id: draft.id });
});

// ─── GET /api/admin/content/tasks/:task_id ───────────────────────────────────

content.get('/tasks/:id', async (c) => {
  const id       = c.req.param('id');
  const stageKey = c.req.query('stage') ?? 'stage2';
  const stage    = STAGE_ENUM[stageKey];
  if (!stage) return ERRORS.VALIDATION_ERROR(c, 'Invalid stage');

  const draft = await prisma.taskDraft.findUnique({ where: { id } });
  if (!draft) return ERRORS.NOT_FOUND(c, `Variant ${id} not found`);
  const actualStage = Object.entries(STAGE_ENUM).find(([, v]) => v === draft.stage)?.[0] ?? stageKey;
  return ok(c, { task_id: id, stage: actualStage, variant_count: 1, variants: [serializeVariant(draft)] });
});

// ─── Shared action schema ─────────────────────────────────────────────────────

const actionSchema = z.object({
  variant_id: z.string().min(1),
  notes:      z.string().optional(),
});

// ─── POST /api/admin/content/approve ─────────────────────────────────────────

content.post('/approve', async (c) => {
  const body   = await c.req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }
  const { variant_id, notes } = parsed.data;

  const draft = await prisma.taskDraft.findUnique({ where: { id: variant_id } });
  if (!draft) {
    return ERRORS.NOT_FOUND(c, `Variant ${variant_id} not found`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.taskDraftAuditLog.create({
      data: {
        draft_id:   draft.id,
        task_id:    draft.id,
        action:     'approved',
        from_stage: draft.stage,
        notes:      notes ?? null,
        snapshot:   draft as object,
      },
    });

    await tx.task.upsert({
      where: { id: draft.id },
      create: {
        id:                     draft.id,
        task_type:              draft.task_type,
        prompt_text:            draft.prompt_text,
        correct_answer:         draft.correct_answer,
        options:                draft.options as object,
        audio_url:              draft.audio_url,
        image_url:              draft.image_url,
        primary_skill:          draft.primary_skill,
        secondary_skill:        draft.secondary_skill,
        level_target:           draft.level_target,
        error_targets:          draft.error_targets,
        grade_band:             draft.grade_band,
        grade_levels:           draft.grade_levels,
        difficulty:             draft.difficulty,
        estimated_time_seconds: draft.estimated_time_seconds,
        lesson_slot_fit:        draft.lesson_slot_fit,
        interaction_form:       draft.interaction_form,
        feedback_text:          draft.feedback_text,
        feedback_correct:       draft.feedback_correct,
        feedback_wrong:         draft.feedback_wrong,
        is_diagnostic:          draft.is_diagnostic,
        source:                 draft.source,
      },
      update: {
        task_type:              draft.task_type,
        prompt_text:            draft.prompt_text,
        correct_answer:         draft.correct_answer,
        options:                draft.options as object,
        audio_url:              draft.audio_url,
        image_url:              draft.image_url,
        primary_skill:          draft.primary_skill,
        secondary_skill:        draft.secondary_skill,
        level_target:           draft.level_target,
        error_targets:          draft.error_targets,
        grade_band:             draft.grade_band,
        grade_levels:           draft.grade_levels,
        difficulty:             draft.difficulty,
        estimated_time_seconds: draft.estimated_time_seconds,
        lesson_slot_fit:        draft.lesson_slot_fit,
        interaction_form:       draft.interaction_form,
        feedback_text:          draft.feedback_text,
        feedback_correct:       draft.feedback_correct,
        feedback_wrong:         draft.feedback_wrong,
        is_diagnostic:          draft.is_diagnostic,
        source:                 draft.source,
      },
    });

    await tx.taskDraft.delete({ where: { id: draft.id } });
  });

  return ok(c, { action: 'approved', variant_id });
});

// ─── POST /api/admin/content/reject ──────────────────────────────────────────

const rejectSchema = actionSchema.extend({ reason: z.string().min(1) });

content.post('/reject', async (c) => {
  const body   = await c.req.json().catch(() => null);
  const parsed = rejectSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }
  const { variant_id, reason } = parsed.data;

  const draft = await prisma.taskDraft.findUnique({ where: { id: variant_id } });
  if (!draft) {
    return ERRORS.NOT_FOUND(c, `Variant ${variant_id} not found`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.taskDraftAuditLog.create({
      data: {
        draft_id:   draft.id,
        task_id:    draft.id,
        action:     'rejected',
        from_stage: draft.stage,
        to_stage:   DraftStage.REJECTED,
        reason,
        snapshot:   draft as object,
      },
    });
    await tx.taskDraft.update({
      where: { id: variant_id },
      data:  { stage: DraftStage.REJECTED, rejection_reason: reason },
    });
  });

  return ok(c, { action: 'rejected', variant_id, reason });
});

// ─── POST /api/admin/content/flag ────────────────────────────────────────────

const flagSchema = actionSchema.extend({ reason: z.string().min(1) });

content.post('/flag', async (c) => {
  const body   = await c.req.json().catch(() => null);
  const parsed = flagSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }
  const { variant_id, reason } = parsed.data;

  const draft = await prisma.taskDraft.findUnique({ where: { id: variant_id } });
  if (!draft) {
    return ERRORS.NOT_FOUND(c, `Variant ${variant_id} not found`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.taskDraftAuditLog.create({
      data: {
        draft_id:   draft.id,
        task_id:    draft.id,
        action:     'flagged',
        from_stage: draft.stage,
        to_stage:   DraftStage.FLAGGED,
        reason,
        snapshot:   draft as object,
      },
    });
    await tx.taskDraft.update({
      where: { id: variant_id },
      data:  { stage: DraftStage.FLAGGED, flag_reason: reason },
    });
  });

  return ok(c, { action: 'flagged', variant_id, reason });
});

// ─── POST /api/admin/content/revise ──────────────────────────────────────────

const reviseSchema = actionSchema.extend({ reason: z.string().min(1) });

content.post('/revise', async (c) => {
  const body   = await c.req.json().catch(() => null);
  const parsed = reviseSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }
  const { variant_id, reason } = parsed.data;

  const draft = await prisma.taskDraft.findUnique({ where: { id: variant_id } });
  if (!draft) {
    return ERRORS.NOT_FOUND(c, `Variant ${variant_id} not found`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.taskDraftAuditLog.create({
      data: {
        draft_id:   draft.id,
        task_id:    draft.id,
        action:     'needs_revision',
        from_stage: draft.stage,
        to_stage:   DraftStage.NEEDS_REVISION,
        reason,
        snapshot:   draft as object,
      },
    });
    await tx.taskDraft.update({
      where: { id: variant_id },
      data:  { stage: DraftStage.NEEDS_REVISION, revision_reason: reason },
    });
  });

  return ok(c, { action: 'needs_revision', variant_id, reason });
});

// ─── POST /api/admin/content/edit ────────────────────────────────────────────

const IMMUTABLE_FIELDS = new Set([
  'id', 'stage', 'created_at', 'updated_at', 'ai_reviewed_at',
]);

const editSchema = z.object({
  variant_id: z.string().min(1),
  stage:      z.enum(['stage1', 'stage2', 'flagged', 'needs_revision', 'rejected']).default('stage2'),
  updates:    z.record(z.string(), z.unknown()).refine(
    (u) => Object.keys(u).length > 0,
    'updates must not be empty',
  ),
});

content.post('/edit', async (c) => {
  const body   = await c.req.json().catch(() => null);
  const parsed = editSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }
  const { variant_id, updates } = parsed.data;

  const safeUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (!IMMUTABLE_FIELDS.has(key)) safeUpdates[key] = value;
  }
  if (Object.keys(safeUpdates).length === 0) {
    return ERRORS.VALIDATION_ERROR(c, 'No editable fields in updates');
  }

  const draft = await prisma.taskDraft.findUnique({ where: { id: variant_id } });
  if (!draft) {
    return ERRORS.NOT_FOUND(c, `Variant ${variant_id} not found`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.taskDraftAuditLog.create({
      data: {
        draft_id:   draft.id,
        task_id:    draft.id,
        action:     'edited',
        from_stage: draft.stage,
        notes:      `Fields: ${Object.keys(safeUpdates).join(', ')}`,
        snapshot:   draft as object,
      },
    });
    await tx.taskDraft.update({
      where: { id: variant_id },
      data:  safeUpdates,
    });
  });

  return ok(c, { action: 'edited', variant_id, updated_fields: Object.keys(safeUpdates) });
});

// ─── Helpers: audio PCM → WAV ─────────────────────────────────────────────────

function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, channels = 1, bitDepth = 16): Buffer {
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * (bitDepth / 8), 28);
  header.writeUInt16LE(channels * (bitDepth / 8), 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmBuffer]);
}

// ─── POST /api/admin/content/generate-image ───────────────────────────────────

const generateImageSchema = z.object({
  prompt: z.string().min(1),
  grade_band: z.array(z.string()).optional(),
});

const IMAGE_STYLE_SYSTEM =
  `You are an image-prompt writer for a Mongolian children\'s educational spelling app (grades 1–4).\n` +
  `You receive a subject, usually a single Mongolian word (occasionally English). First understand exactly what real-world thing the word names (e.g. "мод" = a tree), then write ONE English image generation prompt that depicts that thing.\n\n` +
  `Produce a CONSISTENT flashcard icon. Every image must follow the SAME recipe so a whole set looks uniform:\n` +
  `- exactly ONE subject, centered, filling most of the frame\n` +
  `- flat vector illustration, clean bold outlines, smooth flat fills\n` +
  `- a single plain solid soft-pastel background color — NO scene, NO landscape, NO floor, NO horizon, NO props, NO shadows beyond a simple soft contact shadow\n` +
  `- soft, warm, cheerful palette\n` +
  `- NO text, NO letters, NO numbers, NO labels anywhere\n` +
  `- friendly and simple enough for a 6-year-old to recognize instantly\n\n` +
  `Mongolian cultural authenticity: ONLY when the subject itself is culturally Mongolian (e.g. ger, deel, airag, morin khuur, khuushuur) depict it accurately in traditional form. Do NOT add Mongolian scenery, steppe, or cultural motifs to ordinary subjects (tree, apple, dog, car).\n\n` +
  `Describe the object itself — its shape, color, and key recognizable features — NOT a scene or action.\n` +
  `Return ONLY the image prompt. No explanation, no quotes, no preamble.`;

content.post('/generate-image', adminGenerateLimiter, async (c) => {
  const body   = await c.req.json().catch(() => null);
  const parsed = generateImageSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }

  const orClient = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey:  env.OPENROUTER_API_KEY,
  });

  try {
    const { prompt, grade_band } = parsed.data;

    const isYoung = !grade_band || grade_band.some((g) => g === 'G1' || g === 'G2');
    const gradeHint = isYoung
      ? 'Keep it extremely simple and bold: one clear subject, minimal detail.'
      : 'Keep it simple and clean: one clear subject, a little more detail is fine, but still an isolated icon on a plain background.';

    const promptChat = await orClient.chat.completions.create({
      model:    'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: IMAGE_STYLE_SYSTEM },
        { role: 'user',   content: `${gradeHint}\n\nSubject: ${prompt}` },
      ],
    });
    const fullPrompt = promptChat.choices[0]?.message?.content?.trim() ?? prompt;

    const chat = await orClient.chat.completions.create({
      model:    'black-forest-labs/flux.2-klein-4b',
      messages: [{ role: 'user', content: fullPrompt }],
    });

    const choice = chat.choices[0];
    const images = (choice?.message as { images?: { image_url?: { url?: string } }[] })?.images;
    const dataUri = images?.[0]?.image_url?.url ?? '';
    const b64 = dataUri.includes(',') ? dataUri.split(',')[1] : '';
    if (!b64) throw new Error(`No image data found. Response: ${JSON.stringify(chat).slice(0, 400)}`);

    const imgBuf = Buffer.from(b64, 'base64');
    const tempId = crypto.randomUUID();

    if (r2Enabled()) {
      await r2Upload(`temp/${tempId}.png`, imgBuf, 'image/png');
    } else {
      fs.mkdirSync(IMG_TEMP, { recursive: true });
      fs.writeFileSync(path.join(IMG_TEMP, `${tempId}.png`), imgBuf);
    }

    return ok(c, { temp_id: tempId, base64: b64 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return ERRORS.INTERNAL(c, msg);
  }
});

// ─── POST /api/admin/content/generate-audio ───────────────────────────────────


const generateAudioSchema = z.object({
  text: z.string().min(1),
  slot: z.enum(['dictation', 'prompt']),
});

content.post('/generate-audio', adminGenerateLimiter, async (c) => {
  if (!env.GEMINI_API_KEY) {
    return ERRORS.SERVICE_UNAVAILABLE(c, 'GEMINI_API_KEY not configured on server');
  }

  const body   = await c.req.json().catch(() => null);
  const parsed = generateAudioSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }

  const { text } = parsed.data;
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

  try {
    const response = await ai.models.generateContent({
      model:    'gemini-2.5-pro-preview-tts',
      contents: [{ parts: [{ text: `Read aloud: ${text}` }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
    } as Parameters<typeof ai.models.generateContent>[0]);

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!audioData?.data) {
      throw new Error(`No audio data in response (finishReason: ${response.candidates?.[0]?.finishReason})`);
    }

    const pcm        = Buffer.from(audioData.data, 'base64');
    const rateMatch  = audioData.mimeType?.match(/rate=(\d+)/);
    const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
    const wav        = pcmToWav(pcm, sampleRate);
    const tempId     = crypto.randomUUID();

    if (r2Enabled()) {
      await r2Upload(`temp/${tempId}.wav`, wav, 'audio/wav');
    } else {
      fs.mkdirSync(AUD_TEMP, { recursive: true });
      fs.writeFileSync(path.join(AUD_TEMP, `${tempId}.wav`), wav);
    }

    return ok(c, { temp_id: tempId, base64: wav.toString('base64') });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return ERRORS.INTERNAL(c, msg);
  }
});

// ─── POST /api/admin/content/accept-image ─────────────────────────────────────

const ASSET_STAGES = ['stage1', 'stage2', 'validated', 'flagged', 'needs_revision'] as const;

const acceptImageSchema = z.object({
  temp_id:    z.string().uuid(),
  variant_id: z.string().min(1),
  stage:      z.enum(ASSET_STAGES).default('stage2'),
});

content.post('/accept-image', async (c) => {
  const body   = await c.req.json().catch(() => null);
  const parsed = acceptImageSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }

  const { temp_id, variant_id, stage } = parsed.data;
  const filename = `img_${variant_id}.png`;
  let image_url: string;

  if (r2Enabled()) {
    image_url = await r2Move(`temp/${temp_id}.png`, `images/${filename}`);
  } else {
    const srcPath = path.join(IMG_TEMP, `${temp_id}.png`);
    if (!fs.existsSync(srcPath)) {
      return ERRORS.NOT_FOUND(c, `Temp image ${temp_id} not found`);
    }
    const destPath = path.join(IMG_GEN, filename);
    fs.mkdirSync(IMG_GEN, { recursive: true });
    fs.renameSync(srcPath, destPath);
    image_url = `/content/images/generated/${filename}`;
  }

  if (stage === 'validated') {
    const updated = await prisma.task.updateMany({ where: { id: variant_id }, data: { image_url } });
    if (!updated.count) {
      return ERRORS.NOT_FOUND(c, `Task ${variant_id} not found in live tasks`);
    }
  } else {
    const updated = await prisma.taskDraft.updateMany({ where: { id: variant_id }, data: { image_url } });
    if (!updated.count) {
      return ERRORS.NOT_FOUND(c, `Variant ${variant_id} not found — image saved but task not updated`);
    }
  }

  return ok(c, { action: 'image_accepted', variant_id, image_url });
});

// ─── POST /api/admin/content/accept-audio ─────────────────────────────────────

const acceptAudioSchema = z.object({
  temp_id:    z.string().uuid(),
  variant_id: z.string().min(1),
  slot:       z.enum(['dictation', 'prompt']),
  stage:      z.enum(ASSET_STAGES).default('stage2'),
});

content.post('/accept-audio', async (c) => {
  const body   = await c.req.json().catch(() => null);
  const parsed = acceptAudioSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }

  const { temp_id, variant_id, slot, stage } = parsed.data;
  const prefix   = slot === 'dictation' ? 'dict_' : 'prompt_';
  const filename = `${prefix}${variant_id}.wav`;
  const field    = slot === 'dictation' ? 'audio_url' : 'prompt_audio_url';
  let audioUrl: string;

  if (r2Enabled()) {
    audioUrl = await r2Move(`temp/${temp_id}.wav`, `audio/${filename}`);
  } else {
    const srcPath = path.join(AUD_TEMP, `${temp_id}.wav`);
    if (!fs.existsSync(srcPath)) {
      return ERRORS.NOT_FOUND(c, `Temp audio ${temp_id} not found`);
    }
    const destPath = path.join(AUD_DIR, filename);
    fs.mkdirSync(AUD_DIR, { recursive: true });
    fs.renameSync(srcPath, destPath);
    audioUrl = `/content/audio/${filename}`;
  }

  if (stage === 'validated') {
    const updated = await prisma.task.updateMany({ where: { id: variant_id }, data: { audio_url: audioUrl } });
    if (!updated.count) {
      return ERRORS.NOT_FOUND(c, `Task ${variant_id} not found in live tasks`);
    }
  } else {
    const updated = await prisma.taskDraft.updateMany({
      where: { id: variant_id },
      data:  { [field]: audioUrl },
    });
    if (!updated.count) {
      return ERRORS.NOT_FOUND(c, `Variant ${variant_id} not found — audio saved but task not updated`);
    }
  }

  return ok(c, { action: 'audio_accepted', variant_id, slot, [field]: audioUrl });
});

// ─── Asset URL allowlist ──────────────────────────────────────────────────────
// Only allow relative /content/ paths (local serve) or the configured R2 CDN origin.
// This prevents storing arbitrary URLs (including private IPs) in the database.
const assetUrlSchema = z.string().refine(
  (url) => {
    if (url.startsWith('/content/')) return true;
    if (!env.R2_PUBLIC_URL) return false;
    try {
      const allowed = new URL(env.R2_PUBLIC_URL);
      const given   = new URL(url);
      return given.origin === allowed.origin;
    } catch {
      return false;
    }
  },
  { message: 'URL must be a relative /content/ path or an R2 CDN URL' },
);

// ─── POST /api/admin/content/update-image ────────────────────────────────────

const updateImageSchema = z.object({
  image_url:  assetUrlSchema,
  variant_id: z.string().min(1),
  stage:      z.enum(ASSET_STAGES).default('stage2'),
});

content.post('/update-image', async (c) => {
  const body   = await c.req.json().catch(() => null);
  const parsed = updateImageSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }

  const { image_url, variant_id, stage } = parsed.data;

  if (stage === 'validated') {
    const updated = await prisma.task.updateMany({ where: { id: variant_id }, data: { image_url } });
    if (!updated.count) {
      return ERRORS.NOT_FOUND(c, `Task ${variant_id} not found in live tasks`);
    }
  } else {
    const updated = await prisma.taskDraft.updateMany({ where: { id: variant_id }, data: { image_url } });
    if (!updated.count) {
      return ERRORS.NOT_FOUND(c, `Variant ${variant_id} not found`);
    }
  }

  return ok(c, { action: 'image_updated', variant_id, image_url });
});

// ─── POST /api/admin/content/update-audio ────────────────────────────────────

const updateAudioSchema = z.object({
  audio_url:  assetUrlSchema,
  variant_id: z.string().min(1),
  slot:       z.enum(['dictation', 'prompt']),
  stage:      z.enum(ASSET_STAGES).default('stage2'),
});

content.post('/update-audio', async (c) => {
  const body   = await c.req.json().catch(() => null);
  const parsed = updateAudioSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }

  const { audio_url, variant_id, slot, stage } = parsed.data;
  const field = slot === 'dictation' ? 'audio_url' : 'prompt_audio_url';

  if (stage === 'validated') {
    const updated = await prisma.task.updateMany({ where: { id: variant_id }, data: { [field]: audio_url } });
    if (!updated.count) {
      return ERRORS.NOT_FOUND(c, `Task ${variant_id} not found in live tasks`);
    }
  } else {
    const updated = await prisma.taskDraft.updateMany({
      where: { id: variant_id },
      data:  { [field]: audio_url },
    });
    if (!updated.count) {
      return ERRORS.NOT_FOUND(c, `Variant ${variant_id} not found`);
    }
  }

  return ok(c, { action: 'audio_updated', variant_id, slot, [field]: audio_url });
});

// ─── GET /api/admin/content/generate/specs ───────────────────────────────────

content.get('/generate/specs', (c) => {
  const specs = TASK_SPECS
    .filter((s) => !s.self_check && AVAILABLE_TASK_IDS.includes(s.id))
    .map(({ id, task_type, mongolian_name, grade_band, primary_skill, difficulty, estimated_time_seconds, lesson_slot_fit }) => ({
      id, task_type, mongolian_name, grade_band, primary_skill, difficulty, estimated_time_seconds, lesson_slot_fit,
    }));
  return ok(c, { task_ids: AVAILABLE_TASK_IDS, specs });
});

// ─── POST /api/admin/content/generate ────────────────────────────────────────

const generateSchema = z.object({
  task_ids:  z.array(z.string().min(1)).min(1),
  grades:    z.array(z.number().int().min(1).max(4)).min(1),
  levels:    z.array(z.enum(['M0', 'M1', 'M2', 'M3', 'M4', 'M5'])).optional(),
  max_items: z.number().int().min(1).max(10).default(3),
  max_cost:  z.number().positive().max(50).default(5),
});

content.post('/generate', adminGenerateLimiter, async (c) => {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return ERRORS.SERVICE_UNAVAILABLE(c, 'OPENROUTER_API_KEY not configured on server');
  }

  const body   = await c.req.json().catch(() => null);
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }

  const { task_ids, grades, levels, max_items, max_cost } = parsed.data;

  // Reject unknown or unavailable task IDs upfront
  const unknown = task_ids.filter((id) => !AVAILABLE_TASK_IDS.includes(id));
  if (unknown.length) {
    return ERRORS.VALIDATION_ERROR(c, `Unknown or unavailable task IDs: ${unknown.join(', ')}. Available: ${AVAILABLE_TASK_IDS.join(', ')}`);
  }

  // Expand the request into one generation cell per (grade × level × task type).
  // No levels selected → a single "any level" pass per grade (level undefined).
  type GenLevel = 'M0' | 'M1' | 'M2' | 'M3' | 'M4' | 'M5';
  const levelTargets: (GenLevel | undefined)[] =
    levels && levels.length > 0 ? levels : [undefined];
  const cells: Array<{ grade: number; level: GenLevel | undefined; task_type_spec_id: string }> = [];
  for (const grade of grades) {
    for (const level of levelTargets) {
      for (const task_type_spec_id of task_ids) {
        cells.push({ grade, level, task_type_spec_id });
      }
    }
  }

  const runningCost = { value: 0 };
  const results: Array<{
    task_type: string;
    grade: number;
    level: string | null;
    passed: number;
    rejected: number;
    drafts_created: number;
    ai_blocked: number;
    cost_usd: number;
    error?: string;
  }> = [];

  for (const { grade, level, task_type_spec_id } of cells) {
    // One shared cost budget across every cell; stop cleanly once it's spent.
    if (runningCost.value >= max_cost) break;
    const spec = TASK_SPECS.find((s) => s.id === task_type_spec_id);
    if (!spec) continue;

    const costBefore = runningCost.value;
    let result: Awaited<ReturnType<typeof generateForSpec>>;
    try {
      result = await generateForSpec(spec, { apiKey, db: prisma, target: { grade, level }, maxItems: max_items, maxCost: max_cost, runningCost });
    } catch (err) {
      const cost_usd = runningCost.value - costBefore;
      results.push({ task_type: task_type_spec_id, grade, level: level ?? null, passed: 0, rejected: 0, drafts_created: 0, ai_blocked: 0, cost_usd, error: (err as Error).message });
      continue;
    }
    const cost_usd = runningCost.value - costBefore;

    let drafts_created = 0;
    let ai_blocked = 0;

    for (const variant of result.passed) {
      const variantId = variant['id'] as string;
      let draftData: {
        task_type: TaskType;
        prompt_text: string;
        correct_answer: string;
        options: object;
        audio_url: string | null;
        image_url: string | null;
        primary_skill: SkillCode;
        secondary_skill: SkillCode | null;
        level_target: string;
        error_targets: string[];
        grade_band: string[];
        grade_levels: string[];
        difficulty: number;
        estimated_time_seconds: number;
        lesson_slot_fit: LessonSlot;
        feedback_text: string;
      };
      try {
        draftData = {
          task_type:              toTaskType(variant['task_type'] as string),
          prompt_text:            (variant['prompt_text'] as string) ?? '',
          correct_answer:         (variant['correct_answer'] as string) ?? '',
          options:                (variant['options'] as object) ?? {},
          audio_url:              (variant['audio_url'] as string | null) ?? null,
          image_url:              (variant['image_url'] as string | null) ?? null,
          primary_skill:          toSkill(variant['primary_skill'] as string) as SkillCode,
          secondary_skill:        toSkill(variant['secondary_skill'] as string | null),
          level_target:           (variant['level_target'] as string) ?? '',
          error_targets:          (variant['error_targets'] as string[]) ?? [],
          grade_band:             (variant['grade_band'] as string[]) ?? [],
          grade_levels:           (variant['grade_levels'] as string[]) ?? [],
          difficulty:             (variant['difficulty'] as number) ?? 1,
          estimated_time_seconds: (variant['estimated_time_seconds'] as number) ?? 30,
          lesson_slot_fit:        toSlot(variant['lesson_slot_fit'] as string),
          feedback_text:          (variant['feedback_text'] as string) ?? '',
        };
      } catch (err) {
        result.rejected.push({ ...variant, _error: (err as Error).message });
        continue;
      }

      // Run AI review before deciding final stage
      let review: AIReviewResult;
      try {
        review = await reviewTaskDraft(
          {
            task_type:      draftData.task_type,
            grade_band:     draftData.grade_band,
            difficulty:     draftData.difficulty,
            error_targets:  draftData.error_targets,
            prompt_text:    draftData.prompt_text,
            correct_answer: draftData.correct_answer,
            options:        draftData.options,
            feedback_text:  draftData.feedback_text,
          },
          apiKey,
        );
      } catch (err) {
        result.rejected.push({ ...variant, _error: `AI review failed: ${(err as Error).message}` });
        continue;
      }

      // Blockers go to STAGE1 (hidden from review queue until manually promoted)
      const stage = review.severity === 'blocker' ? DraftStage.STAGE1 : DraftStage.STAGE2;
      if (review.severity === 'blocker') ai_blocked++;

      try {
        await prisma.taskDraft.upsert({
          where:  { id: variantId },
          create: {
            id: variantId,
            stage,
            source: TaskSource.AI,
            ...draftData,
            ai_review_severity: review.severity,
            ai_review_issues:   review.issues,
            ai_fix_suggestion:  review.fix_suggestion,
            ai_reviewed_at:     new Date(),
          },
          update: {
            stage,
            source: TaskSource.AI,
            ...draftData,
            ai_review_severity: review.severity,
            ai_review_issues:   review.issues,
            ai_fix_suggestion:  review.fix_suggestion,
            ai_reviewed_at:     new Date(),
          },
        });
        drafts_created++;
      } catch (err) {
        result.rejected.push({ ...variant, _error: `DB save failed: ${(err as Error).message}` });
        continue;
      }
    }

    results.push({ task_type: task_type_spec_id, grade, level: level ?? null, passed: result.passed.length, rejected: result.rejected.length, drafts_created, ai_blocked, cost_usd });
  }

  return ok(c, { results, total_cost_usd: runningCost.value });
});

// ─── GET /api/admin/content/live-tasks ───────────────────────────────────────

const liveListQuerySchema = z.object({
  grade:    z.enum(['G1', 'G2', 'G3', 'G4']).optional(),
  type:     z.string().optional(),
  skill:    z.string().optional(),
  active:   z.enum(['true', 'false', 'all']).default('true'),
  page:     z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(200).default(100),
});

content.get('/live-tasks', async (c) => {
  const parsed = liveListQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid query', parsed.error.flatten().fieldErrors);
  }
  const { grade, type, skill, active, page, per_page } = parsed.data;

  const where = {
    ...(grade ? { grade_band: { has: grade } } : {}),
    ...(type  ? { task_type: toTaskType(type) } : {}),
    ...(skill ? { OR: [
      { primary_skill:   toSkill(skill) as SkillCode },
      { secondary_skill: toSkill(skill) as SkillCode },
    ]} : {}),
    ...(active !== 'all' ? { is_active: active === 'true' } : {}),
  } as const;

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      skip:  (page - 1) * per_page,
      take:  per_page,
    }),
    prisma.task.count({ where }),
  ]);

  return ok(c, {
    total,
    tasks,
    meta: { page, per_page, total, has_next: page * per_page < total },
  });
});

// ─── GET /api/admin/content/live-tasks/:id ───────────────────────────────────

content.get('/live-tasks/:id', async (c) => {
  const id = c.req.param('id');
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return ERRORS.NOT_FOUND(c, `Task ${id} not found`);
  return ok(c, { task: serializeVariant(task) });
});

// ─── PATCH /api/admin/content/live-tasks/:id ──────────────────────────────────

const LIVE_IMMUTABLE = new Set(['id', 'task_type', 'grade_band', 'primary_skill', 'is_diagnostic']);

const patchLiveTaskSchema = z.object({
  updates: z.record(z.string(), z.unknown()).refine(
    (u) => Object.keys(u).length > 0,
    'updates must not be empty',
  ),
});

content.patch('/live-tasks/:id', async (c) => {
  const id     = c.req.param('id');
  const body   = await c.req.json().catch(() => null);
  const parsed = patchLiveTaskSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return ERRORS.NOT_FOUND(c, `Task ${id} not found`);

  const safeUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data.updates)) {
    if (!LIVE_IMMUTABLE.has(key)) safeUpdates[key] = value;
  }
  if (Object.keys(safeUpdates).length === 0) {
    return ERRORS.VALIDATION_ERROR(c, 'No editable fields in updates');
  }

  await prisma.$transaction(async (tx) => {
    await tx.taskDraftAuditLog.create({
      data: {
        draft_id:   null,
        task_id:    id,
        action:     'edited_live',
        from_stage: DraftStage.STAGE2,
        notes:      `Fields: ${Object.keys(safeUpdates).join(', ')}`,
        snapshot:   task as object,
      },
    });
    await tx.task.update({ where: { id }, data: safeUpdates });
  });

  return ok(c, { action: 'updated', id, updated_fields: Object.keys(safeUpdates) });
});

// ─── DELETE /api/admin/content/live-tasks/:id ─────────────────────────────────

content.delete('/live-tasks/:id', async (c) => {
  const id = c.req.param('id');
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return ERRORS.NOT_FOUND(c, `Task ${id} not found`);

  await prisma.$transaction(async (tx) => {
    await tx.taskDraftAuditLog.create({
      data: {
        draft_id:  null,
        task_id:   id,
        action:    'deactivated_live',
        from_stage: DraftStage.STAGE2,
        snapshot:  task as object,
      },
    });
    await tx.task.update({ where: { id }, data: { is_active: false } });
  });

  return ok(c, { action: 'deactivated', id });
});

// ─── POST /api/admin/content/bulk-delete-drafts ───────────────────────────────

const bulkDeleteDraftsSchema = z.object({
  variant_ids: z.array(z.string().min(1)).min(1),
});

content.post('/bulk-delete-drafts', async (c) => {
  const body   = await c.req.json().catch(() => null);
  const parsed = bulkDeleteDraftsSchema.safeParse(body);
  if (!parsed.success)
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);

  const { variant_ids } = parsed.data;

  const drafts = await prisma.taskDraft.findMany({ where: { id: { in: variant_ids } } });
  const foundIds = new Set(drafts.map((d) => d.id));
  const notFound = variant_ids.filter((id) => !foundIds.has(id));
  if (notFound.length > 0)
    return ERRORS.NOT_FOUND(c, `Drafts not found: ${notFound.join(', ')}`);

  await prisma.$transaction(async (tx) => {
    for (const draft of drafts) {
      await tx.taskDraftAuditLog.create({
        data: {
          draft_id:   draft.id,
          task_id:    draft.id,
          action:     'rejected',
          from_stage: draft.stage,
          snapshot:   draft as object,
        },
      });
    }
    await tx.taskDraft.deleteMany({ where: { id: { in: variant_ids } } });
  });

  return ok(c, { action: 'bulk_deleted', deleted_count: drafts.length, variant_ids });
});

// ─── Word bank ────────────────────────────────────────────────────────────────

// GET /api/admin/content/words — paginated, filterable list of the word bank.
const wordsListQuerySchema = z.object({
  grade:     z.enum(['G1', 'G2', 'G3', 'G4']).optional(),
  category:  z.string().optional(),
  app_level: z.string().optional(),
  q:         z.string().optional(),
  active:    z.enum(['true', 'false', 'all']).default('true'),
  has_forms: z.enum(['true', 'all']).default('all'), // 'true' → only roots that have inflected forms
  page:      z.coerce.number().int().min(1).default(1),
  per_page:  z.coerce.number().int().min(1).max(200).default(50),
});

content.get('/words', async (c) => {
  const parsed = wordsListQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid query', parsed.error.flatten().fieldErrors);
  }
  const { grade, category, app_level, q, active, has_forms, page, per_page } = parsed.data;

  const where = {
    root_word_id: null, // roots only — inflected-form rows are excluded from the word list
    ...(grade ? { grade_band: { has: grade } } : {}),
    ...(category ? { category } : {}),
    ...(app_level ? { app_level } : {}),
    ...(q ? { word: { contains: q, mode: 'insensitive' as const } } : {}),
    ...(active !== 'all' ? { is_active: active === 'true' } : {}),
    ...(has_forms === 'true' ? { forms: { some: {} } } : {}),
  };

  const [words, total] = await Promise.all([
    prisma.word.findMany({
      where,
      orderBy: { word: 'asc' },
      skip: (page - 1) * per_page,
      take: per_page,
      // Each root's linked inflected forms (e.g. ах → ахтайгаа) + this row's own
      // root (non-null only when the row is itself a form) for the admin UI.
      include: {
        forms: { select: { id: true, word: true }, orderBy: { word: 'asc' } },
        root_word: { select: { id: true, word: true } },
      },
    }),
    prisma.word.count({ where }),
  ]);

  return ok(c, {
    words,
    total,
    meta: { page, per_page, total, has_next: page * per_page < total },
  });
});

// GET /api/admin/content/words/facets — distinct values for the filter dropdowns.
// grades: flattens each word's grade_band array so a word in ['G1','G2'] contributes to both buckets.
content.get('/words/facets', async (c) => {
  // roots only — inflected-form rows are excluded from the facet buckets.
  const [gradeBands, categories, levels] = await Promise.all([
    prisma.word.findMany({ where: { grade_band: { isEmpty: false }, root_word_id: null }, select: { grade_band: true } }),
    prisma.word.findMany({ where: { category: { not: '' }, root_word_id: null }, distinct: ['category'], select: { category: true } }),
    prisma.word.findMany({ where: { app_level: { not: null }, root_word_id: null }, distinct: ['app_level'], select: { app_level: true } }),
  ]);

  const grades = new Set<string>();
  for (const { grade_band } of gradeBands) {
    for (const g of grade_band) grades.add(g);
  }

  return ok(c, {
    grades: [...grades].sort(),
    categories: categories.map((c2) => c2.category).filter(Boolean).sort((a, b) => a.localeCompare(b, 'mn')),
    app_levels: levels.map((l) => l.app_level).filter((l): l is string => !!l).sort(),
  });
});

// POST /api/admin/content/words/import — upload an xlsx; preview (default) or commit.
// Commit replaces all words sharing the dataset id-prefix (e.g. WG1-*) with the parsed set.
const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // 5 MB

content.post('/words/import', async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.parseBody();
  } catch {
    return ERRORS.VALIDATION_ERROR(c, 'Expected multipart/form-data with a "file" field');
  }

  const file = body['file'];
  const commit = body['commit'] === 'true' || c.req.query('commit') === 'true';

  if (!(file instanceof File)) {
    return ERRORS.VALIDATION_ERROR(c, 'Missing "file" upload');
  }
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    return ERRORS.VALIDATION_ERROR(c, 'File must be an .xlsx spreadsheet');
  }
  if (file.size > MAX_IMPORT_BYTES) {
    return ERRORS.VALIDATION_ERROR(c, `File too large (max ${MAX_IMPORT_BYTES / 1024 / 1024} MB)`);
  }

  let parseResult;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    parseResult = parseClassifiedWorkbook(buffer);
  } catch (e) {
    return ERRORS.VALIDATION_ERROR(c, `Could not read spreadsheet: ${(e as Error).message}`);
  }

  const { rows, reviewNos } = parseResult;
  if (rows.length === 0) {
    return ERRORS.VALIDATION_ERROR(c, 'No words found in sheet "Ангилсан_үгс"');
  }

  const { kept, dropped } = filterWords(rows, reviewNos);
  const records = toWordRecords(kept);
  const { grade, prefix } = datasetInfo(rows);
  const summary = { parsed: rows.length, kept: records.length, ...summarizeFilter(dropped) };

  if (!commit) {
    return ok(c, { committed: false, grade, prefix, summary, dropped });
  }

  await prisma.$transaction([
    prisma.word.deleteMany({ where: { id: { startsWith: `${prefix}-` } } }),
    prisma.word.createMany({ data: records }),
  ]);

  return ok(c, { committed: true, grade, prefix, summary, imported: records.length });
});

// ─── PATCH /api/admin/content/words/:id ──────────────────────────────────────

const WORD_DERIVED_FIELDS = new Set([
  'id', 'skills_possible', 'errors_possible', 'task_types_possible',
  'primary_feature', 'primary_skill', 'balarhai_unknown',
]);

const patchWordSchema = z.object({
  word:                z.string().min(1).optional(),
  part_of_speech:      z.string().nullable().optional(),
  meaning_type:        z.string().nullable().optional(),
  spelling_tag:        z.string().nullable().optional(),
  suggested_exercises: z.string().nullable().optional(),
  app_level:           z.string().nullable().optional(),
  grade_band:          z.array(z.string()).optional(),
  meaning_complexity:  z.number().int().nullable().optional(),
  spelling_complexity: z.number().int().nullable().optional(),
  morph_complexity:    z.number().int().nullable().optional(),
  category:            z.string().optional(),
  is_active:           z.boolean().optional(),
});

content.patch('/words/:id', async (c) => {
  const id  = c.req.param('id');
  const raw = await c.req.json().catch(() => null);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body');
  }

  const forbidden = Object.keys(raw).filter((k) => WORD_DERIVED_FIELDS.has(k));
  if (forbidden.length > 0) {
    return ERRORS.VALIDATION_ERROR(c, `Cannot set derived/immutable fields: ${forbidden.join(', ')}`);
  }

  const parsed = patchWordSchema.safeParse(raw);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }

  const updates = parsed.data;
  if (Object.keys(updates).length === 0) {
    return ERRORS.VALIDATION_ERROR(c, 'No editable fields provided');
  }

  if (updates.word !== undefined) {
    const w = updates.word.trim();
    if (/\s/.test(w)) {
      return ERRORS.VALIDATION_ERROR(c, 'word must be a single token (no spaces or whitespace)');
    }
    if (!isAllMongolian(w)) {
      return ERRORS.VALIDATION_ERROR(c, 'word must contain only Mongolian Cyrillic characters');
    }
    if (!hasVowel(w)) {
      return ERRORS.VALIDATION_ERROR(c, 'word must contain at least one vowel');
    }
  }

  const word = await prisma.word.findUnique({ where: { id } });
  if (!word) return ERRORS.NOT_FOUND(c, `Word ${id} not found`);

  const needsRederive =
    updates.word !== undefined ||
    updates.part_of_speech !== undefined ||
    updates.meaning_type !== undefined;

  let derivedUpdates: Record<string, unknown> = {};
  if (needsRederive) {
    const cap = deriveCapability({
      word:         updates.word        ?? word.word,
      part_of_speech: updates.part_of_speech !== undefined
        ? (updates.part_of_speech ?? '')
        : (word.part_of_speech ?? ''),
      imageable:    isImageable(
        updates.meaning_type !== undefined ? updates.meaning_type : word.meaning_type,
      ),
    });
    derivedUpdates = {
      skills_possible:     cap.skills_possible,
      errors_possible:     cap.errors_possible,
      task_types_possible: cap.task_types_possible,
      primary_feature:     cap.primary_feature,
      primary_skill:       cap.primary_skill,
      balarhai_unknown:    cap.flags.balarhai_unknown,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.word.update({ where: { id }, data: { ...updates, ...derivedUpdates } });
  });

  const updatedFields = [
    ...Object.keys(updates),
    ...(needsRederive
      ? ['skills_possible', 'errors_possible', 'task_types_possible', 'primary_feature', 'primary_skill', 'balarhai_unknown']
      : []),
  ];

  return ok(c, { action: 'updated', id, updated_fields: updatedFields, rederived: needsRederive });
});

// ─── DELETE /api/admin/content/words/:id — soft-delete (sets is_active=false) ─
// Always soft (rows are never removed). ?mode controls what happens to a root's
// linked inflected forms:
//   solo    (default) — deactivate just this row (a form, or a childless root).
//   detach  — deactivate the root AND unlink its forms (root_word_id → null), so
//             the forms survive as active standalone words.
//   cascade — deactivate the root AND every one of its forms.
const deleteWordQuerySchema = z.object({
  mode: z.enum(['solo', 'detach', 'cascade']).default('solo'),
});

content.delete('/words/:id', async (c) => {
  const id = c.req.param('id');
  const parsed = deleteWordQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid query', parsed.error.flatten().fieldErrors);
  }
  const { mode } = parsed.data;

  const word = await prisma.word.findUnique({ where: { id } });
  if (!word) return ERRORS.NOT_FOUND(c, `Word ${id} not found`);

  let detached = 0;
  let cascaded = 0;
  await prisma.$transaction(async (tx) => {
    await tx.word.update({ where: { id }, data: { is_active: false } });
    if (mode === 'detach') {
      const r = await tx.word.updateMany({ where: { root_word_id: id }, data: { root_word_id: null } });
      detached = r.count;
    } else if (mode === 'cascade') {
      const r = await tx.word.updateMany({ where: { root_word_id: id }, data: { is_active: false } });
      cascaded = r.count;
    }
  });

  return ok(c, { action: 'deactivated', id, mode, forms_detached: detached, forms_deactivated: cascaded });
});

// ─── POST /api/admin/content/words/:id/connect — link a word to a root ────────
// Body { root }: the dictionary-form word to attach this row to. If a root row
// with that word already exists it is reused; otherwise a new root row is
// created (metadata inherited from this word). If the word being connected has
// its own forms they are re-pointed to the root so the tree stays one level deep.
const connectWordSchema = z.object({ root: z.string().min(1) });

content.post('/words/:id/connect', async (c) => {
  const id = c.req.param('id');
  const raw = await c.req.json().catch(() => null);
  const parsed = connectWordSchema.safeParse(raw);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }
  const rootWord = parsed.data.root.trim();

  if (!isAllMongolian(rootWord) || !hasVowel(rootWord)) {
    return ERRORS.VALIDATION_ERROR(c, 'root must be a Mongolian word with at least one vowel');
  }

  const word = await prisma.word.findUnique({ where: { id } });
  if (!word) return ERRORS.NOT_FOUND(c, `Word ${id} not found`);
  if (word.word === rootWord) {
    return ERRORS.VALIDATION_ERROR(c, 'A word cannot be its own root');
  }

  const result = await prisma.$transaction(async (tx) => {
    // Reuse an existing root row for this word, else create one.
    let root = await tx.word.findFirst({ where: { word: rootWord, root_word_id: null } });
    let created = false;
    if (!root) {
      const newId = `WLEM-C-${crypto.randomBytes(4).toString('hex')}`;
      root = await tx.word.create({
        data: {
          id: newId,
          word: rootWord,
          category: word.category,
          grade_band: word.grade_band,
          grade: word.grade,
          char_count: [...rootWord].length,
          syllable_count: syllabify(rootWord).length,
          skill_tags: [], error_tags: [], image_ok: false, audio_ok: false, distractors: [],
          part_of_speech: word.part_of_speech,
        },
      });
      created = true;
    }
    // Re-point this word's own forms up to the new root (keep the tree 1-level).
    await tx.word.updateMany({ where: { root_word_id: id }, data: { root_word_id: root.id } });
    // Link this word under the root (and clear its capability so a form is not eligible).
    await tx.word.update({
      where: { id },
      data: {
        root_word_id: root.id,
        skills_possible: [], errors_possible: [], task_types_possible: [],
        primary_feature: null, primary_skill: null,
      },
    });
    return { rootId: root.id, rootWord: root.word, created };
  });

  return ok(c, { action: 'connected', id, root_id: result.rootId, root_word: result.rootWord, root_created: result.created });
});

export default content;
