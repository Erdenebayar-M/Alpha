import { clientIpFrom } from "@/lib/auth/clientIp";
import { feedbackToken } from "@/lib/feedback/config";
import { createGitHubIssue } from "@/lib/feedback/github";
import { FEEDBACK_IMAGE_MAX_BYTES, FEEDBACK_MULTIPART_MAX_BYTES, sniffImage, type FeedbackImage } from "@/lib/feedback/image";
import { FEEDBACK_BODY_MAX_BYTES, parseFeedback } from "@/lib/feedback/input";
import { feedbackIssue } from "@/lib/feedback/issue";
import { r2Config, uploadFeedbackImage } from "@/lib/feedback/r2";
import { createRateLimiter } from "@/lib/feedback/rateLimit";

const allow = createRateLimiter({ limit: 10, windowMs: 10 * 60 * 1000 });

/**
 * The dev site's feedback widget: turns a submission into a GitHub issue on
 * this repo, labelled needs-triage. The token stays here; the page gets back
 * only the issue's number and link. A 404 wherever the widget is off
 * (lib/feedback/config.ts), Production included.
 * Takes JSON (text-only) or multipart/form-data with the same JSON as a
 * `payload` field plus an optional `image` file, which is stored in R2 and
 * embedded in the issue.
 * Responds 201 `{ issueNumber, issueUrl }` or `{ error: <code> }`.
 */
export async function POST(request: Request) {
  const token = feedbackToken();
  if (!token) return new Response(null, { status: 404 });

  const multipart = (request.headers.get("content-type") ?? "").startsWith("multipart/form-data");
  const raw = await readCapped(request, multipart ? FEEDBACK_MULTIPART_MAX_BYTES : FEEDBACK_BODY_MAX_BYTES);
  if (raw === "too-large") return Response.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });

  let payload: unknown;
  let file: FormDataEntryValue | null = null;
  if (multipart) {
    const form = await parseForm(raw, request.headers.get("content-type")!);
    const field = form?.get("payload");
    payload = typeof field === "string" ? parseJson(field) : null;
    file = form?.get("image") ?? null;
  } else {
    payload = parseJson(raw === null ? null : new TextDecoder().decode(raw));
  }
  const parsed = parseFeedback(payload);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  let image: FeedbackImage | null = null;
  // An empty file input still arrives as a zero-byte file: no image.
  if (file instanceof File && file.size > 0) {
    if (file.size > FEEDBACK_IMAGE_MAX_BYTES) return Response.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
    image = sniffImage(new Uint8Array(await file.arrayBuffer()));
    if (!image) return Response.json({ error: "INVALID_IMAGE" }, { status: 400 });
  } else if (file !== null && !(file instanceof File)) {
    return Response.json({ error: "INVALID_IMAGE" }, { status: 400 });
  }

  // Only submissions that would file an issue count, so fixing a rejected
  // Figma link doesn't use up the allowance.
  if (!allow(clientIpFrom(request) ?? "unknown")) return Response.json({ error: "RATE_LIMITED" }, { status: 429 });

  let imageUrl: string | null = null;
  if (image) {
    const config = r2Config();
    imageUrl = config && (await uploadFeedbackImage(image, config));
    // Better a retry than an issue that silently lacks the screenshot.
    if (!imageUrl) return Response.json({ error: "UPSTREAM_ERROR" }, { status: 502 });
  }

  const created = await createGitHubIssue(feedbackIssue(parsed.input, process.env.VERCEL_GIT_COMMIT_SHA || null, imageUrl), token);
  if (!created) return Response.json({ error: "UPSTREAM_ERROR" }, { status: 502 });
  return Response.json(created, { status: 201 });
}

/**
 * The body's bytes, read no further than `maxBytes`: a declared length over it
 * is refused unread, and a body sent without one (chunked) is cut off as soon
 * as it passes. `null` when it can't be read.
 */
async function readCapped(request: Request, maxBytes: number): Promise<Uint8Array | null | "too-large"> {
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
    return new Uint8Array(await new Blob(chunks as BlobPart[]).arrayBuffer());
  } catch {
    return null;
  }
}

/** The multipart body as form data; `null` when it isn't well-formed. */
async function parseForm(raw: Uint8Array | null, contentType: string): Promise<FormData | null> {
  if (raw === null) return null;
  try {
    return await new Response(raw as BodyInit, { headers: { "content-type": contentType } }).formData();
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
