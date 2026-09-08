import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v7 as uuidv7 } from "uuid";
import type { ObjectStorage, StoredObject } from "@/shared/ports/storage";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
]);

const MAX_BYTES = 10 * 1024 * 1024;

function magicMime(body: Uint8Array): string | null {
  if (body[0] === 0xff && body[1] === 0xd8) return "image/jpeg";
  if (body[0] === 0x89 && body[1] === 0x50) return "image/png";
  if (body[0] === 0x25 && body[1] === 0x50) return "application/pdf";
  return null;
}

function sanitizeKey(key: string): string {
  const normalized = key.replace(/\\/g, "/").replace(/\.\./g, "");
  if (normalized.startsWith("/") || normalized.includes("..")) {
    throw new Error("invalid_object_key");
  }
  return normalized;
}

export class S3ObjectStorage implements ObjectStorage {
  private client: S3Client;
  private bucket: string;

  constructor() {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) throw new Error("S3_BUCKET not configured");
    this.bucket = bucket;
    this.client = new S3Client({
      region: process.env.S3_REGION ?? "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      credentials:
        process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.S3_ACCESS_KEY_ID,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            }
          : undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    });
  }

  async putPrivate(input: { mime: string; body: Uint8Array }): Promise<StoredObject> {
    if (input.body.byteLength > MAX_BYTES) throw new Error("file_too_large");
    const detected = magicMime(input.body);
    const mime = detected ?? input.mime;
    if (!ALLOWED_MIME.has(mime)) throw new Error("mime_not_allowed");
    const key = sanitizeKey(`private/${uuidv7()}`);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.body,
        ContentType: mime,
      }),
    );
    return { bucket: this.bucket, key, mime, bytes: input.body.byteLength };
  }

  async signedUrl(key: string, expiresSeconds: number): Promise<string> {
    const safeKey = sanitizeKey(key);
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: safeKey });
    return getSignedUrl(this.client, command, { expiresIn: Math.min(expiresSeconds, 3600) });
  }
}
