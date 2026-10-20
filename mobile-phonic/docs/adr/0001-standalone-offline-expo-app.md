# Standalone, offline-first Expo app with on-device progress

The phonics game is its own Expo app in `mobile-phonic/`, not a screen inside `mobile/` and not an npm workspace. It uses the same SDK line as `mobile/` (Expo 57, RN 0.86, Reanimated 4, gesture-handler, expo-audio) so the team works in one stack, but shares no code with it: `mobile/` is a thin client of the orthography backend, while this app owns its own curriculum and scoring.

v1 talks to no server. Curriculum is versioned data inside the app (`src/content/`, validated with Zod at load), and progress lives on the device in a zustand store persisted to MMKV. We rejected reusing the backend's auth and learner model: it would need new routes and schema changes for a product whose first goal is testing World 1 with real children, and the App Store Kids category is simpler with no accounts.

## Consequences

- The persisted store carries a `schemaVersion` so a later sync or migration can read it.
- Nothing here triggers the backend/shared "complex change" workflow in the root CLAUDE.md.
- No third-party analytics, ads or tracking SDKs; no child data leaves the device.
