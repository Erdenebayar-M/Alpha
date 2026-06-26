'use server';

import { revalidatePath } from 'next/cache';
import { adminFetch } from '@/lib/api/adminFetch';

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface EditWordResult {
  action: string;
  id: string;
  updated_fields: string[];
  rederived: boolean;
}

export interface DeactivateResult {
  action: string;
  id: string;
}

export async function editWord(
  id: string,
  updates: Record<string, unknown>,
): Promise<ActionResult<EditWordResult>> {
  try {
    const data = await adminFetch<EditWordResult>(`/api/admin/content/words/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    revalidatePath('/admin/words');
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deactivateWord(id: string): Promise<ActionResult<DeactivateResult>> {
  try {
    const data = await adminFetch<DeactivateResult>(`/api/admin/content/words/${id}`, {
      method: 'DELETE',
    });
    revalidatePath('/admin/words');
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function reactivateWord(id: string): Promise<ActionResult<EditWordResult>> {
  try {
    const data = await adminFetch<EditWordResult>(`/api/admin/content/words/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: true }),
    });
    revalidatePath('/admin/words');
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
