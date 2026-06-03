import { validateTaskContent } from '@app/shared';

/**
 * Validates a task object against the canonical shared task schema.
 * The signature is intentionally identical to the previous AJV-based version
 * so assemble.ts and validators.test.ts need no changes.
 */
export function validateTask(task: unknown): { ok: boolean; errors: string[] } {
  return validateTaskContent(task);
}
