import type { ImageSourcePropType } from 'react-native';
import { fonts } from '../theme/tokens';

// Every image and audio clip is looked up by Asset ID (ADR 0005).
// Replacing a placeholder = change its entry here; no code changes elsewhere.

export type AudioAsset =
  | { kind: 'file'; source: number }
  /** Placeholder until the owner's recording arrives (content/RECORDING.md). */
  | { kind: 'speech'; text: string };

export type ImageAsset =
  | { kind: 'file'; source: ImageSourcePropType }
  /** Art that does not exist yet; `fallback` is shown meanwhile. */
  | { kind: 'todo-art'; note: string; fallback: ImageSourcePropType };

const say = (text: string): AudioAsset => ({ kind: 'speech', text });

export const fontFiles = {
  [fonts.bold]: require('../../assets/fonts/Nunito_700Bold.ttf'),
  [fonts.extraBold]: require('../../assets/fonts/Nunito_800ExtraBold.ttf'),
  [fonts.black]: require('../../assets/fonts/Nunito_900Black.ttf'),
};

const ORTO = require('../../assets/characters/orto.png');
const todoArt = (note: string): ImageAsset => ({ kind: 'todo-art', note, fallback: ORTO });

const characterImages = {
  chr_orto: { kind: 'file', source: ORTO },
  chr_narhan: { kind: 'file', source: require('../../assets/characters/narhan.png') },
  chr_sprout: { kind: 'file', source: require('../../assets/characters/sprout.png') },
  chr_buddy: { kind: 'file', source: require('../../assets/characters/buddy.png') },
  chr_orto_cheer: todoArt('Orto cheering, arms up — check Figma ahVCzzSLccRd0vOVLFiEKg'),
  chr_orto_point: todoArt('Orto pointing at the play area'),
} satisfies Record<string, ImageAsset>;

// One Sticker per World 1 Level (st_w1_1 … st_w1_11): Mongolian animals/objects, art TODO.
const stickerImages: Record<string, ImageAsset> = Object.fromEntries(
  Array.from({ length: 11 }, (_, i) => [`st_w1_${i + 1}`, todoArt(`World 1 Level ${i + 1} sticker`)]),
);

/** Every image by Asset ID. Content (Stickers, word pictures) refers to these by string id. */
export const images: Record<string, ImageAsset> = { ...characterImages, ...stickerImages };

// IDs match content/RECORDING.md exactly. Sounds are spoken as sounds, not letter names.
export const audio = {
  ph_a: say('а'),
  ph_o: say('о'),
  ph_u: say('у'),
  ph_e: say('э'),
  ph_oe: say('ө'),
  ph_ue: say('ү'),
  ph_i: say('и'),
  ph_m: say('ммм'),
  ph_n: say('ннн'),
  ph_l: say('ллл'),
  ph_s: say('ссс'),
  // World 3 long vowels and diphthongs: defined now so "маа" is never read as м-а-а.
  ph_aa: say('аа'),
  ph_oo: say('оо'),
  ph_uu: say('уу'),
  ph_ee: say('ээ'),
  ph_oeoe: say('өө'),
  ph_ueue: say('үү'),
  ph_ii: say('ий'),
  ph_ai: say('ай'),
  ph_oi: say('ой'),
  ph_ui: say('уй'),
  ph_uei: say('үй'),
  ph_ei: say('эй'),

  ins_hear_tap: say('Сонсоод, зөв үсгийг нь дараарай.'),
  ins_trace: say('Хуруугаараа үсгээ зураарай.'),
  ins_build: say('Үсгүүдийг чирээд, үгээ бүтээгээрэй.'),
  ins_blend: say('Хуруугаа гулсуулж уншаад, зөв зургийг сонгоорой.'),
  ins_sort: say('Зургуудыг эхний авиагаар нь сагсанд хийгээрэй.'),

  fb_good_1: say('Сайн байна!'),
  fb_good_2: say('Гайхалтай!'),
  fb_good_3: say('Яг зөв!'),
  fb_good_4: say('Чи чадлаа!'),
  fb_good_5: say('Маш сайн!'),
  fb_retry_1: say('Дахиад оролдоод үзье.'),
  fb_retry_2: say('Бараг л болчихлоо!'),

  fl_welcome: say('Сайн уу! Би Орто. Хамт тоглоё!'),
  fl_new_sound: say('Шинэ авиа сурцгаая!'),
  fl_level_done: say('Түвшин дууслаа!'),
  fl_sticker: say('Шинэ наалт авлаа!'),
  fl_world_done: say('Энэ ертөнцийг бүтэн дуусгалаа!'),

  // World 1 draft words (content/RECORDING.md section F once approved).
  w_am: say('ам'),
  w_an: say('ан'),
  w_nom: say('ном'),
  w_num: say('нум'),
  w_mal: say('мал'),
  w_lam: say('лам'),
  w_selem: say('сэлэм'),
  w_us: say('ус'),
  w_sam: say('сам'),
  w_nas: say('нас'),
  w_sum: say('сум'),
  w_il: say('ил'),
  w_mos: say('мөс'),
  w_suem: say('сүм'),
  w_ues: say('үс'),
} satisfies Record<string, AudioAsset>;

/** Images code refers to directly (characters); content ids are validated strings. */
export type ImageId = keyof typeof characterImages;
export type AudioId = keyof typeof audio;

const sourceOf = (a: ImageAsset): ImageSourcePropType => (a.kind === 'file' ? a.source : a.fallback);

/** Images code names directly — a typo is a type error. */
export const imageSource = (id: ImageId): ImageSourcePropType => sourceOf(characterImages[id]);

/** Images named by content (Stickers, word pictures); validation guarantees the id exists. */
export const contentImageSource = (id: string): ImageSourcePropType => sourceOf(images[id] ?? todoArt(`missing ${id}`));

/** Everything still standing in for real assets; the release build must see this empty. */
export const listPlaceholders = (): string[] => [
  ...Object.entries(audio as Record<string, AudioAsset>)
    .filter(([, a]) => a.kind === 'speech')
    .map(([id]) => `audio:${id}`),
  ...Object.entries(images as Record<string, ImageAsset>)
    .filter(([, a]) => a.kind === 'todo-art')
    .map(([id]) => `image:${id}`),
];
