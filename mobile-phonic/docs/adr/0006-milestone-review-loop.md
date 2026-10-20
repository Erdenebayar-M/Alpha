# Every milestone passes an independent review before the next starts

Work is split into milestones (M0 scaffold, M1 core engine, M2 Games, M3 map/rewards/parent area, M4 World 1 content and polish), each on its own branch and PR into `dev`. After a builder finishes, a separate reviewer (Opus) checks the result against this CONTEXT.md and these ADRs, runs `npm test` and `tsc --noEmit`, and checks the screens on the iOS Simulator. Any mismatch goes back to the builder with a concrete list and is reviewed again; only a clean review lets the next milestone begin.

The owner asked for this explicitly: the goal is that what ships is what was agreed, not what drifted in.

## Consequences

- Workers run in cmux panes: Sonnet for Games, screens and scaffold; Opus for the core engine and every review; Haiku for test runs and asset checks. At most 5 panes at once.
- Agents never merge their own PRs (root branch flow).
