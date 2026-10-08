import { clientIpFrom } from "@/lib/auth/clientIp";
import { feedbackToken } from "@/lib/feedback/config";
import { createGitHubIssue } from "@/lib/feedback/github";
import { FEEDBACK_BODY_MAX_BYTES, parseFeedback } from "@/lib/feedback/input";
import { feedbackIssue } from "@/lib/feedback/issue";
import { createRateLimiter } from "@/lib/feedback/rateLimit";

const allow = createRateLimiter({ limit: 10, windowMs: 10 * 60 * 1000 });

/**
 * The dev site's feedback widget: turns a submission into a GitHub issue on
 * this repo, labelled needs-triage. The token stays here; the page gets back
 * only the issue's number and link. A 404 wherever the widget is off
 * (lib/feedback/config.ts), Production included.
 * Responds 201 `{ issueNumber, issueUrl }` or `{ error: <code> }`.
 */
export async function POST(request: Request) {
  const token = feedbackToken();
  if (!token) return new Response(null, { status: 404 });

  const raw = await readCapped(request, FEEDBACK_BODY_MAX_BYTES);
  if (raw === "too-large") return Response.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  const parsed = parseFeedback(parseJson(raw));
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  // Only submissions that would file an issue count, so fixing a rejected
  // Figma link doesn't use up the allowance.
  if (!allow(clientIpFrom(request) ?? "unknown")) return Response.json({ error: "RATE_LIMITED" }, { status: 429 });

  const created = await createGitHubIssue(feedbackIssue(parsed.input, process.env.VERCEL_GIT_COMMIT_SHA || null), token);
  if (!created) return Response.json({ error: "UPSTREAM_ERROR" }, { status: 502 });
  return Response.json(created, { status: 201 });
}

/**
 * The body as text, read no further than `maxBytes`: a declared length over it
 * is refused unread, and a body sent without one (chunked) is cut off as soon
 * as it passes. `null` when it can't be read.
 */
async function readCapped(request: Request, maxBytes: number): Promise<string | null | "too-large"> {
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) return "too-large";
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return "too-large";
      }
      chunks.push(value);
    }
    return await new Blob(chunks as BlobPart[]).text();
  } catch {
    return null;
  }
}

function parseJson(raw: string | null): unknown {
  try {
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}
