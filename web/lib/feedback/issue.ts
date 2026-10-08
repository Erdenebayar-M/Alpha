import type { FeedbackInput } from "@/lib/feedback/input";

const TITLE_PREFIX = "Feedback: ";
const TITLE_MAX = 80;
const LABEL = "needs-triage";

export type FeedbackIssue = { title: string; body: string; labels: string[] };

/**
 * The GitHub issue a piece of feedback becomes: titled from the text's first
 * line, then the text as written, the Figma link and the captured context.
 * The text is fenced so GitHub shows it verbatim: an @mention or #ref in it
 * would otherwise ping someone or cross-link an issue as the token's owner.
 * `commitSha` is the deploy's (VERCEL_GIT_COMMIT_SHA), never the browser's say.
 */
export function feedbackIssue(input: FeedbackInput, commitSha: string | null): FeedbackIssue {
  const fence = "`".repeat(Math.max(3, ...Array.from(input.text.matchAll(/`+/g), ([run]) => run.length + 1)));
  const body = [
    `${fence}text`,
    input.text,
    fence,
    "",
    "### Context",
    `- Figma: ${input.figmaUrl ?? "none"}`,
    `- Page: ${input.pageUrl}`,
    `- Viewport: ${input.viewport.width} × ${input.viewport.height}`,
    `- Commit: ${commitSha ?? "not deployed"}`,
    "",
    "_Sent from the dev site's feedback widget._",
  ].join("\n");
  return { title: issueTitle(input.text), body, labels: [LABEL] };
}

function issueTitle(text: string): string {
  // By code point, so the cut can't split an emoji's surrogate pair.
  const firstLine = Array.from(text.split("\n", 1)[0].trim());
  const room = TITLE_MAX - TITLE_PREFIX.length;
  return TITLE_PREFIX + (firstLine.length > room ? `${firstLine.slice(0, room - 1).join("").trimEnd()}…` : firstLine.join(""));
}
