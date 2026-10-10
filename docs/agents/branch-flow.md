# Branch flow: `dev` → `master`

Two long-lived branches: `dev` is the integration branch, `master` is what ships.

## Feature work

- Branch off `dev`; open the PR **against `dev`**, not `master`.
- Promotion is a **manual PR from `dev` to `master`**, opened and merged by the developer.

## Hotfixes

A fix merged directly into `master` must be **merged back into `dev` straight away**, so the branches don't drift and the next promotion doesn't conflict.

## Rolling back

A bad change on `dev` is undone with `git revert` (a new commit on `dev`). Don't reset or force-push `dev`.

## Agents

**Agents never merge their own PRs.** Open the PR, report the link, and leave the merge to the developer. This applies to feature PRs, hotfixes and the `dev` → `master` promotion alike.
