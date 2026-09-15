# Article Body is typed block JSON, not HTML or Markdown

An Article's Body is stored as an ordered JSON array of Blocks drawn from a closed set of kinds (paragraph, heading, list, quote, image, video, link card, callout, divider), validated by a Zod schema in `@app/shared` on every write. We chose this over editor HTML, which would need server-side sanitising, can't be validated structurally, and locks the site into the editor's markup, and over Markdown/MDX, which handles media awkwardly and would mean executing stored content. With blocks, the site renders each kind with its own component, and the admin editor is free to change as long as it produces the same JSON.

## Consequences

- Adding a Block kind is backward-compatible: one schema entry plus one renderer. Removing or reshaping a kind requires migrating every stored Body that uses it.
- Videos are embeds (`provider` + `video_id` from an allowlist), not uploaded files. Images are R2 URLs that pass `assetUrlSchema`. Link cards are typed in by hand, and the server never fetches a URL.
