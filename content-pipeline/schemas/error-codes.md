# Mongolian Spelling Error Codes — MVP (12 codes)

These are the 12 error codes classified by the engine in `src/lib/error-engine/error-classifier.ts`.
Classification runs in priority order: **C1 → C2 → C4 → D3 → E1 → E2 → E7 → B3 → B1 → G1 → G2 → H4**

Each error is assigned a severity: **1** (minor/surface), **2** (rule-based), **3** (core).

---

## B-group — Үсгийн бүтцийн алдаа (Letter structure errors)

### B1 — Үсэг орхигдол (Letter omission)
- **Severity:** 2
- **Description:** A character is missing from a word root (catch-all for unclassified deletions).
- **Example:** `нм` instead of `ном`
- **Catch-all:** Applied to any missing character not already classified as C1, C4, or E1.

### B3 — Үсгийн байрлал солигдол (Letter transposition)
- **Severity:** 1
- **Description:** Two adjacent characters are swapped.
- **Example:** `мон` instead of `омн` (characters switch positions)

---

## C-group — Эгшгийн алдаа (Vowel errors)

### C1 — Урт эгшиг орхигдол (Long vowel omission)
- **Severity:** 2
- **Description:** A doubled (long) vowel is written as a single vowel; one of the pair is missing.
- **Example:** `того` instead of `тогоо` (missing the second `о`)
- **Detection:** Position falls inside a known long-vowel pair in the expected word.

### C2 — Урт эгшиг илүүдэл (Long vowel excess)
- **Severity:** 2
- **Description:** A short vowel is incorrectly doubled.
- **Example:** `номоо` instead of `ном` (extra vowel creates a false long pair)
- **Detection:** Extra vowel character creates an adjacent same-vowel pair in the actual word.

### C4 — Балархай эгшиг орхигдол (Reduced vowel omission)
- **Severity:** 2
- **Description:** A weakly-pronounced (reduced) vowel is omitted in writing, even though it must be written.
- **Example:** `дэвтр` instead of `дэвтэр` (reduced `э` dropped)
- **Detection:** Missing character occupies a known reduced-vowel position in the expected word.

---

## D-group — Авианы андуурал (Phonemic confusion)

### D3 — Гийгүүлэгч андуурал (Consonant / near-vowel confusion)
- **Severity:** 2
- **Description:** A character is substituted with a phonetically similar (confusable) character. Includes consonant pairs and the `о/у` vowel pair.
- **Example:** `нум` instead of `ном` (`о` → `у`); `нар` instead of `нор` (consonant pair)
- **Detection:** Substitution pair is in the confusable-pairs list (`CONFUSABLE_CONSONANT_PAIRS` + `[о, у]`). Only applies to root characters, not suffix positions.

---

## E-group — Залгаврын алдаа (Suffix errors)
*E-family errors are mutually exclusive per suffix. Requires a known root (`knownRoot`) to be provided in task metadata.*

### E1 — Залгавар орхигдол (Suffix omission)
- **Severity:** 2
- **Description:** The required suffix is entirely or partially absent.
- **Example:** `гэр` instead of `гэрт` (locative suffix `-т` missing)

### E2 — Буруу залгавар (Wrong suffix selection)
- **Severity:** 2
- **Description:** A suffix is present but the wrong form is chosen (e.g. wrong case, wrong harmony form).
- **Example:** `гэрд` instead of `гэрт` (dative `-д` used instead of `-т`)

### E7 — Залгавар бичлэгийн алдаа (Spelling error within suffix)
- **Severity:** 2
- **Description:** The suffix tail is present and recognizable but spelled incorrectly in a way that doesn't match E1 or E2.
- **Example:** Suffix vowel harmony violation that isn't a recognized different suffix.

---

## G-group — Өгүүлбэрийн тэмдэглэгээний алдаа (Sentence punctuation & capitalization)

### G1 — Том үсгийн алдаа (Capitalization error)
- **Severity:** 1
- **Description:** A word that should start with a capital letter is written in lowercase, or vice versa.
- **Example:** `би явна.` instead of `Би явна.` (sentence-initial lowercase)
- **Detection:** Sentence-level case-error list from answer-checker.

### G2 — Цэг орхигдол (Missing end punctuation)
- **Severity:** 1
- **Description:** A required sentence-ending punctuation mark (period, question mark, etc.) is absent.
- **Example:** `Би явна` instead of `Би явна.`
- **Detection:** Sentence-level missing-punctuation list from answer-checker.

---

## H-group — Өөрийгөө шалгах алдаа (Self-check failure)

### H4 — Өөрийгөө шалгаагүй (Failed self-correction)
- **Severity:** 1
- **Description:** In a TT6 (Self-Check) task, the learner either submitted no revision or resubmitted the same incorrect answer without attempting to correct it.
- **Trigger conditions:**
  1. `revision` is `null` or `undefined` — no revision submitted.
  2. `revision === originalAttempt` and `originalAttempt ≠ correctAnswer` — revision matches wrong original.

---

## Score mapping

| Errors present | Score |
|---|---|
| None | `1.0` |
| Only severity-1 errors | `0.75` |
| 1–2 severity-2+ errors | `0.50` |
| 3+ severity-2+ errors | `0.25` |

---

## Error codes in Prisma schema but NOT in MVP classifier

The following codes are defined in the `ErrorCode` enum in `prisma/schema.prisma` but are **not yet implemented** in the classifier engine (reserved for future phases):

`A1`, `A2`, `A3`, `B2`, `B4`, `C3`, `C5`, `C6`, `D5`, `E7` *(present in classifier)*, `G1` *(present)*, `G2` *(present)*, `H1`

> **Note:** `H1` (dictation-specific error) and `D5` (word-final consonant errors) appear in task `error_targets` arrays but are not yet classified programmatically — they are logged manually or via answer-checker heuristics.
