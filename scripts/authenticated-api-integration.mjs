import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { once } from 'node:events';
import { prisma } from '../src/lib/prisma.js';
import { deleteBillObject, putBillObject } from '../src/services/objectStorage.js';

const appPort = Number(process.env.E2E_APP_PORT || 3101);
const smtpPort = Number(process.env.E2E_SMTP_PORT || 1025);
const baseUrl = `http://127.0.0.1:${appPort}`;
const verificationMessages = [];
const createdEmails = [];
const cleanupSecret = 'wattwise-e2e-storage-cleanup-secret';
const smtp = net.createServer((socket) => {
  socket.setEncoding('utf8');
  socket.write('220 wattwise-e2e.local ESMTP\r\n');
  let buffer = '';
  let inData = false;
  let message = '';

  socket.on('data', (chunk) => {
    buffer += chunk;
    while (buffer) {
      if (inData) {
        const end = buffer.indexOf('\r\n.\r\n');
        if (end === -1) return;
        message += buffer.slice(0, end);
        buffer = buffer.slice(end + 5);
        verificationMessages.push(message);
        message = '';
        inData = false;
        socket.write('250 Message accepted\r\n');
        continue;
      }

      const end = buffer.indexOf('\r\n');
      if (end === -1) return;
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const command = line.split(' ')[0].toUpperCase();

      if (command === 'EHLO' || command === 'HELO') {
        socket.write('250-wattwise-e2e.local\r\n250 OK\r\n');
      } else if (command === 'MAIL' || command === 'RCPT') {
        socket.write('250 OK\r\n');
      } else if (command === 'DATA') {
        inData = true;
        socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
      } else if (command === 'RSET' || command === 'NOOP') {
        socket.write('250 OK\r\n');
      } else if (command === 'QUIT') {
        socket.write('221 Bye\r\n');
        socket.end();
      } else {
        socket.write('250 OK\r\n');
      }
    }
  });
});

const server = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '-p', String(appPort)],
  {
    stdio: 'inherit',
    env: { ...process.env, PORT: String(appPort), STORAGE_CLEANUP_SECRET: cleanupSecret },
  },
);

async function waitForApp() {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    if (server.exitCode != null) throw new Error('Next.js server exited before becoming ready.');
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('Next.js server did not become ready.');
}

function cookiesFrom(response) {
  return (response.headers.getSetCookie?.() || [])
    .map((value) => value.split(';', 1)[0])
    .filter(Boolean)
    .join('; ');
}

async function request(path, options = {}, cookie = '') {
  const headers = new Headers(options.headers || {});
  if (cookie) headers.set('Cookie', cookie);
  return fetch(baseUrl + path, { ...options, headers, redirect: 'manual' });
}

