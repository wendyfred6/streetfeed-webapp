import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/photos';

function extFromMime(contentType) {
  const sub = contentType.split('/')[1] || 'jpg';
  return sub === 'jpeg' ? 'jpg' : sub;
}

export async function saveFile(buffer, contentType) {
  const ext = extFromMime(contentType);
  const key = `${uuidv4()}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(join(UPLOAD_DIR, key), buffer);
  return key;
}

export function getPublicUrl(key) {
  return `/api/uploads/${key}`;
}
