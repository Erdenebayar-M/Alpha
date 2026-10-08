# The dev site's feedback widget files GitHub issues through a server route

On the dev deploy the product owner, who has no GitHub account, needs to send change requests that land where the developer works: GitHub Issues on this repo (issue #156, stage 1).

**A floating button on every page opens a form** (`components/feedback/`): the text (required), an optional Figma link, and the page address and viewport, captured by the browser. The address keeps only origin and path: a query or hash can carry a live token (`/reset-password?token=…`), and issues on this repo are public. It posts to `app/api/feedback`, which adds the deploy's commit (`VERCEL_GIT_COMMIT_SHA`, never taken from the browser) and creates an issue titled from the text's first line, labelled `needs-triage`. The text goes in a code fence, so an `@mention` or `#123` in it doesn't ping anyone or cross-link as the token's owner. The page gets back only the issue's number.

**The widget is off unless `FEEDBACK_ENABLED=1` and `FEEDBACK_GITHUB_TOKEN` are both set, and always off when `VERCEL_ENV=production`** (`lib/feedback/config.ts`). Off, the layout renders nothing for it and the route is a 404. The Production check is a backstop in case the vars are ever copied to the wrong environment.

**The token is a fine-grained PAT that can only read and write issues on this repo**, held as a server env var. Issues are filed as the token's owner; the issue body says they came from the widget.

**The rate limit is in memory, per server instance**: 10 submissions per address per 10 minutes, counting only those that pass validation, so retrying a rejected Figma link costs nothing. On Vercel each instance counts separately, so the real ceiling is higher. That is enough here: the route is also behind the dev site's password gate (ADR 0008), which answers an API call without the cookie with a 401, so only someone holding the password reaches it. Submissions are also refused when the text is empty or over 5,000 characters, the body is over 32 KB (read with a cap, so a body with no `Content-Length` is cut off rather than buffered), or the Figma link isn't an `https` figma.com URL.

## Considered options

- **A shared store for the rate limit (Vercel KV, Upstash).** Rejected: a new service and secret for a page only the password holders can reach.
- **A GitHub App instead of a PAT.** It would file issues as a bot and not expire with a person's token. Rejected for now as more setup than one route needs; revisit if the token's expiry becomes a chore.
- **Linking to GitHub's own "new issue" form.** Rejected: it needs a GitHub account, which is the whole problem.
