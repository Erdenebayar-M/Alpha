import type { Game, Level, Sound, Word, World } from './schema';

// World 1 (ADR 0002): а о у э ө ү и + м н л с, ordered so a child can blend
// a real word ("ам") by Level 2. Order: а м о н у л э с и ө ү.

export const world1Sounds: Sound[] = [
  { id: 'a', grapheme: 'а', audio: 'ph_a', vowel: true },
  { id: 'm', grapheme: 'м', audio: 'ph_m', vowel: false },
  { id: 'o', grapheme: 'о', audio: 'ph_o', vowel: true },
  { id: 'n', grapheme: 'н', audio: 'ph_n', vowel: false },
  { id: 'u', grapheme: 'у', audio: 'ph_u', vowel: true },
  { id: 'l', grapheme: 'л', audio: 'ph_l', vowel: false },
  { id: 'e', grapheme: 'э', audio: 'ph_e', vowel: true },
  { id: 's', grapheme: 'с', audio: 'ph_s', vowel: false },
  { id: 'i', grapheme: 'и', audio: 'ph_i', vowel: true },
  { id: 'oe', grapheme: 'ө', audio: 'ph_oe', vowel: true },
  { id: 'ue', grapheme: 'ү', audio: 'ph_ue', vowel: true },
];

// Sounds taught in World 3 (ADR 0002), listed now so segmentation reads "аа" or
// "ай" as one Sound: a World 1 word containing them is then correctly not Decodable.
// No World 1 Level introduces them.
export const world3Sounds: Sound[] = [
  ['aa', 'аа'], ['oo', 'оо'], ['uu', 'уу'], ['ee', 'ээ'], ['oeoe', 'өө'], ['ueue', 'үү'], ['ii', 'ий'],
  ['ai', 'ай'], ['oi', 'ой'], ['ui', 'уй'], ['uei', 'үй'], ['ei', 'эй'],
].map(([id, grapheme]) => ({ id, grapheme, audio: `ph_${id}`, vowel: true }));

// DRAFT words — not from the master content bank. Every one is approved: false
// until the owner approves it (or it is matched in the backend Word table).
// Picture Games (blend-pick, sort) use only words that can be drawn; abstract
// ones (ил "open", нас "age") appear in build-word only.
const draft = (id: string, text: string): Word => ({ id, text, audio: `w_${id}`, approved: false });

export const world1Words: Word[] = [
  draft('am', 'ам'),
  draft('an', 'ан'),
  draft('nom', 'ном'),
  draft('num', 'нум'),
  draft('mal', 'мал'),
  draft('lam', 'лам'),
  draft('selem', 'сэлэм'), // sword; replaces эм, which sounds like the letter name of м
  draft('us', 'ус'),
  draft('sam', 'сам'),
  draft('nas', 'нас'),
  draft('sum', 'сум'),
  draft('il', 'ил'),
  draft('mos', 'мөс'),
  draft('suem', 'сүм'),
  draft('ues', 'үс'),
];

// Game builders: every Level opens with hear-tap + trace on its new Sound.
const hearTap = (focus: string, id = 'hear'): Game => ({ kind: 'hear-tap', id, focus });
const trace = (sound: string): Game => ({ kind: 'trace', id: 'trace', sound });
const build = (words: string[]): Game => ({ kind: 'build-word', id: 'build', words });
const blend = (words: string[]): Game => ({ kind: 'blend-pick', id: 'blend', words });
const sort = (a: string, b: string, words: string[]): Game => ({ kind: 'sort', id: 'sort', sounds: [a, b], words });

const level = (n: number, sound: string, extra: Game[]): Level => {
  const games = [hearTap(sound), trace(sound), ...extra];
  // Levels with no new words yet get a review round so every Level has 3+ Games.
  if (games.length < 3) games.push(hearTap(sound, 'review'));
  return { id: `w1-l${String(n).padStart(2, '0')}`, newSound: sound, sticker: `st_w1_${n}`, games };
};

export const world1: World = {
  id: 'w1',
  host: 'orto',
  levels: [
    level(1, 'a', []),
    level(2, 'm', [build(['am'])]),
    level(3, 'o', []),
    level(4, 'n', [build(['nom', 'an']), blend(['nom', 'an'])]),
    level(5, 'u', [build(['num']), blend(['num'])]),
    level(6, 'l', [build(['mal', 'lam']), blend(['mal', 'lam']), sort('a', 'n', ['am', 'an', 'nom', 'num'])]),
    level(7, 'e', []),
    level(8, 's', [build(['us', 'sam', 'nas', 'sum', 'selem']), blend(['us', 'sam', 'selem']), sort('s', 'n', ['sam', 'sum', 'nom', 'num'])]),
    level(9, 'i', [build(['il'])]),
    level(10, 'oe', [build(['mos']), blend(['mos']), sort('m', 's', ['mal', 'mos', 'sam', 'sum'])]),
    level(11, 'ue', [build(['suem', 'ues']), blend(['suem', 'ues']), sort('ue', 'u', ['ues', 'us'])]),
  ],
};
