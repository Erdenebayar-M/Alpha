import { Hono } from 'hono';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { z } from 'zod';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { withAdmin } from '../lib/auth/adminMiddleware';
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
} from '../../generated/prisma';

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

  return ok(c, {
    pipeline: { ...tally, validated },
  });
});

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

  const where: Parameters<typeof prisma.taskDraft.findMany>[0]['where'] = {
    stage: STAGE_ENUM[stage],
    ...(grade ? { task_id: { startsWith: grade } } : {}),
    ...(type  ? { task_type: toTaskType(type) } : {}),
    ...(skill ? { OR: [
      { primary_skill:   toSkill(skill) as SkillCode },
      { secondary_skill: toSkill(skill) as SkillCode },
    ]} : {}),
  };

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
    tasks,
    meta: { page, per_page, total, has_next: page * per_page < total },
  });
});

// ─── GET /api/admin/content/tasks/:task_id ───────────────────────────────────

content.get('/tasks/:task_id', async (c) => {
  const task_id  = c.req.param('task_id');
  const stageKey = c.req.query('stage') ?? 'stage2';
  const stage    = STAGE_ENUM[stageKey];
  if (!stage) return ERRORS.VALIDATION_ERROR(c, 'Invalid stage');

  const variants = await prisma.taskDraft.findMany({
    where: { task_id, stage },
    orderBy: { created_at: 'asc' },
  });

  if (!variants.length) {
    return ERRORS.NOT_FOUND(c, `Task ${task_id} not found in ${stageKey}`);
  }

  return ok(c, { task_id, stage: stageKey, variant_count: variants.length, variants });
});

// ─── Shared action schema ─────────────────────────────────────────────────────

const actionSchema = z.object({
  task_id:    z.string().min(1),
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
  const { task_id, variant_id, notes } = parsed.data;

  const draft = await prisma.taskDraft.findUnique({ where: { id: variant_id } });
  if (!draft || draft.task_id !== task_id) {
    return ERRORS.NOT_FOUND(c, `Variant ${variant_id} not found`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.taskDraftAuditLog.create({
      data: {
        draft_id:   draft.id,
        task_id:    draft.task_id,
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
        title:                  draft.title,
        prompt_text:            draft.prompt_text,
        correct_answer:         draft.correct_answer,
        options:                draft.options,
        audio_url:              draft.audio_url,
        image_url:              draft.image_url,
        primary_skill:          draft.primary_skill,
        secondary_skill:        draft.secondary_skill,
        level_target:           draft.level_target,
        error_targets:          draft.error_targets,
        grade_band:             draft.grade_band,
        difficulty:             draft.difficulty,
        estimated_time_seconds: draft.estimated_time_seconds,
        review_after_days:      draft.review_after_days,
        lesson_slot_fit:        draft.lesson_slot_fit,
        feedback_text:          draft.feedback_text,
        is_diagnostic:          draft.is_diagnostic,
      },
      update: {
        task_type:              draft.task_type,
        title:                  draft.title,
        prompt_text:            draft.prompt_text,
        correct_answer:         draft.correct_answer,
        options:                draft.options,
        audio_url:              draft.audio_url,
        image_url:              draft.image_url,
        primary_skill:          draft.primary_skill,
        secondary_skill:        draft.secondary_skill,
        level_target:           draft.level_target,
        error_targets:          draft.error_targets,
        grade_band:             draft.grade_band,
        difficulty:             draft.difficulty,
        estimated_time_seconds: draft.estimated_time_seconds,
        review_after_days:      draft.review_after_days,
        lesson_slot_fit:        draft.lesson_slot_fit,
        feedback_text:          draft.feedback_text,
        is_diagnostic:          draft.is_diagnostic,
      },
    });

    await tx.taskDraft.delete({ where: { id: draft.id } });
  });

  return ok(c, { action: 'approved', task_id, variant_id });
});

// ─── POST /api/admin/content/reject ──────────────────────────────────────────

