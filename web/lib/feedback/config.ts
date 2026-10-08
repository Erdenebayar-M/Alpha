/**
 * The feedback widget runs only on a dev deploy: FEEDBACK_ENABLED=1 and a
 * GitHub token set (Vercel Preview env, or .env.local), and never when Vercel
 * says this is Production, even if the vars leak there. Off, the widget isn't
 * rendered and its route is a 404. See docs/adr/0009-dev-feedback-widget.md.
 */
export function feedbackEnabled(): boolean {
  return feedbackToken() !== null;
}

/** The fine-grained token that may only create issues on this repo, or `null` when the widget is off. Server-side only. */
export function feedbackToken(): string | null {
  const token = process.env.FEEDBACK_GITHUB_TOKEN;
  if (process.env.FEEDBACK_ENABLED !== "1" || !token || process.env.VERCEL_ENV === "production") return null;
  return token;
}
