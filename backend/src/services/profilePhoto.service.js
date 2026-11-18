import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_PHOTO_BYTES = 60 * 1024;
const photoDirectory = process.env.PROFILE_PHOTOS_DIR
  ? path.resolve(process.env.PROFILE_PHOTOS_DIR)
  : fileURLToPath(new URL('../../storage/profile-photos/', import.meta.url));

export function validateProfilePhoto(dataUrl) {
  const fail = (message) => { const error = new Error(message); error.statusCode = 400; throw error; };
  if (typeof dataUrl !== 'string' || dataUrl.length > Math.ceil(MAX_PHOTO_BYTES / 3) * 4 + 23) fail('La photo doit faire moins de 60 Ko après compression.');
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) fail('Une photo JPEG valide est requise.');
  const buffer = Buffer.from(match[1], 'base64');
  if (buffer.toString('base64') !== match[1] || buffer.length > MAX_PHOTO_BYTES || buffer.length < 20 || buffer.readUInt16BE(0) !== 0xffd8 || buffer.readUInt16BE(buffer.length - 2) !== 0xffd9) fail('Le fichier photo est invalide ou trop volumineux.');
  let offset = 2, width = 0, height = 0, hasScan = false;
  const frames = new Set([0xc0, 0xc1, 0xc2]);
  while (offset < buffer.length - 2) {
    if (buffer[offset++] !== 0xff) fail('Le fichier JPEG est invalide.');
    while (buffer[offset] === 0xff) offset++;
    const marker = buffer[offset++];
    if (offset + 2 > buffer.length) fail('Le fichier JPEG est incomplet.');
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length - 2) fail('Le fichier JPEG est incomplet.');
    if (frames.has(marker)) {
      if (length < 8) fail('Le fichier JPEG est invalide.');
      height = buffer.readUInt16BE(offset + 3); width = buffer.readUInt16BE(offset + 5);
    }
    if (marker === 0xda) { hasScan = true; break; }
    offset += length;
  }
  if (!hasScan || !width || !height || width > 512 || height > 512) fail('La photo doit mesurer au maximum 512 × 512 pixels.');
  return buffer;
}

export function createPhotoStore(directory) {
  const filename = (userId) => path.join(directory, `${createHash('sha256').update(String(userId)).digest('hex')}.jpg`);
  return {
    async get(userId) {
      try { return `data:image/jpeg;base64,${(await readFile(filename(userId))).toString('base64')}`; }
      catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    },
    async save(userId, dataUrl) {
      const buffer = validateProfilePhoto(dataUrl);
      await mkdir(directory, { recursive: true });
      const target = filename(userId), temporary = `${target}.${randomUUID()}.tmp`;
      try { await writeFile(temporary, buffer, { flag: 'wx', mode: 0o600 }); await rename(temporary, target); }
      finally { await unlink(temporary).catch((error) => { if (error.code !== 'ENOENT') throw error; }); }
      return `data:image/jpeg;base64,${buffer.toString('base64')}`;
    },
    async remove(userId) { await unlink(filename(userId)).catch((error) => { if (error.code !== 'ENOENT') throw error; }); },
  };
}
export const profilePhotos = createPhotoStore(photoDirectory);
