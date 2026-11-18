import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, readdir, rmdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createPhotoStore, validateProfilePhoto, MAX_PHOTO_BYTES } from '../src/services/profilePhoto.service.js';
const jpeg = await readFile(new URL('./fixtures/profile-photo.jpg', import.meta.url));
const image = `data:image/jpeg;base64,${jpeg.toString('base64')}`;

test('profile photos accept a real small JPEG and reject other content', () => {
  assert.deepEqual(validateProfilePhoto(image), jpeg);
  for (const invalid of [null, '', 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', 'data:image/jpeg;base64,aGVsbG8=', image.slice(0, -8)]) assert.throws(() => validateProfilePhoto(invalid), { statusCode: 400 });
  assert.throws(() => validateProfilePhoto(`data:image/jpeg;base64,${Buffer.alloc(MAX_PHOTO_BYTES + 1).toString('base64')}`), { statusCode: 400 });
});

test('profile photos reject dimensions exceeding 512 pixels', () => {
  const large = Buffer.from(jpeg);
  let found = false;
  for (let i = 2; i < large.length - 9; i++) {
    if (large[i] === 0xff && [0xc0, 0xc1, 0xc2].includes(large[i + 1])) { large.writeUInt16BE(513, i + 7); found = true; break; }
  }
  assert.equal(found, true);
  assert.throws(() => validateProfilePhoto(`data:image/jpeg;base64,${large.toString('base64')}`), { statusCode: 400 });
});

test('photo storage persists replacements, isolates users, and removes only the owner photo', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'livreo-profile-test-'));
  const store = createPhotoStore(directory);
  try {
    assert.equal(await store.get('driver-a'), null);
    await store.save('driver-a', image);
    assert.equal(await createPhotoStore(directory).get('driver-a'), image);
    assert.equal(await store.get('driver-b'), null);
    await store.save('driver-a', image);
    await store.save('../driver-b', image);
    assert.equal((await readdir(directory)).length, 2);
    assert.ok((await readdir(directory)).every((file) => /^[a-f0-9]{64}\.jpg$/.test(file)));
    await store.remove('driver-a');
    assert.equal(await store.get('driver-a'), null);
    assert.equal(await store.get('../driver-b'), image);
    await store.remove('driver-a');
  } finally {
    await store.remove('driver-a');
    await store.remove('../driver-b');
    await rmdir(directory);
  }
});
