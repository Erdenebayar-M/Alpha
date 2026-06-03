# Mongolian Spelling Error Codes — Full v3 Taxonomy (38 codes)

Sources: `docs/Оношилгооны_матриц_v3.xlsx` and `docs/Дасгалын_төрлүүд_каталог_v3.xlsx`

## Auto-classified codes (classifier engine)

File: `src/lib/error-engine/error-classifier.ts`

Priority order:
- **Word-level:** C1 → C2 → C4 → C5 → D3 → C3 → E1 → E2 → E3 → E7 → B3 → B1 → B2
- **Sentence-level adds:** G1 → G2 → G3 → G4 → G5
- **Self-check adds:** H4
- **Metric-only:** H2, H3 via `detectMetricErrors()` in `error-skill-map.ts`

## Codes assigned via task.error_targets (not auto-classified)

`A1`, `A2`, `A3`, `D1`, `D2`, `D4`, `D5`, `F1`, `F2`, `F3`, `F4`, `H1`

---

## A — Үсэг-авиа зөрөөтэй алдаа · Skill 1

| Code | Name | Auto |
|------|------|------|
| A1 | Авиа андуурах | No |
| A2 | Үсэг солих | No |
| A3 | Үеийн бүтэц алдах | No |

## B — Үсгийн бүтцийн алдаа · Skill 2

| Code | Name | Sev | Auto |
|------|------|-----|------|
| B1 | Үсэг орхих | 2 | Yes — catch-all unclassified deletion |
| B2 | Үсэг илүү бичих | 2 | Yes — catch-all unclassified insertion |
| B3 | Үсгийн байрлал солих | 1 | Yes — adjacent transposition |
| B4 | Үгийн хэсэг орхих | 2 | No |

## C — Эгшгийн алдаа · Skill 3

| Code | Name | Sev | Auto | Detection |
|------|------|-----|------|-----------|
| C1 | Урт эгшиг орхих | 2 | Yes | Missing char in long-vowel pair |
| C2 | Урт эгшиг илүүдэх | 2 | Yes | Extra char creating adjacent same-vowel pair |
| C3 | Эгшиг андуурах | 2 | Yes | Vowel-for-vowel substitution (not confusable pair) |
| C4 | Балархай эгшиг орхих | 2 | Yes | Missing at known reduced-vowel position |
| C5 | Балархай эгшиг илүүдэх | 2 | Yes | Extra vowel not forming long-vowel pair |
| C6 | Эгшгийн зохицлын алдаа | 2 | No | Vowel harmony — context-assigned |

## D — Гийгүүлэгчийн алдаа · Skill 4

| Code | Name | Sev | Auto | Detection |
|------|------|-----|------|-----------|
| D1 | Гийгүүлэгч орхих | 2 | No | Context-assigned |
| D2 | Гийгүүлэгч илүүдэх | 2 | No | Context-assigned |
| D3 | Гийгүүлэгч андуурах | 2 | Yes | Confusable pairs incl. о↔у |
| D4 | Давхар гийгүүлэгчийн алдаа | 2 | No | Context-assigned |
| D5 | Үгийн төгсгөлийн гийгүүлэгч | 2 | No | Context-assigned |

Confusable pairs (D3): н↔м, г↔к, д↔т, б↔п, з↔с, ж↔ш, о↔у

## E — Залгавар/нөхцөлийн алдаа · Skill 5

| Code | Name | Sev | Auto | Notes |
|------|------|-----|------|-------|
| E1 | Залгавар орхигдол | 2 | Yes | Requires `knownRoot` in TaskMeta |
| E2 | Буруу залгавар сонголт | 2 | Yes | Requires `knownRoot` |
| E3 | Эр/эм залгаврын алдаа | 2 | Yes | Harmony-based E2 variant; secondary Skill 3 |
| E4 | Тийн ялгалын алдаа | 2 | No | Context-assigned |
| E5 | Олон тоо/харьяаллын алдаа | 2 | No | Context-assigned |
| E6 | Үйл үгийн хувиллын алдаа | 2 | No | Context-assigned |
| E7 | Залгаврын бичлэгийн алдаа | 2 | Yes | Fallback suffix spelling error |

## F — Үгийн хэлбэр/бүтцийн алдаа · Skill 2

All F codes are **context-assigned**:

| Code | Name |
|------|------|
| F1 | Язгуур үгийн хэлбэрийн алдаа |
| F2 | Нийлмэл үгийн алдаа |
| F3 | Үгийн аймгийн хэлбэрийн алдаа |
| F4 | Давталттай буруу хэвшил |

## G — Өгүүлбэрийн тэмдэглэгээний алдаа · Skill 6

| Code | Name | Sev | Auto | Detection |
|------|------|-----|------|-----------|
| G1 | Том үсгийн алдаа | 1 | Yes | First-char capitalisation |
| G2 | Цэг орхигдол | 1 | Yes | Missing full stop |
| G3 | Асуулт/анхааруулах тэмдгийн алдаа | 1 | Yes | Missing ? or ! |
| G4 | Таслалын алдаа | 1 | Yes | Missing comma |
| G5 | Өгүүлбэрийн хил заагийн алдаа | 2 | Yes | Extra/missing words |

## H — Сонсгол/анхаарал · Skill 7/8

| Code | Name | Sev | Auto | Notes |
|------|------|-----|------|-------|
| H1 | Сонсгол тасарсан алдаа | 2 | No | Context-assigned; Skill 7 |
| H2 | Хурдны алдаа | 1 | Metric | time > 2.5× expected; Skill 8 |
| H3 | Анхаарлын хэлбэлзлийн алдаа | 1 | Metric | error-position variance > 0.6; Skill 8 |
| H4 | Өөрийгөө шалгаагүй алдаа | 1 | Yes | Self-check tasks only; Skill 8 |

---

## Score mapping

| Errors | Score |
|--------|-------|
| None | `1.0` |
| Severity-1 only | `0.75` |
| 1–2 severity-2+ | `0.50` |
| 3+ severity-2+ | `0.25` |

## Error→skill map

`src/lib/error-engine/error-skill-map.ts` — `ERROR_SKILL_MAP`, `skillsForError(code)`, `skillsFromErrors(codes)`
