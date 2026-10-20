import type { Sound } from './schema';

/**
 * Splits a word into Sound ids, longest Grapheme first (so "аа" is one Sound,
 * not two "а"). Returns null if any part is not a known Sound.
 */
export function segment(text: string, sounds: readonly Sound[]): string[] | null {
  const byLength = [...sounds].sort((a, b) => b.grapheme.length - a.grapheme.length);
  const word = text.toLowerCase();
  const out: string[] = [];
  let i = 0;
  while (i < word.length) {
    const match = byLength.find((s) => word.startsWith(s.grapheme.toLowerCase(), i));
    if (!match) return null;
    out.push(match.id);
    i += match.grapheme.length;
  }
  return out;
}
