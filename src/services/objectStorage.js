import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

let client;

function getProvider() {
  const provider = (process.env.STORAGE_PROVIDER || 'local').trim().toLowerCase();
  if (!['local', 's3'].includes(provider)) {
    throw new Error('STORAGE_PROVIDER must be either "local" or "s3".');
  }
  return provider;
}

function validateKey(key) {
  if (typeof key !== 'string' || !key || key.includes('\\') || key.startsWith('/')) {
    throw new Error('Invalid object key.');
  }
  const segments = key.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error('Invalid object key.');
  }
  return key;
}

function getLocalPath(key) {
  validateKey(key);
  const root = path.resolve(process.env.LOCAL_STORAGE_DIR || './storage/bills');
  const target = path.resolve(root, ...key.split('/'));
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error('Invalid object key.');
  }
  return { root, target };
}

function getS3Config() {
  const { S3_BUCKET, S3_REGION, S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
  if (!S3_BUCKET || !S3_REGION || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new Error('Configure S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.');
  }
  return { bucket: S3_BUCKET, region: S3_REGION, endpoint: S3_ENDPOINT };
}

function getClient() {
  if (client) return client;
  const config = getS3Config();
  client = new S3Client({
    region: config.region,
    ...(config.endpoint ? { endpoint: config.endpoint, forcePathStyle: true } : {}),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });
  return client;
}

export function getBillStorageProvider() {
  return getProvider();
}

export async function putBillObject({ key, body, contentType = 'application/pdf' }) {
  validateKey(key);
  if (getProvider() === 'local') {
    const { root, target } = getLocalPath(key);
    await mkdir(path.dirname(target), { recursive: true });
    await mkdir(root, { recursive: true });
    const temporary = `${target}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, body, { flag: 'wx', mode: 0o600 });
      await rename(temporary, target);
    } catch (error) {
      await rm(temporary, { force: true }).catch(() => {});
      throw error;
    }
    return key;
  }

  const { bucket } = getS3Config();
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
    }),
  );
  return key;
}

export async function readBillObject(key) {
  validateKey(key);
  if (getProvider() === 'local') {
    const { target } = getLocalPath(key);
    return readFile(target);
  }
  const { bucket } = getS3Config();
  const response = await getClient().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return Buffer.from(await response.Body.transformToByteArray());
}

export async function deleteBillObject(key) {
  validateKey(key);
  if (getProvider() === 'local') {
    const { target } = getLocalPath(key);
    await rm(target, { force: true });
    return;
  }
  const { bucket } = getS3Config();
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function createBillDownloadUrl(key, expiresIn = 60) {
  validateKey(key);
  if (getProvider() === 'local') {
    throw new Error(
      'Local storage does not issue public URLs. Use the authenticated bill download API.',
    );
  }
  const { bucket } = getS3Config();
  return getSignedUrl(getClient(), new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: Math.min(Math.max(expiresIn, 1), 300),
  });
}
