import { prisma } from '../lib/prisma.js';
import { deleteBillObject } from './objectStorage.js';

export async function processPendingStorageCleanup({ limit = 50 } = {}) {
  const batchSize = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const tasks = await prisma.storageCleanup.findMany({
    where: { nextAttemptAt: { lte: new Date() } },
    orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }],
    take: batchSize,
  });

  const result = { processed: 0, deleted: 0, failed: 0 };
  for (const task of tasks) {
    result.processed += 1;
    try {
      await deleteBillObject(task.objectKey);
      await prisma.storageCleanup.deleteMany({ where: { id: task.id } });
      result.deleted += 1;
    } catch (error) {
      const attempts = task.attempts + 1;
      const delayMinutes = Math.min(24 * 60, 2 ** Math.min(attempts, 10));
      await prisma.storageCleanup.updateMany({
        where: { id: task.id },
        data: {
          attempts,
          lastError: String(error?.message || error).slice(0, 1000),
          nextAttemptAt: new Date(Date.now() + delayMinutes * 60_000),
        },
      });
      result.failed += 1;
      console.error('Storage cleanup retry failed', { taskId: task.id, error });
    }
  }
  return result;
}
