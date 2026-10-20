# Recording list — World 1

Recorded by the owner. Each file is named by its Asset ID (ADR 0005).
Until a clip exists, the app plays a TTS placeholder under the same ID.

**Format:** WAV or M4A, mono, 44.1 kHz, quiet room, phone ~20 cm away,
~0.5 s silence before and after (trimmed later).

## A. Sounds (11)

Say the **sound**, not the letter name. Vowels short and clear; hold
continuous consonants ~1 s.

| ID | Sound | ID | Sound |
|---|---|---|---|
| `ph_a` | а | `ph_i` | и |
| `ph_o` | о | `ph_m` | м (ммм) |
| `ph_u` | у | `ph_n` | н (ннн) |
| `ph_e` | э | `ph_l` | л (ллл) |
| `ph_oe` | ө | `ph_s` | с (ссс) |
| `ph_ue` | ү | | |

## A2. Long vowels & diphthongs — World 3 (later, not needed for v1)

Defined now so the app reads "аа" as one sound. Record when World 3 starts.

`ph_aa` аа · `ph_oo` оо · `ph_uu` уу · `ph_ee` ээ · `ph_oeoe` өө · `ph_ueue` үү ·
`ph_ii` ий · `ph_ai` ай · `ph_oi` ой · `ph_ui` уй · `ph_uei` үй · `ph_ei` эй

## B. Game instructions (5)

| ID | Line |
|---|---|
| `ins_hear_tap` | Сонсоод, зөв үсгийг нь дараарай. |
| `ins_trace` | Хуруугаараа үсгээ зураарай. |
| `ins_build` | Үсгүүдийг чирээд, үгээ бүтээгээрэй. |
| `ins_blend` | Хуруугаа гулсуулж уншаад, зөв зургийг сонгоорой. |
| `ins_sort` | Зургуудыг эхний авиагаар нь сагсанд хийгээрэй. |

## C. Praise (5)

`fb_good_1` Сайн байна! · `fb_good_2` Гайхалтай! · `fb_good_3` Яг зөв! ·
`fb_good_4` Чи чадлаа! · `fb_good_5` Маш сайн!

## D. Gentle retry (2)

`fb_retry_1` Дахиад оролдоод үзье. · `fb_retry_2` Бараг л болчихлоо!

## E. Story & flow (5)

| ID | Line |
|---|---|
| `fl_welcome` | Сайн уу! Би Орто. Хамт тоглоё! |
| `fl_new_sound` | Шинэ авиа сурцгаая! |
| `fl_level_done` | Түвшин дууслаа! |
| `fl_sticker` | Шинэ наалт авлаа! |
| `fl_world_done` | Энэ ертөнцийг бүтэн дуусгалаа! |

## F. Words (pending)

Filled in once the World 1 word list is approved (ADR 0002). One clip per word
at normal speed, ID `w_<word>`. Blending plays the Sound clips, then the word.