const rejectSchema = actionSchema.extend({ reason: z.string().min(1) });

content.post('/reject', async (c) => {
  const body   = await c.req.json().catch(() => null);
  const parsed = rejectSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }
  const { task_id, variant_id, reason } = parsed.data;

  const draft = await prisma.taskDraft.findUnique({ where: { id: variant_id } });
  if (!draft || draft.task_id !== task_id) {
    return ERRORS.NOT_FOUND(c, `Variant ${variant_id} not found`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.taskDraftAuditLog.create({
      data: {
        draft_id:   draft.id,
        task_id:    draft.task_id,
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

  return ok(c, { action: 'rejected', task_id, variant_id, reason });
});

// ─── POST /api/admin/content/flag ────────────────────────────────────────────

const flagSchema = actionSchema.extend({ reason: z.string().min(1) });

content.post('/flag', async (c) => {
  const body   = await c.req.json().catch(() => null);
  const parsed = flagSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }
  const { task_id, variant_id, reason } = parsed.data;

  const draft = await prisma.taskDraft.findUnique({ where: { id: variant_id } });
  if (!draft || draft.task_id !== task_id) {
    return ERRORS.NOT_FOUND(c, `Variant ${variant_id} not found`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.taskDraftAuditLog.create({
      data: {
        draft_id:   draft.id,
        task_id:    draft.task_id,
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

  return ok(c, { action: 'flagged', task_id, variant_id, reason });
});

// ─── POST /api/admin/content/revise ──────────────────────────────────────────

const reviseSchema = actionSchema.extend({ reason: z.string().min(1) });

content.post('/revise', async (c) => {
  const body   = await c.req.json().catch(() => null);
  const parsed = reviseSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }
  const { task_id, variant_id, reason } = parsed.data;

  const draft = await prisma.taskDraft.findUnique({ where: { id: variant_id } });
  if (!draft || draft.task_id !== task_id) {
    return ERRORS.NOT_FOUND(c, `Variant ${variant_id} not found`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.taskDraftAuditLog.create({
      data: {
        draft_id:   draft.id,
        task_id:    draft.task_id,
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

  return ok(c, { action: 'needs_revision', task_id, variant_id, reason });
});

// ─── POST /api/admin/content/edit ────────────────────────────────────────────

const IMMUTABLE_FIELDS = new Set([
  'id', 'task_id', 'stage', 'created_at', 'updated_at',
  'ai_reviewed_at',
]);

const editSchema = z.object({
  task_id:    z.string().min(1),
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
  const { task_id, variant_id, updates } = parsed.data;

  const safeUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (!IMMUTABLE_FIELDS.has(key)) safeUpdates[key] = value;
  }
  if (Object.keys(safeUpdates).length === 0) {
    return ERRORS.VALIDATION_ERROR(c, 'No editable fields in updates');
  }

  const draft = await prisma.taskDraft.findUnique({ where: { id: variant_id } });
  if (!draft || draft.task_id !== task_id) {
    return ERRORS.NOT_FOUND(c, `Variant ${variant_id} not found`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.taskDraftAuditLog.create({
      data: {
        draft_id:   draft.id,
        task_id:    draft.task_id,
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

  return ok(c, { action: 'edited', task_id, variant_id, updated_fields: Object.keys(safeUpdates) });
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
});

content.post('/generate-image', async (c) => {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    return c.json({ success: false, error: 'OPENAI_API_KEY not configured on server' }, 503 as const);
  }

  const body   = await c.req.json().catch(() => null);
  const parsed = generateImageSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }

  const client = new OpenAI({ apiKey });

  try {
    const response = await client.images.generate({
      model:           'dall-e-3',
      prompt:          parsed.data.prompt,
      n:               1,
      size:            '1024x1024',
      quality:         'standard',
      response_format: 'b64_json',
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) throw new Error('No image data in response');

    const tempId = crypto.randomUUID();
    const buf    = Buffer.from(b64, 'base64');

    if (r2Enabled()) {
      await r2Upload(`temp/${tempId}.png`, buf, 'image/png');
    } else {
      fs.mkdirSync(IMG_TEMP, { recursive: true });
      fs.writeFileSync(path.join(IMG_TEMP, `${tempId}.png`), buf);
    }

    return ok(c, { temp_id: tempId, base64: b64 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: msg }, 500 as const);
  }
});

// ─── POST /api/admin/content/generate-audio ───────────────────────────────────

const SYSTEM_DICTATION =
  'Read the following Mongolian words clearly for a children\'s spelling dictation. ' +
  'Speak each word at natural pace. Mongolian long vowels must be pronounced as clearly doubled.';

const SYSTEM_PROMPT_AUDIO =
  'Read the following Mongolian instruction clearly for a children\'s spelling app aged 6-10. ' +
  'Calm, friendly, clear pace.';

const generateAudioSchema = z.object({
  text:  z.string().min(1),
  slot:  z.enum(['dictation', 'prompt']),
  voice: z.string().default('Kore'),
});

content.post('/generate-audio', async (c) => {
  if (!env.GEMINI_API_KEY) {
    return c.json({ success: false, error: 'GEMINI_API_KEY not configured on server' }, 503 as const);
  }

  const body   = await c.req.json().catch(() => null);
  const parsed = generateAudioSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }

  const { text, slot, voice } = parsed.data;
  const system = slot === 'dictation' ? SYSTEM_DICTATION : SYSTEM_PROMPT_AUDIO;
  const spokenText = `${system}\n\n${text}`;

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

  try {
    const response = await ai.models.generateContent({
      model:    'gemini-3.1-flash-tts-preview',
      contents: [{ role: 'user', parts: [{ text: spokenText }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig:  { prebuiltVoiceConfig: { voiceName: voice } },
          languageCode: 'mn-MN',
        },
      },
    } as Parameters<typeof ai.models.generateContent>[0]);

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!audioData?.data) throw new Error('No audio data in response');

    const pcm       = Buffer.from(audioData.data, 'base64');
    const rateMatch = audioData.mimeType?.match(/rate=(\d+)/);
    const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
    const wav        = pcmToWav(pcm, sampleRate);

    const tempId = crypto.randomUUID();

    if (r2Enabled()) {
      await r2Upload(`temp/${tempId}.wav`, wav, 'audio/wav');
    } else {
      fs.mkdirSync(AUD_TEMP, { recursive: true });
      fs.writeFileSync(path.join(AUD_TEMP, `${tempId}.wav`), wav);
    }

    return ok(c, { temp_id: tempId, base64: wav.toString('base64') });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: msg }, 500 as const);
  }
});

// ─── POST /api/admin/content/accept-image ─────────────────────────────────────

const ASSET_STAGES = ['stage1', 'stage2', 'validated', 'flagged', 'needs_revision'] as const;

const acceptImageSchema = z.object({
  temp_id:    z.string().uuid(),
  task_id:    z.string().min(1),
  variant_id: z.string().min(1),
  stage:      z.enum(ASSET_STAGES).default('stage2'),
});

content.post('/accept-image', async (c) => {
  const body   = await c.req.json().catch(() => null);
  const parsed = acceptImageSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }

  const { temp_id, task_id, variant_id, stage } = parsed.data;
  const filename = `img_${task_id}-${variant_id}.png`;
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

  return ok(c, { action: 'image_accepted', task_id, variant_id, image_url });
});

// ─── POST /api/admin/content/accept-audio ─────────────────────────────────────

const acceptAudioSchema = z.object({
  temp_id:    z.string().uuid(),
  task_id:    z.string().min(1),
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

  const { temp_id, task_id, variant_id, slot, stage } = parsed.data;
  const prefix   = slot === 'dictation' ? 'dict_' : 'prompt_';
  const filename = `${prefix}${task_id}-${variant_id}.wav`;
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

  return ok(c, { action: 'audio_accepted', task_id, variant_id, slot, [field]: audioUrl });
});

export default content;
