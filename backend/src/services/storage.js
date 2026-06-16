import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/photos';

function extFromMime(contentType) {
  const sub = contentType.split('/')[1] || 'jpg';
  return sub === 'jpeg' ? 'jpg' : sub;
}

export async function saveFile(buffer, contentType) {
  await mkdir(UPLOAD_DIR, { recursive: true });
  try {
    // Foto's van telefoons zijn vaak 3-8MB — resizen/comprimeren voorkomt trage feed-loads
    const resized = await sharp(buffer)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 78 })
      .toBuffer();
    const key = `${uuidv4()}.jpg`;
    await writeFile(join(UPLOAD_DIR, key), resized);
    return key;
  } catch {
    // sharp kan dit formaat niet verwerken (bijv. HEIC zonder libheif) — origineel opslaan
    const ext = extFromMime(contentType);
    const key = `${uuidv4()}.${ext}`;
    await writeFile(join(UPLOAD_DIR, key), buffer);
    return key;
  }
}

export function getPublicUrl(key) {
  return `/api/uploads/${key}`;
}
