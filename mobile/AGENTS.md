# CLAUDE.md — Mongolian Orthography App (Mobile Client)

> This file is the persistent project context for Claude Code. Read it fully before
> generating code. When a rule here conflicts with a request, follow this file and flag
> the conflict.

---

## 1. What we are building

A **mobile app** (iOS + Android) that teaches **Mongolian Cyrillic orthography**
(зөв бичих дүрэм) to children in **grades 1–4**.

This is a **thin, well-structured client on top of an existing backend**. The backend
already owns all content, the adaptive logic, diagnostics, and scoring. **We do not
reimplement any of that.** The app's job is: authenticate, fetch what the server tells us
to show, render tasks beautifully for small children, capture answers, and submit them.

**Audience reminder:** the players are 6–9 year olds. Everything must be large,
forgiving, colorful, audio-supported, and rewarding. The *parents* are the account
holders and the ones who read dashboards.

---

## 2. Tech stack (do not swap without asking)

- **Expo (managed workflow)** + **React Native** + **TypeScript (strict)**
- **Expo Router** — file-based routing (same mental model as Next.js app router)
- **TanStack Query (React Query)** — all server state (fetching, caching, retries, loading/error)
- **expo-secure-store** — store the JWT securely (NOT AsyncStorage for the token)
- **expo-audio** (or expo-av) — task audio + prompt audio playback
- **expo-image** — task images
- **zustand** (or React Context) — small client state: which learner is "active"
- **expo-sqlite** — OPTIONAL offline *cache* of the last lesson only. Not the source of truth. Skip in v1 if it adds friction.
- Builds/release via **EAS Build** + **EAS Submit**. No Mac required.

Dev loop: run on a real phone with **Expo Go** from day one. Test on **both** a real iOS and a real Android device — simulators lie about touch, audio, and feel.

---

## 3. Architecture principles (the important part)

### 3.1 The renderer registry — THE core pattern
The backend has **~43 `task_type` codes** (e.g. `TT_1_5`). **DO NOT build 43 screens or 43
components.** Every task shares one shape (see §5). The 43 types map onto a **small set of
interaction forms** (multiple-choice, fill-in-the-blank, audio-choice, image-match, …).

Build it like this:

1. One `<ExerciseEngine task={task} onResult={...} />` component. It reads the task,
   decides the interaction form, and dispatches to a renderer. It is the ONLY thing lesson
   and diagnostic screens use.
2. A **registry**: `interactionForm -> Renderer component`.
3. A **map**: `task_type -> interactionForm`, used as a fallback. Prefer the task's own
   `interaction_form` field when the backend populates it; fall back to the map when it's `null`.
4. A **`<FallbackRenderer />`** for any unmapped type so the app never crashes on task #44.

Adding a new task type = one line in the map (and maybe one new renderer). That is the
whole point. If you ever find yourself writing a `switch (task_type)` with dozens of cases
in a screen, STOP — that logic belongs in the registry.

### 3.2 API-driven, server-authoritative
The server decides everything: the diagnostic sequence, today's lesson, whether an answer
is correct, and progress. The client never computes lesson plans or "next task" logic.
Scoring: show instant local feedback from the task's `is_correct`/`correct_answer`, but the
**submitted attempt to the backend is the source of truth** for progress.

### 3.3 Feature-based structure, no god-files
Group by feature, keep files small, colocate types with the feature that owns them.

---

## 4. Folder structure

```
app/                              # Expo Router routes ONLY (thin screens)
  _layout.tsx                     # root: providers (QueryClient, auth, theme)
  (auth)/
    login.tsx
    register.tsx
  (app)/
    _layout.tsx                   # requires auth; redirects to login if no token
    index.tsx                     # learner picker + "add child" (home)
    learner/[id]/
      index.tsx                   # learner home / start today's lesson
      diagnostic.tsx              # 3-phase diagnostic flow
      lesson.tsx                  # daily lesson runner
      checkpoint.tsx
      dashboard.tsx               # progress + skills (parent-facing)
src/
  api/
    client.ts                     # fetch wrapper: base URL + JWT header + error normalizing
    auth.ts  learner.ts  diagnostic.ts  lesson.ts  plan.ts  checkpoint.ts  dashboard.ts
  features/
    exercise/
      ExerciseEngine.tsx          # the dispatcher (§3.1)
      registry.ts                 # interactionForm -> Renderer
      taskTypeMap.ts              # task_type -> interactionForm (fallback map)
      types.ts                    # Task, TaskChoice, etc. (§5)
      renderers/
        MultipleChoice.tsx
        FillBlank.tsx
        AudioChoice.tsx
        ImageMatch.tsx
        Fallback.tsx
      components/                 # ChoiceButton, AudioButton, FeedbackBanner, ...
    auth/  learner/  diagnostic/  lesson/  dashboard/   # hooks + screens' logic per feature
  components/                     # shared kid-friendly UI (BigButton, Card, RewardStars, ...)
  hooks/                          # useActiveLearner, etc.
  lib/
    queryClient.ts
    secureStore.ts                # JWT get/set/clear via expo-secure-store
  store/
    activeLearner.ts              # zustand: which child is currently playing
  theme/                          # colors, spacing, typography, radii
```

