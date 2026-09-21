# Authors may colour the Article Body

ADR 0001 established that every Block kind's look is a site decision, not an author one. This reverses that for one narrow slice: an author may now give a text colour or highlight to some words, a text colour to a whole subheading, or a background to a whole text Block (paragraph, heading, list, quote, callout). Everything else about a Block's look — its kind, its structure, media Blocks entirely — stays the site's call.

A colour value is either a Palette name or a custom hex string, and each is stored differently on purpose:

- **Palette colours are stored by name** (`brand-blue`, `gray`, `red`, …), not by value. The site owns the actual shade behind each name and can retune it later — a global palette refresh doesn't require touching a single stored Article.
- **Custom colours are stored as the exact hex the author picked.** There is no name to retune later, so the site renders it as given. Readability (a chosen colour against the site's backgrounds) becomes the author's responsibility, not the site's — the schema validates the hex is well-formed, not that it's legible.

## Consequences

- A span carries at most one of `color`/`highlight`, never both, and neither alongside `href` — a link's colour is always the site's link colour, so a Colour can't be used to disguise or hide a link.
- `background` is only ever validated on the five text Block kinds; image, video, link card and divider Blocks reject it outright rather than silently ignoring it.
- All new fields are optional, so every Body stored before this change keeps validating unchanged.
