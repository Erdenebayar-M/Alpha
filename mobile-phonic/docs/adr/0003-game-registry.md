# Games render through one registry keyed by Game kind

A Level is data: a list of Games, each with a `kind` and kind-specific config. One `GameRunner` reads a Game, looks its `kind` up in a registry, and mounts that renderer; an unknown kind mounts a fallback that skips the Game instead of crashing. This is the pattern of `mobile/src/features/exercise/registry.ts`.

Every renderer receives the same props — its config, the Asset lookup, and an `onFinish(result)` reporting answers per Sound — and owns nothing else. Scoring, Stars, Sound accuracy and unlocking live in pure functions outside the renderers.

v1 kinds: `hear-tap`, `trace`, `build-word`, `blend-pick`, `sort`. `harmony-sort` (back- vs front-vowel words) is planned for v1.1.

## Consequences

- Adding a Game kind is one renderer, one config schema and one registry line; no screen changes.
- Renderers can be built in parallel once the props contract exists.
