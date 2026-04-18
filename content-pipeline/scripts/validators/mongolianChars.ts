/*
 * Unicode reference — Mongolian Cyrillic characters used in this file:
 *
 * Vowels:
 *   A  = \u0430 (а)   E  = \u044D (э)   I   = \u0438 (и)   O  = \u043E (о)
 *   U  = \u0443 (у)   OE = \u04E9 (ө)   UE  = \u04AF (ү)   YE = \u0435 (е)
 *   YO = \u0451 (ё)   YA = \u044F (я)   YU  = \u044E (ю)
 *   I_SHORT = \u0439 (й)   Y = \u044B (ы)
 *
 * Consonants:
 *   B  = \u0431 (б)   V  = \u0432 (в)   G  = \u0433 (г)   D  = \u0434 (д)
 *   ZH = \u0436 (ж)   Z  = \u0437 (з)   K  = \u043A (к)   L  = \u043B (л)
 *   M  = \u043C (м)   N  = \u043D (н)   P  = \u043F (п)   R  = \u0440 (р)
 *   S  = \u0441 (с)   T  = \u0442 (т)   F  = \u0444 (ф)   KH = \u0445 (х)
 *   TS = \u0446 (ц)   CH = \u0447 (ч)   SH = \u0448 (ш)   SCH= \u0449 (щ)
 *   HARD_SIGN = \u044A (ъ)   SOFT_SIGN = \u044C (ь)
 */

// ---------------------------------------------------------------------------
// Vowels
// ---------------------------------------------------------------------------
export const A        = '\u0430'; // а
export const E        = '\u044D'; // э
export const I        = '\u0438'; // и
export const O        = '\u043E'; // о
export const U        = '\u0443'; // у
export const OE       = '\u04E9'; // ө  — U+04E9, NOT U+0151 (Hungarian ő)
export const UE       = '\u04AF'; // ү
export const YE       = '\u0435'; // е
export const YO       = '\u0451'; // ё
export const YA       = '\u044F'; // я
export const YU       = '\u044E'; // ю
export const I_SHORT  = '\u0439'; // й
export const Y        = '\u044B'; // ы

// ---------------------------------------------------------------------------
// Consonants
// ---------------------------------------------------------------------------
export const B        = '\u0431'; // б
export const V        = '\u0432'; // в
export const G        = '\u0433'; // г
export const D        = '\u0434'; // д
export const ZH       = '\u0436'; // ж
export const Z        = '\u0437'; // з
export const K        = '\u043A'; // к
export const L        = '\u043B'; // л
export const M        = '\u043C'; // м
export const N        = '\u043D'; // н
export const P        = '\u043F'; // п
export const R        = '\u0440'; // р
export const S        = '\u0441'; // с
export const T        = '\u0442'; // т
export const F        = '\u0444'; // ф
export const KH       = '\u0445'; // х
export const TS       = '\u0446'; // ц
export const CH       = '\u0447'; // ч
export const SH       = '\u0448'; // ш
export const SCH      = '\u0449'; // щ
export const HARD_SIGN  = '\u044A'; // ъ
export const SOFT_SIGN  = '\u044C'; // ь

// ---------------------------------------------------------------------------
// Character sets
// ---------------------------------------------------------------------------
export const VOWELS = new Set<string>([
  A, E, I, O, U, OE, UE, YE, YO, YA, YU, I_SHORT, Y,
]);

export const CONSONANTS = new Set<string>([
  B, V, G, D, ZH, Z, K, L, M, N, P, R, S, T, F, KH, TS, CH, SH, SCH,
  HARD_SIGN, SOFT_SIGN,
]);

export const MONGOLIAN_ALPHA = new Set<string>([...VOWELS, ...CONSONANTS]);

// ---------------------------------------------------------------------------
// Long-vowel pairs  — [first, second] of the adjacent pair
// [I, I_SHORT] represents the и+й long-vowel sequence
// ---------------------------------------------------------------------------
export const LONG_VOWEL_PAIRS: Array<[string, string]> = [
  [A,  A ],
  [E,  E ],
  [O,  O ],
  [OE, OE],
  [U,  U ],
  [UE, UE],
  [I,  I_SHORT],
];

// ---------------------------------------------------------------------------
// Vowel harmony swap map: each vowel maps to its wrong-harmony counterpart
// ---------------------------------------------------------------------------
export const HARMONY_SWAP = new Map<string, string>([
  [A,  E ], [E,  A ],
  [O,  OE], [OE, O ],
  [U,  UE], [UE, U ],
]);

// ---------------------------------------------------------------------------
// Confusable consonant pairs (bidirectional — see applyErrorRule D3)
// Also includes the о/у vowel confusion pair per error-codes.md D3.
// ---------------------------------------------------------------------------
export const CONFUSABLE_CONSONANTS: Array<[string, string]> = [
  [N, M],
  [G, K],
  [D, T],
  [B, P],
  [Z, S],
  [ZH, SH],
  [O,  U ],
];

// ---------------------------------------------------------------------------
// Known suffixes for E1 (suffix omission). Ordered longest → shortest so
// that endsWith checks never short-circuit on a sub-suffix.
// ---------------------------------------------------------------------------
export const KNOWN_SUFFIXES: string[] = [
  T + A + I_SHORT,   // тай
  T + E + I_SHORT,   // тэй
  R + U + U,         // руу
  R + UE + UE,       // рүү
  O + O + R,         // оор
  OE + OE + R,       // өөр
  I + I_SHORT + G,   // ийг
  Y + G,             // ыг
  A + A + S,         // аас
  E + E + S,         // ээс
  O + O,             // оо
  OE + OE,           // өө
  T,                 // т
  D,                 // д
];

// ---------------------------------------------------------------------------
// Suffix swap table for E2 (wrong suffix form).
// [correct_suffix, wrong_suffix] — checked in order (longest first).
// ---------------------------------------------------------------------------
export const SUFFIX_SWAPS: Array<[string, string]> = [
  [T + A + I_SHORT,  T + E + I_SHORT],  // тай → тэй
  [T + E + I_SHORT,  T + A + I_SHORT],  // тэй → тай
  [R + U + U,        R + UE + UE    ],  // руу → рүү
  [R + UE + UE,      R + U + U      ],  // рүү → руу
  [O + O + R,        OE + OE + R    ],  // оор → өөр
  [OE + OE + R,      O + O + R      ],  // өөр → оор
  [I + I_SHORT + G,  Y + G          ],  // ийг → ыг
  [Y + G,            I + I_SHORT + G],  // ыг → ийг
  [A + A + S,        E + E + S      ],  // аас → ээс
  [E + E + S,        A + A + S      ],  // ээс → аас
  [O + O,            OE + OE        ],  // оо → өө
  [OE + OE,          O + O          ],  // өө → оо
  [T,                D              ],  // т → д
  [D,                T              ],  // д → т
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function isVowel(ch: string): boolean     { return VOWELS.has(ch); }
export function isConsonant(ch: string): boolean { return CONSONANTS.has(ch); }
export function isMongolian(ch: string): boolean { return MONGOLIAN_ALPHA.has(ch); }
