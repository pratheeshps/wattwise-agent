import { NextResponse } from 'next/server';
import { getRequiredSession } from '../../../../lib/requireSession.js';
import {
  deleteBillAndQueueStorageCleanup,
  removeStorageCleanup,
  recordStorageCleanupFailure,
} from '../../../../services/postgresBillStore.js';
import { deleteBillObject } from '../../../../services/objectStorage.js';
export const runtime = 'nodejs';
export async function DELETE(_request, context) {
  try {
    const { user } = await getRequiredSession(),
      { id } = await context.params;
    if (!id || id.length > 100)
      return NextResponse.json({ error: 'Invalid bill ID.' }, { status: 400 });
    const bill = await deleteBillAndQueueStorageCleanup(user.id, id);
    if (!bill) return NextResponse.json({ error: 'Bill not found.' }, { status: 404 });

    try {
      await deleteBillObject(bill.objectKey);
      await removeStorageCleanup(bill.objectKey);
      return NextResponse.json({ deleted: true, billId: id, month: bill.month });
    } catch (error) {
      console.error('PDF cleanup failed; retry has been queued:', error);
      try {
        await recordStorageCleanupFailure(bill.objectKey, error);
      } catch (queueError) {
        console.error('Could not update storage cleanup retry:', queueError);
      }
      return NextResponse.json({
        deleted: true,
        billId: id,
        month: bill.month,
        storageCleanupPending: true,
      });
    }
  } catch (e) {
    if (e.status === 401)
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: 'Could not delete bill.' }, { status: 500 });
  }
}
