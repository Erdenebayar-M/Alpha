import { audio, images } from '../assets/manifest';
import type { Curriculum, Level } from './schema';
import { validateCurriculum } from './validate';
import { world1, world1Sounds, world1Words, world3Sounds } from './world1';

export const rawCurriculum: Curriculum = { sounds: [...world1Sounds, ...world3Sounds], words: world1Words, worlds: [world1] };

export const assetIds = { audio: new Set(Object.keys(audio)), images: new Set(Object.keys(images)) };

// Validated once at load. A broken curriculum must never reach a child, so this throws;
// release builds additionally refuse unapproved words (ADR 0002).
const result = validateCurriculum(rawCurriculum, { release: !__DEV__, ...assetIds });
if (!result.ok) throw new Error(`Invalid curriculum:\n${result.errors.join('\n')}`);

export const curriculum: Curriculum = result.curriculum;

const levels = new Map<string, Level>(curriculum.worlds.flatMap((w) => w.levels.map((l) => [l.id, l])));
export const levelById = (id: string): Level | undefined => levels.get(id);
