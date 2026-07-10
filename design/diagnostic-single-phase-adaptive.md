# Single-Phase Adaptive Diagnostic — Spec (v0, for sign-off)

Status: **draft, awaiting review.** This replaces the 3-phase (A/B/C) diagnostic
with one seamless adaptive sequence. Nothing here is built yet — react to the
**tunables** (marked ⚙) before implementation.

---

## 1. Goal

Given a learner whose **grade (1–4) is fixed**, find their **exact level M0–M5
within that grade** using as few tasks as the kid's patience allows, while
producing — as a byproduct — the skills they're strong/weak at and the errors
they make. The kid experiences **one continuous quiz**; there are no visible
phases.

Priority order (from your answers): **exact level first**, skill/error map
best-effort, length flexes to fatigue.

---

## 2. The level model

- Each grade has 6 rungs: `M0 M1 M2 M3 M4 M5` → index `0..5`.
- An item's rung for this learner = its `grade_levels` cell `G{grade}:M{k}`.
- Within a rung, items are ordered by `spelling_complexity` (Зөв бичих
  төвөгшил, 1–4) so the climb is smooth, not jumpy. ⚙ *(secondary sort:
  `meaning_complexity`.)*
- "Find the level" = **find the highest rung the learner reliably passes.**

---

## 3. Scoring one item

Reuse the existing attempt score `0 / 0.25 / 0.5 / 0.75 / 1.0`. Collapse to a
staircase verdict:

| score        | verdict   | staircase effect |
|--------------|-----------|------------------|
| ≥ 0.75       | **PASS**  | step up          |
| ≤ 0.25       | **FAIL**  | step down        |
| 0.5          | **HOLD**  | stay on rung; re-probe once |

⚙ *thresholds tunable.*

---

## 4. The staircase (item-to-item rule)

1. **Start rung** = middle of the ladder, **grade-independent** (every grade
   spans its own full M0–M5). ⚙ proposal: start at **M2** for all grades —
   the middle minimises expected steps to reach either end. One easy warm-up
   item at **M1** is served first to avoid early frustration, then the climb
   begins at M2.
2. **PASS → +1 rung. FAIL → −1 rung. HOLD → same rung** (one re-probe, then
   treat a second HOLD as FAIL).
3. A **reversal** = a direction change (was going up, now down, or vice-versa).
   The learner's level lives where reversals cluster.
4. Never request a rung outside `M0..M5`, and never outside what the bank has
   (§7).

---

## 5. Stop rule (variable length — "until bored")

Stop at the **first** of these, but never before `MIN_ITEMS`:

- ⚙ `MIN_ITEMS = 6`, `MAX_ITEMS = 12`.
- **Bracketed & confirmed** — learner has ≥1 PASS at rung `r` and ≥1 FAIL at
  rung `r+1`, *and* `r` was confirmed by a second PASS (or `r+1` by a second
  FAIL). → level = `r`.
- **Floor** — 3 consecutive FAILs from the start / at M0. → level = M0.
- **Ceiling** — passes the top available rung. → level = that rung, flagged
  `capped_by_bank` if the true ceiling is unknown (§7).
- **Fatigue** — after `MIN_ITEMS`, either 3 consecutive FAILs, or
  `time_seconds > FATIGUE_FACTOR × estimated_time_seconds` on 2 consecutive
  items (⚙ `FATIGUE_FACTOR = 3`). → stop, estimate from what we have.
- **Cap** — `MAX_ITEMS` reached. → stop, estimate from what we have.

---

## 6. Item selection at each step

From the pool = active tasks where `grade_levels ∋ G{grade}:M{targetRung}`,
not already served this session:

1. Prefer **rich items** (`TT_7_*` dictation, `TT_8_*` correction) — one item
   credits many skills via `skillsFromErrors`. ⚙ *(soft preference, not hard —
   fall back to any type.)*
2. Among those, **coverage tiebreak**: pick the `primary_skill` least tested so
   far, so the climb doubles as a skill sweep.
3. Among those, lowest `spelling_complexity` not yet used on this rung.
4. **Dedup** against `recent_task_ids` and this session's served IDs.

If the target rung is empty → widen: nearest populated rung, **up first then
down**; mark the estimate coarser (§7).

---

## 7. Graceful degradation (thin bank — TODAY'S reality)

The bank is currently ~empty; this must never crash or mis-rank.

- **Track `bank_coverage`** = count of distinct rungs actually available for the
  grade. Reported in the result.
- **Ceiling honesty** — if the learner passes the top *populated* rung but
  higher rungs simply don't exist, level = top populated rung + flag
  `capped_by_bank: true`. Not the same as "mastered M5".
- **Confidence is bank-aware** — a level bracketed across real adjacent rungs =
  `HIGH`; a level where the bank only *had* 1–2 rungs = `LOW`, regardless of how
  clean the answers were. Truthful, not optimistic.
- **Empty grade** — no items at all → return a `NEEDS_CONTENT` result instead of
  a fake level. Route surfaces it; no plan is generated from a fake M.

---

## 8. Final level + byproducts

- **`general_level`** = the bracketed rung (§5). This is the headline output and
  now comes from the *climb ceiling*, not today's core-skill-capped average.
- **`skill_scores` / `skill_levels`** = per-skill averages over served items
  (task `primary_skill`) **plus** error-implied skills via existing
  `skillsFromErrors`. Best-effort; confidence per skill from item count (existing
  `itemCountToConfidence`).
- **`top_error_codes`** = 3 most frequent error codes across attempts.
- **`priority_skills`** = 2 weakest (existing logic, reused).
- **`confidence`** + new **`bank_coverage`** as in §7.

Output shape stays compatible with what `LearnerSkillState` and `Plan`
generation already consume — same fields, `general_level` sourced differently.

---

## 9. Endpoints (one item at a time)

- `POST /diagnostic/start` → creates session, returns the **first single task**
  + `session_id`. (No `total_phases`.)
- `POST /diagnostic/submit` → scores the item, then returns **either**
  `{ score, next_task }` **or** `{ completed: true, result, plan_id }`.
  Selection + stop logic lives server-side; `/next-phase` is **removed**.
- Climb state (current rung, served IDs, reversal history) persists in the
  existing `DiagnosticSession.result` JSON scratchpad — **no migration needed**.
  `DiagnosticPhase` / `phase_*` columns simply go unused (dropped later).

---

## 10. Testability (no real content required)

Pure functions `selectNextItem`, `shouldStop`, `estimateLevel` take
history + candidate pool, no DB inside. Unit-tested against synthetic banks:
full bank, one-rung bank, empty bank, all-pass kid, all-fail kid, boundary kid,
fatigue kid.

---

## ⚙ Tunables to confirm before I code

1. Start rung: M2 for all grades (grade-independent), with an M1 warm-up first?
2. `MIN_ITEMS = 6`, `MAX_ITEMS = 12`?
3. PASS ≥ 0.75 / FAIL ≤ 0.25 / HOLD = 0.5?
4. `FATIGUE_FACTOR = 3×` estimated time, and 3-consecutive-fail early exit?
5. Rich-item (`TT_7_*`/`TT_8_*`) preference — soft (recommended) or off?
