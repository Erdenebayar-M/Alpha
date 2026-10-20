# Orto phonics game — agent guide

Read `CONTEXT.md` (vocabulary, scope) and every ADR in `docs/adr/` before writing
code. Use the glossary's words: Sound, World, Level, Game, Game kind, Star,
Sticker, Profile — never Exercise or Task (those belong to `mobile/`).

## Stack (don't swap without asking)

Expo 57 / RN 0.86, Expo Router, Reanimated 4 + gesture-handler for every drag,
expo-audio, expo-image, zustand persisted to MMKV, Zod for content validation.
Native modules (MMKV) need a dev client: `npx expo run:ios`, not Expo Go.
Install with `--legacy-peer-deps`.

## Rules

- Standalone app: never import from `mobile/`, `web/`, `backend/` or `shared/`.
- Every image/audio goes through `src/assets/manifest.ts` by Asset ID (ADR 0005).
  Never `require` an asset anywhere else.
- No raw colours, sizes or font names in components — `src/theme/tokens.ts`.
- Children can't read: no instructional text on child screens; speak it with
  `playAudio(id)`. Text is fine behind the Parental gate.
- Touch targets ≥ `touchMin`. Gentle failure: never a harsh "wrong".
- Game logic (Stars, unlocking, Sound accuracy, remix) is pure functions in
  `src/engine/`, written test-first. Renderers only render and report.
- Games go through the registry (ADR 0003); never a `switch` on Game kind in a screen.
- Don't hand-write the same structure twice (root CLAUDE.md): two siblings
  differing only in values → one component or one `.map()` over data.
- No analytics/ads/tracking SDKs; no child data leaves the device.
- Every word must be Decodable at its Level and Approved before release (ADR 0002).

## Before you say "done"

`npm test`, `npm run typecheck` and `npm run lint` clean, then the milestone
review (ADR 0006). Agents never merge their own PRs; PRs target `dev`.
