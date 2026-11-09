import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const previousProvider = process.env.STORAGE_PROVIDER;
const previousDirectory = process.env.LOCAL_STORAGE_DIR;
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'wattwise-storage-'));
process.env.STORAGE_PROVIDER = 'local';
process.env.LOCAL_STORAGE_DIR = temporaryDirectory;

const storage = await import('./objectStorage.js');

test('local provider writes, reads and deletes a bill object', async () => {
  const key = 'users/test-user/bills/test.pdf';
  const contents = Buffer.from('%PDF-1.4 test document');

  await storage.putBillObject({ key, body: contents });
  assert.deepEqual(await storage.readBillObject(key), contents);

  await storage.deleteBillObject(key);
  await assert.rejects(storage.readBillObject(key), { code: 'ENOENT' });
});

test('local provider rejects traversal keys', async () => {
  await assert.rejects(
    storage.putBillObject({ key: '../outside.pdf', body: Buffer.from('x') }),
    /Invalid object key/,
  );
  await assert.rejects(storage.readBillObject('users/../outside.pdf'), /Invalid object key/);
});

test('local provider does not create public download URLs', async () => {
  await assert.rejects(
    storage.createBillDownloadUrl('users/test-user/bills/test.pdf'),
    /authenticated bill download API/,
  );
});

test.after(async () => {
  await rm(temporaryDirectory, { recursive: true, force: true });
  if (previousProvider === undefined) delete process.env.STORAGE_PROVIDER;
  else process.env.STORAGE_PROVIDER = previousProvider;
  if (previousDirectory === undefined) delete process.env.LOCAL_STORAGE_DIR;
  else process.env.LOCAL_STORAGE_DIR = previousDirectory;
});
