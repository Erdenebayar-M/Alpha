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

export const images = {
  chr_orto: { kind: 'file', source: require('../../assets/characters/orto.png') },
  chr_narhan: { kind: 'file', source: require('../../assets/characters/narhan.png') },
  chr_sprout: { kind: 'file', source: require('../../assets/characters/sprout.png') },
  chr_buddy: { kind: 'file', source: require('../../assets/characters/buddy.png') },
  chr_orto_cheer: {
    kind: 'todo-art',
    note: 'Orto cheering, arms up — check Figma ahVCzzSLccRd0vOVLFiEKg',
    fallback: require('../../assets/characters/orto.png'),
  },
  chr_orto_point: {
    kind: 'todo-art',
    note: 'Orto pointing at the play area',
    fallback: require('../../assets/characters/orto.png'),
  },
} satisfies Record<string, ImageAsset>;

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
} satisfies Record<string, AudioAsset>;

export type ImageId = keyof typeof images;
export type AudioId = keyof typeof audio;

export const imageSource = (id: ImageId): ImageSourcePropType => {
  const a: ImageAsset = images[id];
  return a.kind === 'file' ? a.source : a.fallback;
};

/** Everything still standing in for real assets; the release build must see this empty. */
export const listPlaceholders = (): string[] => [
  ...Object.entries(audio as Record<string, AudioAsset>)
    .filter(([, a]) => a.kind === 'speech')
    .map(([id]) => `audio:${id}`),
  ...Object.entries(images as Record<string, ImageAsset>)
    .filter(([, a]) => a.kind === 'todo-art')
    .map(([id]) => `image:${id}`),
];
