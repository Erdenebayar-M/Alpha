import { taughtByLevel } from '../engine/order';
import { curriculumSchema, type Curriculum, type Game, type Word } from './schema';
import { segment } from './segment';

export interface ValidateOptions {
  /** Release builds also require approved words and pictures for picture Games. */
  release: boolean;
  /** Asset IDs that exist in the manifest. */
  audio: ReadonlySet<string>;
  images: ReadonlySet<string>;
}

export type ValidateResult = { ok: true; curriculum: Curriculum } | { ok: false; errors: string[] };

const PICTURE_GAMES: Game['kind'][] = ['blend-pick', 'sort'];

const duplicates = (ids: string[]) => ids.filter((x, i) => ids.indexOf(x) !== i);

/** Words a Game uses, and Sounds it is about. */
const wordsOf = (g: Game): string[] => ('words' in g ? g.words : []);
const soundsOf = (g: Game): string[] =>
  g.kind === 'hear-tap' ? [g.focus] : g.kind === 'trace' ? [g.sound] : g.kind === 'sort' ? [...g.sounds] : [];

export function validateCurriculum(input: unknown, opts: ValidateOptions): ValidateResult {
  const parsed = curriculumSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
  }
  const c = parsed.data;
  const errors: string[] = [];
  const levels = c.worlds.flatMap((w) => w.levels);

  const dupe = (what: string, ids: string[]) =>
    duplicates(ids).forEach((d) => errors.push(`duplicate ${what} id "${d}"`));
  dupe('sound', c.sounds.map((s) => s.id));
  dupe('word', c.words.map((w) => w.id));
  dupe('world', c.worlds.map((w) => w.id));
  dupe('level', levels.map((l) => l.id));
  dupe('sticker', levels.map((l) => l.sticker));
  levels.forEach((l) => dupe(`game (in ${l.id})`, l.games.map((g) => g.id)));

  const soundIds = new Set(c.sounds.map((s) => s.id));
  duplicates(levels.map((l) => l.newSound)).forEach((s) => errors.push(`sound "${s}" introduced twice`));
  levels.forEach((l) => {
    if (!soundIds.has(l.newSound)) errors.push(`${l.id}: unknown sound "${l.newSound}"`);
    if (!opts.images.has(l.sticker)) errors.push(`${l.id}: missing sticker image "${l.sticker}"`);
  });

  c.sounds.forEach((s) => {
    if (!opts.audio.has(s.audio)) errors.push(`sound "${s.id}": missing audio "${s.audio}"`);
  });

  const segments = new Map<string, string[]>();
  c.words.forEach((w) => {
    const seg = segment(w.text, c.sounds);
    if (seg) segments.set(w.id, seg);
    else errors.push(`word "${w.id}" (${w.text}) has letters that are no Sound`);
    if (!opts.audio.has(w.audio)) errors.push(`word "${w.id}": missing audio "${w.audio}"`);
    if (w.image && !opts.images.has(w.image)) errors.push(`word "${w.id}": missing image "${w.image}"`);
    if (opts.release && !w.approved) errors.push(`word "${w.id}" is not approved`);
  });

  const wordById = new Map<string, Word>(c.words.map((w) => [w.id, w]));
  const taught = taughtByLevel(c);

  for (const level of levels) {
    const known = taught.get(level.id) ?? new Set<string>();
    for (const game of level.games) {
      const where = `${level.id}/${game.id}`;
      soundsOf(game).forEach((s) => {
        if (!known.has(s)) errors.push(`${where}: sound "${s}" not taught by ${level.id}`);
      });
      for (const wid of wordsOf(game)) {
        const word = wordById.get(wid);
        if (!word) {
          errors.push(`${where}: unknown word "${wid}"`);
          continue;
        }
        const seg = segments.get(wid);
        if (seg && !seg.every((s) => known.has(s))) errors.push(`${where}: word "${wid}" not decodable at ${level.id}`);
        if (game.kind === 'sort' && seg && !game.sounds.includes(seg[0])) {
          errors.push(`${where}: word "${wid}" starts with neither sorted sound`);
        }
        if (opts.release && PICTURE_GAMES.includes(game.kind) && !word.image) {
          errors.push(`${where}: word "${wid}" needs a picture`);
        }
      }
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true, curriculum: c };
}
