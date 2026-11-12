import { prisma } from '../lib/prisma.js';
import { requireTenantUserId } from '../lib/tenantIdentity.js';

const clean = (b) => ({
  ...b,
  uploadedAt: b.uploadedAt instanceof Date ? b.uploadedAt.toISOString() : b.uploadedAt,
});

export async function getBillsForUser(userId) {
  const ownerId = requireTenantUserId(userId);
  return (
    await prisma.bill.findMany({
      where: { userId: ownerId },
      orderBy: [{ uploadedAt: 'desc' }, { id: 'asc' }],
    })
  ).map(clean);
}

export async function hasBillHashForUser(userId, sha256) {
  const ownerId = requireTenantUserId(userId);
  return Boolean(
    await prisma.bill.findUnique({
      where: { userId_sha256: { userId: ownerId, sha256 } },
      select: { id: true },
    }),
  );
}

export async function saveBillForUser(userId, b) {
  const ownerId = requireTenantUserId(userId);
  try {
    return clean(
      await prisma.bill.create({
        data: {
          id: b.id,
          userId: ownerId,
          billType: b.billType,
          month: b.month,
          billDate: b.billDate || '',
          units: b.units,
          importedUnits: b.importedUnits ?? null,
          exportedUnits: b.exportedUnits ?? null,
          billedConsumption: b.billedConsumption ?? null,
          bankOpening: b.bankOpening ?? null,
          bankClosing: b.bankClosing ?? null,
          amount: b.amount,
          netPayable: b.netPayable ?? null,
          consumerNumber: b.consumerNumber || null,
          originalName: b.originalName || null,
          objectKey: b.objectKey,
          sha256: b.sha256,
          uploadedAt: new Date(b.uploadedAt),
        },
      }),
    );
  } catch (e) {
    if (e.code === 'P2002') {
      e.status = 409;
      e.message = 'This PDF has already been uploaded.';
    }
    throw e;
  }
}

export async function findBillForUser(userId, id) {
  const ownerId = requireTenantUserId(userId);
  if (typeof id !== 'string' || id.trim().length === 0) {
    const error = new Error('Bill ID is required.');
    error.status = 400;
    throw error;
  }
  const b = await prisma.bill.findFirst({ where: { id, userId: ownerId } });
  return b ? clean(b) : null;
}

export async function deleteBillAndQueueStorageCleanup(userId, id) {
  const ownerId = requireTenantUserId(userId);
  if (typeof id !== 'string' || id.trim().length === 0) {
    const error = new Error('Bill ID is required.');
    error.status = 400;
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const bill = await tx.bill.findFirst({ where: { id, userId: ownerId } });
    if (!bill) return null;

    await tx.storageCleanup.upsert({
      where: { objectKey: bill.objectKey },
      create: { objectKey: bill.objectKey, reason: 'bill_deleted' },
      update: { reason: 'bill_deleted', nextAttemptAt: new Date() },
    });
    await tx.bill.deleteMany({ where: { id, userId: ownerId } });
    return clean(bill);
  });
}

export async function removeStorageCleanup(objectKey) {
  await prisma.storageCleanup.deleteMany({ where: { objectKey } });
}

export async function recordStorageCleanupFailure(objectKey, error) {
  const message = String(error?.message || error || 'Unknown storage cleanup error').slice(0, 1000);
  const current = await prisma.storageCleanup.findUnique({ where: { objectKey } });
  const attempts = (current?.attempts || 0) + 1;
  const delayMinutes = Math.min(24 * 60, 2 ** Math.min(attempts, 10));
  await prisma.storageCleanup.upsert({
    where: { objectKey },
    create: {
      objectKey,
      reason: 'upload_rollback',
      attempts,
      lastError: message,
      nextAttemptAt: new Date(Date.now() + delayMinutes * 60_000),
    },
    update: {
      attempts,
      lastError: message,
      nextAttemptAt: new Date(Date.now() + delayMinutes * 60_000),
    },
  });
}
