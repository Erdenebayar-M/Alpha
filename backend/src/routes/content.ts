import { Hono } from 'hono';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { withAdmin } from '../lib/auth/adminMiddleware';
import { ERRORS } from '../lib/errors';
import { ok } from '../lib/response';

const content = new Hono();
content.use('/*', withAdmin);

// ─── Paths ────────────────────────────────────────────────────────────────────

const PIPELINE = path.resolve(__dirname, '../../../content-pipeline');
const DIRS = {
  stage1: path.join(PIPELINE, 'stage1'),
  stage2: path.join(PIPELINE, 'stage2'),
  validated: path.join(PIPELINE, 'validated'),
  flagged: path.join(PIPELINE, 'flagged'),
  rejected: path.join(PIPELINE, 'rejected', 'stage2'),
  needs_revision: path.join(PIPELINE, 'needs_revision'),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

type TaskVariant = Record<string, unknown> & { id: string };

function readVariants(dir: string): { task_id: string; variants: TaskVariant[] }[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .flatMap((f) => {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
        const variants: TaskVariant[] = Array.isArray(raw) ? raw : raw.variants ?? [];
        if (!variants.length) return [];
        const task_id = String(variants[0].id).replace(/-v\d+$/, '');
        return [{ task_id, variants }];
      } catch {
        return [];
      }
    });
}

function readDir(dir: string, stage: string): TaskVariant[] {
  return readVariants(dir).flatMap((t) => t.variants.map((v) => ({ ...v, stage })));
}

function countDir(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_')).length;
}

function writeVariantsFile(filePath: string, variants: TaskVariant[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(variants, null, 2), 'utf-8');
}

function removeVariantFromFile(filePath: string, variantId: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const all: TaskVariant[] = Array.isArray(raw) ? raw : raw.variants ?? [];
  const remaining = all.filter((v) => v.id !== variantId);
  if (remaining.length === all.length) return false;
  if (remaining.length === 0) {
    fs.unlinkSync(filePath);
  } else {
    writeVariantsFile(filePath, remaining);
  }
  return true;
}

function appendVariantToFile(filePath: string, variant: TaskVariant) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const existing: TaskVariant[] = fs.existsSync(filePath)
    ? (() => {
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return Array.isArray(raw) ? raw : raw.variants ?? [];
      })()
    : [];
  if (!existing.find((v) => v.id === variant.id)) {
    existing.push(variant);
  }
  writeVariantsFile(filePath, existing);
}

function findVariantInStage2(taskId: string, variantId: string): TaskVariant | null {
  const filePath = path.join(DIRS.stage2, `${taskId}.json`);
  if (!fs.existsSync(filePath)) return null;
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const variants: TaskVariant[] = Array.isArray(raw) ? raw : raw.variants ?? [];
  return variants.find((v) => v.id === variantId) ?? null;
}

function updateVariantInFile(filePath: string, variantId: string, updates: Record<string, unknown>): boolean {
  if (!fs.existsSync(filePath)) return false;
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const all: TaskVariant[] = Array.isArray(raw) ? raw : raw.variants ?? [];
  const idx = all.findIndex((v) => v.id === variantId);
  if (idx === -1) return false;
  all[idx] = { ...all[idx], ...updates, id: variantId };
  writeVariantsFile(filePath, all);
  return true;
}

// ─── GET /api/admin/content/stats ────────────────────────────────────────────

content.get('/stats', (c) => {
  const reviewLog = path.join(PIPELINE, 'review-log.json');
  let llmSummary: unknown = null;
  try {
    llmSummary = JSON.parse(fs.readFileSync(reviewLog, 'utf-8'));
  } catch {}

  return ok(c, {
    pipeline: {
      stage1: countDir(DIRS.stage1),
      stage2: countDir(DIRS.stage2),
      validated: countDir(DIRS.validated),
      flagged: countDir(DIRS.flagged),
      rejected: countDir(DIRS.rejected),
    },
    llm_review: llmSummary,
  });
});

// ─── GET /api/admin/content/tasks ────────────────────────────────────────────

const listQuerySchema = z.object({
  stage: z.enum(['stage1', 'stage2', 'validated', 'flagged', 'rejected', 'needs_revision']).default('stage2'),
  grade: z.enum(['G12', 'G24']).optional(),
  type: z.string().optional(),
  skill: z.string().optional(),
});

content.get('/tasks', (c) => {
  const parsed = listQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid query', parsed.error.flatten().fieldErrors);
  }
  const { stage, grade, type, skill } = parsed.data;

  let variants = readDir(DIRS[stage], stage);

  if (grade) {
    const prefix = grade === 'G12' ? 'G12' : 'G24';
    variants = variants.filter((v) => String(v.id).startsWith(prefix));
  }
  if (type) {
    variants = variants.filter((v) => v.task_type === type);
  }
  if (skill) {
    variants = variants.filter(
      (v) => v.primary_skill === skill || v.secondary_skill === skill,
    );
  }

  return ok(c, { stage, total: variants.length, tasks: variants });
});

// ─── GET /api/admin/content/tasks/:task_id ───────────────────────────────────

