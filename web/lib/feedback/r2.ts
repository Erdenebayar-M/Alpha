import { createHash, createHmac, randomUUID } from "node:crypto";
import type { FeedbackImage } from "@/lib/feedback/image";

/** Where feedback images go, kept apart from the content pipeline's assets. */
const PREFIX = "feedback/";

type R2Config = { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string; publicUrl: string };

/**
 * The same R2 bucket and variable names the content pipeline uses
 * (content-pipeline/scripts/uploadImagesToR2.ts), scoped on the Cloudflare
 * side to the `feedback/` prefix. `null` when any is missing. Server-side only.
 */
export function r2Config(): R2Config | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) return null;
  return {
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: R2_BUCKET_NAME,
    publicUrl: R2_PUBLIC_URL.replace(/\/$/, ""),
  };
}

/**
 * Stores the image at `feedback/<random>.<ext>` and returns its public URL, or
 * `null` on any failure. The name is random, never the browser's filename.
 * Signed with AWS Signature V4 by hand (R2 speaks S3) so the web app needs no
 * SDK dependency. Server-side only.
 */
export async function uploadFeedbackImage(image: FeedbackImage, config: R2Config): Promise<string | null> {
  const key = `${PREFIX}${randomUUID()}.${image.extension}`;
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const path = `/${config.bucket}/${key}`;
  const amzDate = new Date().toISOString().replace(/[-:]|\.\d{3}/g, ""); // 20260101T000000Z
  const date = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(image.bytes);

  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "PUT",
    path,
    "",
    `content-type:${image.contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const scope = `${date}/auto/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");
  let signingKey: Buffer | string = `AWS4${config.secretAccessKey}`;
  for (const part of [date, "auto", "s3", "aws4_request"]) signingKey = createHmac("sha256", signingKey).update(part).digest();
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  try {
    const res = await fetch(`https://${host}${path}`, {
      method: "PUT",
      headers: {
        "content-type": image.contentType,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate,
        authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      },
      body: image.bytes as BodyInit,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    return res.ok ? `${config.publicUrl}/${key}` : null;
  } catch {
    return null;
  }
}

function sha256Hex(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}