Screens under `app/` should be thin: fetch with a hook, render a feature component. No
business logic in route files.

---

## 5. The Task model (built from the real payload)

```ts
export interface TaskChoice {
  text: string;
  is_correct: boolean;
}

export interface TaskOptions {
  choices?: TaskChoice[];
  audio_trigger?: boolean;
  distractors?: string[];
  // interaction-form-specific extras may appear here; keep this open/optional
}

export interface Task {
  id: string;
  task_id: string;
  stage: string;                 // e.g. "STAGE2"
  task_type: string;             // e.g. "TT_1_5" (one of ~43 codes)
  interaction_form: string | null; // preferred renderer key; may be null -> use taskTypeMap
  prompt_text: string;           // "_" marks the blank in fill-in tasks
  correct_answer: string;
  options: TaskOptions;

  audio_url: string | null;
  prompt_audio_url: string | null;
  image_url: string | null;

  // skill / targeting metadata (display + analytics; app rarely branches on these)
  primary_skill: string | null;
  secondary_skill: string | null;
  level_target: string | null;
  error_targets: string[];
  grade_band: string[];          // ["G1"]
  grade_levels: string[];        // ["G1:M3"]
  difficulty: number;
  estimated_time_seconds: number;
  lesson_slot_fit: string;       // e.g. "WARM_UP"

  // feedback shown to the child
  feedback_text: string | null;
  feedback_correct: string | null;
  feedback_wrong: string | null;

  is_diagnostic: boolean;
}
```

**Ignore all admin/review fields** the API may include (`source`, `ai_review_*`,
`reviewer_notes`, `flag_reason`, `created_at`, etc.). Do not model them in the client.

Rendering notes:
- `prompt_text` uses `_` as the blank placeholder — render it as a visible gap/slot.
- `options.audio_trigger === true` → surface a tap-to-hear button; auto-play the prompt audio if `prompt_audio_url` is present.
- Choices come pre-shuffled or not — shuffle client-side to be safe, but keep `is_correct` intact for local feedback.

---

## 6. API integration

- Base URL comes from an **env var** (`EXPO_PUBLIC_API_URL`). Never hardcode.
- **Auth:** parent `register`/`login` returns a JWT. Store it in `expo-secure-store`.
  `client.ts` injects `Authorization: Bearer <token>` on every request. On 401, clear the
  token and route to login.
- All responses use the `{ success, data: {...} }` envelope — unwrap in `client.ts` so
  feature code sees clean data.
- Every server call goes through a **TanStack Query** hook with proper `isLoading` /
  `isError` handling. No raw `fetch` in components. No unhandled promise in a screen.

