import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client;

function getConfig() {
  const { S3_BUCKET, S3_REGION, S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
  if (!S3_BUCKET || !S3_REGION || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new Error("Configure S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.");
  }
  return { bucket: S3_BUCKET, region: S3_REGION, endpoint: S3_ENDPOINT };
}

function getClient() {
  if (client) return client;
  const config = getConfig();
  client = new S3Client({
    region: config.region,
    ...(config.endpoint ? { endpoint: config.endpoint, forcePathStyle: true } : {}),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    }
  });
  return client;
}

export async function putBillObject({ key, body, contentType = "application/pdf" }) {
  if (!key || key.includes("..") || key.startsWith("/")) throw new Error("Invalid object key.");
  const { bucket } = getConfig();
  await getClient().send(new PutObjectCommand({
    Bucket: bucket, Key: key, Body: body, ContentType: contentType,
    ServerSideEncryption: "AES256"
  }));
  return key;
}

export async function deleteBillObject(key) {
  if (!key || key.includes("..") || key.startsWith("/")) throw new Error("Invalid object key.");
  const { bucket } = getConfig();
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function createBillDownloadUrl(key, expiresIn = 60) {
  if (!key || key.includes("..") || key.startsWith("/")) throw new Error("Invalid object key.");
  const { bucket } = getConfig();
  return getSignedUrl(getClient(), new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: Math.min(Math.max(expiresIn, 1), 300)
  });
}
