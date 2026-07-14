import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import convertHeic from 'heic-convert';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/photos';
const HEIC_TYPES = ['image/heic', 'image/heif'];

function extFromMime(contentType) {
  const sub = contentType.split('/')[1] || 'jpg';
  return sub === 'jpeg' ? 'jpg' : sub;
}

export async function saveFile(buffer, contentType) {
  await mkdir(UPLOAD_DIR, { recursive: true });

  // sharp kan HEIC niet decoderen zonder libheif — eerst converteren naar JPEG
  // zodat de foto ook in Chrome/Firefox/Android te zien is (Safari kan HEIC al wel tonen)
  let input = buffer;
  if (HEIC_TYPES.includes(contentType)) {
    try {
      input = Buffer.from(await convertHeic({ buffer, format: 'JPEG', quality: 0.9 }));
    } catch (err) {
      console.error('[storage] HEIC-conversie mislukt:', err.message);
    }
  }

  try {
    // Foto's van telefoons zijn vaak 3-8MB — resizen/comprimeren voorkomt trage feed-loads
    const resized = await sharp(input)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 78 })
      .toBuffer();
    const key = `${randomUUID()}.jpg`;
    await writeFile(join(UPLOAD_DIR, key), resized);
    return key;
  } catch {
    // sharp kan dit formaat niet verwerken — origineel opslaan
    const ext = extFromMime(contentType);
    const key = `${randomUUID()}.${ext}`;
    await writeFile(join(UPLOAD_DIR, key), buffer);
    return key;
  }
}

export function getPublicUrl(key) {
  return `/api/uploads/${key}`;
}
