import {
  S3Client,
  PutObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { env } from '../config/env';
import { sniffContentType } from './media-type';

function makeClient(): S3Client {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 credentials not configured');
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

export function r2Enabled(): boolean {
  return Boolean(
    env.R2_ACCOUNT_ID &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_BUCKET_NAME &&
      env.R2_PUBLIC_URL,
  );
}

export async function r2Upload(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const bucket = env.R2_BUCKET_NAME!;

  // Trust the bytes, not the caller: an external tool once uploaded WebM/Opus
  // labelled as .m4a/audio/wav, which iOS could not decode. Sniff the magic
  // bytes and override the declared ContentType when they disagree, so no object
  // in the bucket can be mislabelled through this path.
  const sniffed = sniffContentType(body);
  let effectiveType = contentType;
  if (sniffed && sniffed !== contentType) {
    console.warn(
      JSON.stringify({
        event: 'r2_content_type_corrected',
        key,
        declared: contentType,
        detected: sniffed,
      }),
    );
    effectiveType = sniffed;
  }

  await makeClient().send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: effectiveType }),
  );
  return `${env.R2_PUBLIC_URL}/${key}`;
}

export async function r2Move(srcKey: string, destKey: string): Promise<string> {
  const bucket = env.R2_BUCKET_NAME!;
  const client = makeClient();
  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${srcKey}`,
      Key: destKey,
    }),
  );
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: srcKey }));
  return `${env.R2_PUBLIC_URL}/${destKey}`;
}
