import type { Curriculum } from '../src/content/schema';

/** A tiny two-level curriculum: а, then м — "ам" becomes decodable at level 2. */
export const tiny = (): Curriculum => ({
  sounds: [
    { id: 'a', grapheme: 'а', audio: 'ph_a', vowel: true },
    { id: 'm', grapheme: 'м', audio: 'ph_m', vowel: false },
    { id: 'aa', grapheme: 'аа', audio: 'ph_aa', vowel: true },
  ],
  words: [
    { id: 'am', text: 'ам', audio: 'w_am', image: 'img_am', approved: true },
    { id: 'maa', text: 'маа', audio: 'w_maa', approved: false },
  ],
  worlds: [
    {
      id: 'w1',
      host: 'orto',
      levels: [
        {
          id: 'l1',
          newSound: 'a',
          sticker: 'st_1',
          games: [
            { kind: 'hear-tap', id: 'g1', focus: 'a' },
            { kind: 'trace', id: 'g2', sound: 'a' },
            { kind: 'hear-tap', id: 'g3', focus: 'a' },
          ],
        },
        {
          id: 'l2',
          newSound: 'm',
          sticker: 'st_2',
          games: [
            { kind: 'hear-tap', id: 'g1', focus: 'm' },
            { kind: 'trace', id: 'g2', sound: 'm' },
            { kind: 'build-word', id: 'g3', words: ['am'] },
          ],
        },
      ],
    },
  ],
});

export const knownAssets = {
  audio: new Set(['ph_a', 'ph_m', 'ph_aa', 'w_am', 'w_maa']),
  images: new Set(['img_am', 'st_1', 'st_2']),
};