### Endpoints the mobile app uses
- **Auth:** `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- **Learners:** `POST /learner`, `GET /learner`, `GET /learner/:id`
- **Diagnostic:** `POST /diagnostic/start`, `POST /diagnostic/submit`, `POST /diagnostic/next-phase`, `GET /diagnostic/result/:sessionId`
- **Lesson:** `GET /lesson/today`, `POST /lesson/attempt`, `POST /lesson/:id/complete`
- **Plan:** `GET /plan/current`
- **Checkpoint:** `GET /checkpoint`, `POST /checkpoint/submit`
- **Dashboard:** `GET /dashboard/skills`, `GET /dashboard/progress`

**Do NOT** call any `/api/admin/*` route — that's a separate web admin surface.

---

## 7. Core user flows

1. **Parent onboarding:** register → login → land on learner picker.
2. **Add child:** `POST /learner`; a parent may have several. Selecting one sets the *active learner* (zustand).
3. **Diagnostic (first time per learner):** `start` → render returned tasks through the
   ExerciseEngine → `submit` each attempt → `next-phase` between A/B/C → show `result`.
   Phases: A baseline (8) → B adaptive drill (8) → C boundary+template (4).
4. **Daily lesson:** `GET /lesson/today` → run its tasks through the same ExerciseEngine →
   `POST /lesson/attempt` per task → `POST /lesson/:id/complete` at the end → reward screen.
5. **Checkpoint:** same pattern, its own endpoints.
6. **Dashboard:** parent views `/dashboard/skills` + `/dashboard/progress` for the active learner.

The ExerciseEngine is reused identically across diagnostic, lesson, and checkpoint — only
the submit endpoint differs. Pass the submit handler in as a prop.

---

## 8. Kids-UX and compliance constraints (non-negotiable)

- **Font must include Өө and Үү.** Verify the chosen display font renders the full Mongolian
  Cyrillic alphabet before committing — many rounded "kid" fonts drop these and show boxes.
- **Big touch targets** (min ~64px), large text, high contrast, generous spacing. Assume small fingers.
- **Audio-first:** young kids may not read fluently. Prefer audio prompts; make the hear-button obvious.
- **Rewards:** stars / celebratory animation on success (use `lottie-react-native`). Kids need this to return.
- **Gentle failure:** never harsh "WRONG." Show `feedback_wrong`/`feedback_text` supportively, allow retry.
- **Privacy:** this is a children's app. Collect **no** data beyond what the parent enters and
  what the backend needs. **No third-party analytics/ad/tracking SDKs.** A privacy policy URL
  is required for both stores. Build privacy-clean from day one.

---

## 9. Offline & errors

- **Online-first (v1).** The server drives adaptive planning, so the app assumes a connection.
- Handle "no connection" with a friendly, kid-appropriate retry screen — never a raw error or crash.
- Optionally cache only the *current* fetched lesson in `expo-sqlite` so a dropped connection
  mid-lesson doesn't lose progress. Do not attempt full offline mode.

---

## 10. Conventions

- TypeScript **strict**; no `any` (use `unknown` + narrowing).
- Functional components + hooks only. Small, single-responsibility files.
- All server data through TanStack Query hooks named `useXxx`.
- Theme tokens for color/spacing/typography — no magic numbers or inline hex in components.
- Every async UI has explicit loading and error states.
- Keep route files thin; logic lives in `src/features/*`.

---

## 11. Build plan (do it in this order, verify each before moving on)

1. **Scaffold + run on device.** `create-expo-app` (TS), Expo Router, providers wired
   (QueryClient, theme, secure-store), a "hello" screen visible in Expo Go on a real phone.
2. **Auth.** register/login/logout, JWT in secure-store, protected `(app)` group, 401 handling.
3. **Learners.** list + add-child + active-learner store + learner picker home.
4. **ExerciseEngine skeleton.** Task types (§5), registry, taskTypeMap, `MultipleChoice`
   renderer + `Fallback`. Drive it with one real lesson from `/lesson/today`.
5. **Full lesson loop.** attempt submission, instant feedback, complete + reward screen.
6. **Remaining renderers.** FillBlank, AudioChoice, ImageMatch — one at a time, each added
   to the registry, no new screens.
7. **Diagnostic flow.** 3 phases (A/B/C) reusing the ExerciseEngine.
8. **Checkpoint.**
9. **Dashboard** (parent-facing progress/skills).
10. **Polish:** animations, audio, fonts, empty/error states, store assets.

---

## 12. Do NOT (guardrails)

- ❌ Do NOT create one screen/component per `task_type`. Use the registry (§3.1).
- ❌ Do NOT put a big `switch(task_type)` inside a screen.
- ❌ Do NOT reimplement scoring, adaptivity, or lesson selection — the backend owns it.
- ❌ Do NOT call `/api/admin/*` from the app.
- ❌ Do NOT store the JWT in AsyncStorage — use expo-secure-store.
- ❌ Do NOT add analytics/ad/tracking SDKs or collect child PII.
- ❌ Do NOT use raw `fetch` in components — go through `client.ts` + a Query hook.
- ❌ Do NOT hardcode the API URL, colors, or spacing.
- ❌ Do NOT model or depend on admin/review fields in the task payload.
- ❌ Do NOT pick a font without verifying Өө / Үү render.

---

## 13. Open questions to confirm with the human

- Exact `task_type → interaction_form` mapping for all ~43 types (start with `TT_1_5` = multiple-choice fill-in; ask for the rest or infer from `interaction_form` once populated).
- Does `/lesson/attempt` return per-attempt feedback, or does the app rely on the task's own feedback fields?
- App display name, icon, and brand colors.
