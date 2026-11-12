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

export async function deleteBillForUser(userId, id) {
  const ownerId = requireTenantUserId(userId);
  if (typeof id !== 'string' || id.trim().length === 0) {
    const error = new Error('Bill ID is required.');
    error.status = 400;
    throw error;
  }
  return (await prisma.bill.deleteMany({ where: { id, userId: ownerId } })).count === 1;
}
