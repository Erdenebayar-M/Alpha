/**
 * Shared multipart file-upload parsing for the admin upload routes
 * (`/api/admin/content/upload-audio`, `/api/admin/articles/images`): parse the
 * body, pull out the `file` field, enforce a byte-size ceiling, and sniff its
 * real container type. Callers layer their own type allowlist and any other
 * form fields on top of the returned `form`.
 */
import type { Context } from 'hono';
import { sniffContentType, type SniffedType } from './media-type';

export type ParsedUpload =
  | { ok: true; form: Record<string, string | File>; buf: Buffer; sniffed: SniffedType | null }
  | { ok: false; message: string };

export async function parseUploadedFile(c: Context, maxBytes: number): Promise<ParsedUpload> {
  const form = await c.req.parseBody().catch(() => null);
  if (!form) {
    return { ok: false, message: 'Expected multipart/form-data body' };
  }

  const file = form['file'];
  if (!(file instanceof File)) {
    return { ok: false, message: 'Missing "file" upload field' };
  }
  if (file.size === 0) {
    return { ok: false, message: 'Uploaded file is empty' };
  }
  if (file.size > maxBytes) {
    return { ok: false, message: `File exceeds ${maxBytes} byte limit` };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  return { ok: true, form, buf, sniffed: sniffContentType(buf) };
}
