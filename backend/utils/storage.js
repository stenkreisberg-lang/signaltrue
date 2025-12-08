import path from "path";
import fs from "fs/promises";
// ...existing code...

// ...existing code...

const USE_S3 = !!process.env.USE_S3;

let s3Client = null;
let S3Bucket = process.env.S3_BUCKET || null;

if (USE_S3) {
  try {
    // Defer actual client creation until first use; set S3Bucket must be provided
    if (!S3Bucket) console.warn("USE_S3 is set but S3_BUCKET is not configured");
  } catch (err) {
    // noop
  }
}

export async function saveFileLocal(uploadDir, filename, bufferOrPath) {
  const dest = path.join(uploadDir, filename);
  if (Buffer.isBuffer(bufferOrPath)) {
    await fs.writeFile(dest, bufferOrPath);
  } else {
    // assume it's a path to a temp file
    await fs.copyFile(bufferOrPath, dest);
  }
  return dest;
}

export async function saveFileS3(key, body, contentType) {
  if (!s3Client) {
    const { S3Client } = await import("@aws-sdk/client-s3");
    s3Client = new S3Client({});
  }

  // dynamic import of SDK classes
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const cmd = new PutObjectCommand({ Bucket: S3Bucket, Key: key, Body: body, ContentType: contentType });
  await s3Client.send(cmd);
  return `https://${S3Bucket}.s3.amazonaws.com/${key}`;
}