content.get('/tasks/:task_id', (c) => {
  const taskId = c.req.param('task_id');
  const stage = c.req.query('stage') ?? 'stage2';
  const dir = DIRS[stage as keyof typeof DIRS];
  if (!dir) return ERRORS.VALIDATION_ERROR(c, 'Invalid stage');

  const filePath = path.join(dir, `${taskId}.json`);
  if (!fs.existsSync(filePath)) {
    return ERRORS.NOT_FOUND(c, `Task ${taskId} not found in ${stage}`);
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const variants: TaskVariant[] = Array.isArray(raw) ? raw : raw.variants ?? [];

  return ok(c, { task_id: taskId, stage, variant_count: variants.length, variants });
});

// ─── Shared action schema ─────────────────────────────────────────────────────

const actionSchema = z.object({
  task_id: z.string().min(1),
  variant_id: z.string().min(1),
  notes: z.string().optional(),
});

// ─── POST /api/admin/content/approve ─────────────────────────────────────────

content.post('/approve', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }
  const { task_id, variant_id, notes } = parsed.data;

  const variant = findVariantInStage2(task_id, variant_id);
  if (!variant) {
    return ERRORS.NOT_FOUND(c, `Variant ${variant_id} not found in stage2`);
  }

  const enriched = {
    ...variant,
    approved_at: new Date().toISOString(),
    ...(notes ? { review_notes: notes } : {}),
  };
  appendVariantToFile(path.join(DIRS.validated, `${task_id}.json`), enriched);
  removeVariantFromFile(path.join(DIRS.stage2, `${task_id}.json`), variant_id);

  return ok(c, { action: 'approved', task_id, variant_id });
});

// ─── POST /api/admin/content/reject ──────────────────────────────────────────

const rejectSchema = actionSchema.extend({ reason: z.string().min(1) });

content.post('/reject', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = rejectSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }
  const { task_id, variant_id, reason } = parsed.data;

  const variant = findVariantInStage2(task_id, variant_id);
  if (!variant) {
    return ERRORS.NOT_FOUND(c, `Variant ${variant_id} not found in stage2`);
  }

  const enriched = { ...variant, rejection_reason: reason, rejected_at: new Date().toISOString() };
  appendVariantToFile(path.join(DIRS.rejected, `${task_id}_rejected.json`), enriched);
  removeVariantFromFile(path.join(DIRS.stage2, `${task_id}.json`), variant_id);

  return ok(c, { action: 'rejected', task_id, variant_id, reason });
});

// ─── POST /api/admin/content/flag ────────────────────────────────────────────

const flagSchema = actionSchema.extend({ reason: z.string().min(1) });

content.post('/flag', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = flagSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }
  const { task_id, variant_id, reason } = parsed.data;

  const variant = findVariantInStage2(task_id, variant_id);
  if (!variant) {
    return ERRORS.NOT_FOUND(c, `Variant ${variant_id} not found in stage2`);
  }

  const enriched = { ...variant, flag_reason: reason, flagged_at: new Date().toISOString() };
  appendVariantToFile(path.join(DIRS.flagged, `${task_id}.json`), enriched);
  removeVariantFromFile(path.join(DIRS.stage2, `${task_id}.json`), variant_id);

  return ok(c, { action: 'flagged', task_id, variant_id, reason });
});

// ─── POST /api/admin/content/revise ──────────────────────────────────────────

const reviseSchema = actionSchema.extend({ reason: z.string().min(1) });

content.post('/revise', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = reviseSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }
  const { task_id, variant_id, reason } = parsed.data;

  const variant = findVariantInStage2(task_id, variant_id);
  if (!variant) {
    return ERRORS.NOT_FOUND(c, `Variant ${variant_id} not found in stage2`);
  }

  const enriched = { ...variant, revision_reason: reason, revision_requested_at: new Date().toISOString() };
  appendVariantToFile(path.join(DIRS.needs_revision, `${task_id}.json`), enriched);
  removeVariantFromFile(path.join(DIRS.stage2, `${task_id}.json`), variant_id);

  return ok(c, { action: 'needs_revision', task_id, variant_id, reason });
});

// ─── POST /api/admin/content/edit ────────────────────────────────────────────

const IMMUTABLE_FIELDS = new Set(['id', 'approved_at', 'rejected_at', 'flagged_at', 'revision_requested_at']);

const editSchema = z.object({
  task_id: z.string().min(1),
  variant_id: z.string().min(1),
  stage: z.enum(['stage1', 'stage2', 'validated', 'flagged', 'needs_revision']).default('stage2'),
  updates: z.record(z.string(), z.unknown()).refine(
    (u) => Object.keys(u).length > 0,
    'updates must not be empty',
  ),
});

content.post('/edit', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = editSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid body', parsed.error.flatten().fieldErrors);
  }
  const { task_id, variant_id, stage, updates } = parsed.data;

  const safeUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (!IMMUTABLE_FIELDS.has(key)) safeUpdates[key] = value;
  }
  if (Object.keys(safeUpdates).length === 0) {
    return ERRORS.VALIDATION_ERROR(c, 'No editable fields in updates');
  }

  const dir = DIRS[stage as keyof typeof DIRS];
  const filePath = path.join(dir, `${task_id}.json`);
  const updated = updateVariantInFile(filePath, variant_id, safeUpdates);
  if (!updated) {
    return ERRORS.NOT_FOUND(c, `Variant ${variant_id} not found in ${stage}`);
  }

  return ok(c, { action: 'edited', task_id, variant_id, stage, updated_fields: Object.keys(safeUpdates) });
});

export default content;
