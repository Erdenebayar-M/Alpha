# Authors may set Text alignment on the Article Body

ADR 0003 carved out Colour as the one exception to ADR 0001's rule that a Block's look is the site's decision, not the author's. Text alignment is a second, narrower exception: an author may set a whole text Block (paragraph, heading, list, quote, callout) to center or right alignment. Left is the default and is never stored — only `center`/`right` are recorded, matching how Colour's optional fields keep every pre-existing Body valid.

Text alignment is scoped identically to `background`: the same five text Block kinds may carry it, and image, video, link card and divider Blocks reject it outright rather than silently ignoring it. It is unrelated to the Content column, which governs how content rows line up on the page and is never author-editable.

## Consequences

- `alignment` is optional on the five text Block kinds and `z.never().optional()` on the four that can't carry it, so every Body stored before this change keeps validating unchanged.
- Admin-Alpha's authoring UI for Colour was never built (issue #108 shipped the schema and site renderer only); Text alignment ships its own authoring UI without an existing admin pattern to mirror, and does not attempt to backfill Colour's missing UI.
