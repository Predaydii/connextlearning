import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

let client: S3Client | undefined;

function r2() {
  if (client) return client;
  const e = env();
  client = new S3Client({
    region: "auto",
    endpoint: `https://${e.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: e.R2_ACCESS_KEY_ID, secretAccessKey: e.R2_SECRET_ACCESS_KEY },
    // Browsers can't send the default CRC32 checksum headers on presigned PUTs.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}

const bucket = () => env().R2_BUCKET;

/** Presigned PUT that only accepts exactly this content type and size. */
export function presignPut(key: string, contentType: string, contentLength: number) {
  return getSignedUrl(
    r2(),
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType, ContentLength: contentLength }),
    { expiresIn: 15 * 60, signableHeaders: new Set(["content-type", "content-length"]) },
  );
}

/** Short-lived GET link that opens a PDF inline in the browser (R2 egress is free). */
export function presignPdfGet(key: string, fileName: string, expiresIn = 5 * 60) {
  return getSignedUrl(
    r2(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ResponseContentType: "application/pdf",
      ResponseContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    }),
    { expiresIn },
  );
}

export async function headObject(key: string) {
  try {
    const res = await r2().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return { size: res.ContentLength ?? 0, contentType: res.ContentType ?? "" };
  } catch {
    return null;
  }
}

export async function getObjectBytes(key: string): Promise<Uint8Array> {
  const res = await r2().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  if (!res.Body) throw new Error(`Empty object: ${key}`);
  return res.Body.transformToByteArray();
}

export async function getObjectStream(key: string) {
  const res = await r2().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  if (!res.Body) throw new Error(`Empty object: ${key}`);
  return {
    stream: res.Body.transformToWebStream(),
    contentType: res.ContentType ?? "application/octet-stream",
    size: res.ContentLength,
  };
}

export async function putObject(key: string, body: Uint8Array | Buffer, contentType: string, cacheControl?: string) {
  await r2().send(
    new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType, CacheControl: cacheControl }),
  );
}

export async function deleteObjects(keys: string[]) {
  if (!keys.length) return;
  // Single deletes: R2's DeleteObjects is picky about checksum headers across SDK versions.
  await Promise.allSettled(keys.map((Key) => r2().send(new DeleteObjectCommand({ Bucket: bucket(), Key }))));
}
