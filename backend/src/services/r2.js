import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET || 'streetfeed';

// Lifecycle retention days by category
const RETENTION = {
  package: 7,
  incident: 30,
  waste: 14,
  blockage: null,  // end_date + 3
  container: null,
  event: 30,
  general: 30,
};

export async function createPresignedUpload(category, contentType) {
  const ext = contentType.split('/')[1] || 'jpg';
  const key = `${category}/${uuidv4()}.${ext}`;

  const url = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 300 }
  );

  const retentionDays = RETENTION[category] ?? 30;
  const expiresAt = retentionDays
    ? new Date(Date.now() + retentionDays * 86400 * 1000).toISOString()
    : null;

  return { url, key, expiresAt };
}

export async function deleteObject(key) {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export function getPublicUrl(key) {
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}
