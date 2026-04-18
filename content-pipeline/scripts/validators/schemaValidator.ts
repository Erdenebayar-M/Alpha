/*
 * Task schema validator using AJV + ajv-formats against task.schema.json.
 * No Mongolian character literals are used in this file.
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import schema from '../../schemas/task.schema.json';

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

const validateFn = ajv.compile(schema);

export function validateTask(task: unknown): { ok: boolean; errors: string[] } {
  const valid = validateFn(task);
  if (valid) return { ok: true, errors: [] };
  const errors = (validateFn.errors ?? []).map(
    (err) => `${err.instancePath || '(root)'} ${err.message ?? 'unknown error'}`,
  );
  return { ok: false, errors };
}
