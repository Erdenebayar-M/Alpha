import { z } from 'zod';

// Curriculum data shapes (ADR 0002, 0003). Content is versioned data in the app,
// validated at load; see validate.ts for the rules Zod alone can't express.

const id = z.string().min(1);

export const soundSchema = z.object({
  id,
  /** How the Sound is written: one letter, or a fixed pair for long vowels/diphthongs. */
  grapheme: z.string().min(1),
  /** Asset ID of the spoken Sound (content/RECORDING.md). */
  audio: id,
  vowel: z.boolean(),
});

export const wordSchema = z.object({
  id,
  text: z.string().min(1),
  audio: id,
  image: id.optional(),
  /** From the master content bank or approved by the owner; release refuses false. */
  approved: z.boolean(),
});

export const gameSchema = z.discriminatedUnion('kind', [
  /** Hear a Sound, tap its Grapheme. Distractors are picked at runtime (remix). */
  z.object({ kind: z.literal('hear-tap'), id, focus: id }),
  z.object({ kind: z.literal('trace'), id, sound: id }),
  z.object({ kind: z.literal('build-word'), id, words: z.array(id).min(1) }),
  /** Picture distractors come from other Decodable words at runtime. */
  z.object({ kind: z.literal('blend-pick'), id, words: z.array(id).min(1) }),
  z.object({
    kind: z.literal('sort'),
    id,
    sounds: z.tuple([id, id]).refine(([a, b]) => a !== b, 'sort needs two different sounds'),
    words: z.array(id).min(2),
  }),
]);

export const levelSchema = z.object({
  id,
  newSound: id,
  sticker: id,
  games: z.array(gameSchema).min(3).max(5),
});

export const worldSchema = z.object({
  id,
  host: z.enum(['orto', 'narhan', 'sprout', 'buddy']),
  levels: z.array(levelSchema).min(1),
});

export const curriculumSchema = z.object({
  sounds: z.array(soundSchema).min(1),
  words: z.array(wordSchema),
  worlds: z.array(worldSchema).min(1),
});

export type Sound = z.infer<typeof soundSchema>;
export type Word = z.infer<typeof wordSchema>;
export type Game = z.infer<typeof gameSchema>;
export type GameKind = Game['kind'];
export type Level = z.infer<typeof levelSchema>;
export type World = z.infer<typeof worldSchema>;
export type Curriculum = z.infer<typeof curriculumSchema>;