async function createVerifiedUser(label) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `wattwise-e2e-${label}-${suffix}@example.test`;
  createdEmails.push(email);
  const password = 'Wattwise-E2E-Password-2026!';
  const signup = await request('/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `E2E ${label}`, email, password }),
  });
  assert.equal(signup.status, 200, `${label}: registration should succeed`);

  let verificationUrl;
  for (let attempt = 0; attempt < 30 && !verificationUrl; attempt += 1) {
    const message = verificationMessages.find((entry) => entry.includes(email));
    if (message) {
      const decoded = message.replace(/=3D/g, '=').replace(/=\r?\n/g, '');
      const match = decoded.match(/https?:\/\/[^\s<>"]+/);
      if (match) verificationUrl = match[0].replace(/&amp;/g, '&');
    }
    if (!verificationUrl) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(verificationUrl, `${label}: verification email should be captured`);

  const verification = await fetch(verificationUrl, { redirect: 'manual' });
  assert.ok(
    [200, 302, 303, 307].includes(verification.status),
    `${label}: verification should complete (received ${verification.status})`,
  );

  const signin = await request('/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(signin.status, 200, `${label}: sign-in should succeed`);
  const cookie = cookiesFrom(signin);
  assert.ok(cookie, `${label}: sign-in should issue a session cookie`);

  const session = await request('/api/auth/get-session', {}, cookie);
  assert.equal(session.status, 200, `${label}: session endpoint should respond`);
  const sessionBody = await session.json();
  assert.equal(sessionBody.user?.email, email, `${label}: session should belong to signed-in user`);
  return { cookie, email, id: sessionBody.user.id };
}

async function main() {
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL is required.');
  assert.ok(process.env.BETTER_AUTH_SECRET, 'BETTER_AUTH_SECRET is required.');
  await new Promise((resolve, reject) => {
    smtp.once('error', reject);
    smtp.listen(smtpPort, '127.0.0.1', resolve);
  });
  await waitForApp();

  const cleanupUnauthorized = await request('/api/internal/storage-cleanup', { method: 'POST' });
  assert.equal(
    cleanupUnauthorized.status,
    401,
    'storage cleanup worker must reject missing secrets',
  );
  const unauthenticated = await request('/api/bills');
  assert.equal(unauthenticated.status, 401, 'bill list must require authentication');
  const unauthenticatedPreview = await request('/api/bills/preview', { method: 'POST' });
  assert.equal(unauthenticatedPreview.status, 401, 'bill preview must require authentication');
  const unauthenticatedAnalysis = await request('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectedMonth: '2026-10' }),
  });
  assert.equal(unauthenticatedAnalysis.status, 401, 'analysis must require authentication');

  const userA = await createVerifiedUser('a');
  const userB = await createVerifiedUser('b');

  const invalidForm = new FormData();
  invalidForm.set('bill', new Blob(['not-a-pdf'], { type: 'application/pdf' }), 'invalid.pdf');
  invalidForm.set('month', '2026-10');
  invalidForm.set('units', '100');
  invalidForm.set('amount', '250');
  const invalidUpload = await request(
    '/api/bills',
    { method: 'POST', body: invalidForm },
    userA.cookie,
  );
  assert.equal(invalidUpload.status, 400, 'non-PDF upload must be rejected');

  const truncatedForm = new FormData();
  truncatedForm.set(
    'bill',
    new Blob(['%PDF-1.4\n1 0 obj << /Type /Page >>'], { type: 'application/pdf' }),
    'truncated.pdf',
  );
  truncatedForm.set('month', '2026-10');
  truncatedForm.set('units', '100');
  truncatedForm.set('amount', '250');
  const truncatedUpload = await request(
    '/api/bills',
    { method: 'POST', body: truncatedForm },
    userA.cookie,
  );
  assert.equal(truncatedUpload.status, 400, 'truncated PDF must be rejected');

  const makePdfBytes = (label = 'Wattwise E2E fixture') => {
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> >>',
    ];
    let output = \`%PDF-1.4\n% \${label}\n\`;
    const offsets = [0];
    for (let index = 0; index < objects.length; index += 1) {
      offsets.push(Buffer.byteLength(output));
      output += \`\${index + 1} 0 obj\n\${objects[index]}\nendobj\n\`;
    }
    const xrefOffset = Buffer.byteLength(output);
    output += 'xref\n0 4\n0000000000 65535 f \n';
    for (const offset of offsets.slice(1)) {
      output += \`\${String(offset).padStart(10, '0')} 00000 n \n\`;
    }
    output += \`trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n\${xrefOffset}\n%%EOF\n\`;
    return Buffer.from(output);
  };
  const pdfBytes = makePdfBytes();

  const workerObjectKey = `users/${userA.id}/bills/cleanup-worker-fixture.pdf`;
  await putBillObject({ key: workerObjectKey, body: pdfBytes });
  const failedWorkerKey = '../invalid-cleanup-fixture.pdf';
  const dueAt = new Date(Date.now() - 1000);
  await prisma.storageCleanup.createMany({
    data: [
      { objectKey: workerObjectKey, reason: 'integration_test', nextAttemptAt: dueAt },
      { objectKey: failedWorkerKey, reason: 'integration_test', nextAttemptAt: dueAt },
    ],
  });
  const cleanupAuthorized = await request('/api/internal/storage-cleanup', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cleanupSecret}` },
  });
  assert.equal(cleanupAuthorized.status, 200, 'authorized storage cleanup worker should run');
  const cleanupResult = await cleanupAuthorized.json();
  assert.equal(cleanupResult.processed, 2, 'worker should process both due cleanup tasks');
  assert.equal(cleanupResult.deleted, 1, 'worker should delete the stored object');
  assert.equal(cleanupResult.failed, 1, 'worker should record a storage deletion failure');
  assert.equal(
    await prisma.storageCleanup.findUnique({ where: { objectKey: workerObjectKey } }),
    null,
    'successful retry should remove its queue record',
  );
  const failedWorkerTask = await prisma.storageCleanup.findUnique({
    where: { objectKey: failedWorkerKey },
  });
  assert.equal(failedWorkerTask.attempts, 1, 'failed cleanup should increment its retry count');
  assert.ok(failedWorkerTask.lastError, 'failed cleanup should retain the error for diagnostics');
  await prisma.storageCleanup.delete({ where: { objectKey: failedWorkerKey } });
  const makeBillForm = () => {
    const form = new FormData();
    form.set('bill', new Blob([pdfBytes], { type: 'application/pdf' }), 'e2e-bill.pdf');
    form.set('month', '2026-10');
    form.set('units', '253');
    form.set('amount', '315');
    form.set('billType', 'standard');
    return form;
  };

  const upload = await request(
    '/api/bills',
    { method: 'POST', body: makeBillForm() },
    userA.cookie,
  );
  assert.equal(upload.status, 201, 'valid PDF upload should succeed');
  const uploadBody = await upload.json();
  const billId = uploadBody.bill?.id;
  assert.ok(billId, 'upload response should contain a bill ID');
  for (const privateField of ['userId', 'objectKey', 'sha256', 'consumerNumber', 'originalName']) {
    assert.equal(
      privateField in uploadBody.bill,
      false,
      `upload response must not expose ${privateField}`,
    );
  }
  const storedBill = await prisma.bill.findUnique({
    where: { id: billId },
    select: { userId: true, objectKey: true },
  });
  assert.equal(storedBill.userId, userA.id, 'bill owner must come from the authenticated session');
  assert.ok(
    storedBill.objectKey.startsWith(`users/${userA.id}/bills/`),
    'storage key must be tenant-scoped',
  );

  const duplicate = await request(
    '/api/bills',
    { method: 'POST', body: makeBillForm() },
    userA.cookie,
  );
  assert.equal(duplicate.status, 409, 'duplicate PDF should be rejected');

  const listA = await request('/api/bills', {}, userA.cookie);
  assert.equal(listA.status, 200);
  assert.equal((await listA.json()).bills.length, 1, 'User A should see their bill');

  const listB = await request(
    `/api/bills?userId=${encodeURIComponent(userA.id)}`,
    {},
    userB.cookie,
  );
  assert.equal(listB.status, 200);
  assert.equal(
    (await listB.json()).bills.length,
    0,
    'User B must not see User A bill, even with a forged userId query',
  );

  const downloadB = await request(
    `/api/bills/${encodeURIComponent(billId)}/download`,
    {},
    userB.cookie,
  );
  assert.equal(downloadB.status, 404, 'User B must not download User A bill');

  const deleteB = await request(
    `/api/bills/${encodeURIComponent(billId)}`,
    { method: 'DELETE' },
    userB.cookie,
  );
  assert.equal(deleteB.status, 404, 'User B must not delete User A bill');

  const downloadA = await request(
    `/api/bills/${encodeURIComponent(billId)}/download`,
    {},
    userA.cookie,
  );
  assert.equal(downloadA.status, 200, 'User A should download their bill');
  assert.equal(downloadA.headers.get('content-type'), 'application/pdf');
  assert.deepEqual(Buffer.from(await downloadA.arrayBuffer()), pdfBytes);

  const analysisWithoutBills = await request(
    '/api/analyze',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedMonth: '2026-10', userId: userA.id }),
    },
    userB.cookie,
  );
  assert.equal(
    analysisWithoutBills.status,
    400,
    'analysis must use the authenticated user rather than a forged userId in the request body',
  );

  const concurrentPdf = makePdfBytes('Wattwise concurrent duplicate fixture');
  const makeConcurrentForm = () => {
    const form = new FormData();
    form.set('bill', new Blob([concurrentPdf], { type: 'application/pdf' }), 'concurrent.pdf');
    form.set('month', '2026-11');
    form.set('units', '224');
    form.set('amount', '290');
    return form;
  };
  const concurrentUploads = await Promise.all([
    request('/api/bills', { method: 'POST', body: makeConcurrentForm() }, userB.cookie),
    request('/api/bills', { method: 'POST', body: makeConcurrentForm() }, userB.cookie),
  ]);
  assert.deepEqual(
    concurrentUploads.map((response) => response.status).sort(),
    [201, 409],
    'concurrent same-tenant uploads must persist exactly one bill',
  );

  const samePdfForUserB = await request(
    '/api/bills',
    { method: 'POST', body: makeBillForm() },
    userB.cookie,
  );
  assert.equal(samePdfForUserB.status, 201, 'the same PDF may be uploaded by a different tenant');
  const userBBillId = (await samePdfForUserB.json()).bill?.id;
  assert.ok(userBBillId, 'User B upload should return its own bill ID');
  const userBDownload = await request(
    `/api/bills/${encodeURIComponent(userBBillId)}/download`,
    {},
    userB.cookie,
  );
  assert.equal(userBDownload.status, 200, 'User B should access their own bill');
  assert.deepEqual(Buffer.from(await userBDownload.arrayBuffer()), pdfBytes);

  const deleteA = await request(
    `/api/bills/${encodeURIComponent(billId)}`,
    { method: 'DELETE' },
    userA.cookie,
  );
  assert.equal(deleteA.status, 200, 'User A should delete their bill');
  const cleanupTask = await prisma.storageCleanup.findUnique({
    where: { objectKey: storedBill.objectKey },
  });
  assert.equal(cleanupTask, null, 'successful object deletion should clear its cleanup task');

  const listAfterDelete = await request('/api/bills', {}, userA.cookie);
  assert.equal((await listAfterDelete.json()).bills.length, 0, 'deleted bill should disappear');

  console.log(
    'Authenticated API integration tests passed: verification, sessions, upload validation, ' +
      'duplicate detection, forged identity rejection, tenant-scoped storage, ' +
      'cross-tenant isolation, download, delete and analysis preconditions.',
  );
}

try {
  await main();
} finally {
  server.kill('SIGTERM');
  smtp.close();
  await once(server, 'exit').catch(() => {});
  for (const email of createdEmails) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) continue;
    const bills = await prisma.bill.findMany({
      where: { userId: user.id },
      select: { objectKey: true },
    });
    for (const bill of bills) {
      await deleteBillObject(bill.objectKey).catch((error) => {
        console.error('E2E storage cleanup failed:', error.message);
      });
    }
    await prisma.user.delete({ where: { id: user.id } });
  }
  await prisma.$disconnect();
}
