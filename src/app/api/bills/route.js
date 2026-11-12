import { NextResponse } from 'next/server';
import { randomUUID, createHash } from 'node:crypto';
import path from 'node:path';
import { getRequiredSession } from '../../../lib/requireSession.js';
import { validatePdfBuffer } from '../../../lib/pdfUpload.js';
import {
  getBillsForUser,
  hasBillHashForUser,
  saveBillForUser,
  recordStorageCleanupFailure,
} from '../../../services/postgresBillStore.js';
import { putBillObject, deleteBillObject } from '../../../services/objectStorage.js';
import { billSortTimestamp } from '../../../lib/billDates.js';
export const runtime = 'nodejs';
const safe = ({ sha256, consumerNumber, originalName, objectKey, userId, ...b }) => b;
export async function GET() {
  try {
    const { user } = await getRequiredSession();
    return NextResponse.json({
      bills: (await getBillsForUser(user.id))
        .map(safe)
        .sort((a, b) => billSortTimestamp(b) - billSortTimestamp(a)),
    });
  } catch (e) {
    if (e.status === 401)
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: 'Could not load bills.' }, { status: 500 });
  }
}
export async function POST(request) {
  let key;
  try {
    const { user } = await getRequiredSession(),
      form = await request.formData(),
      file = form.get('bill');
    if (!file || typeof file.arrayBuffer !== 'function')
      return NextResponse.json({ error: 'Upload a PDF.' }, { status: 400 });
    if (file.size > 10485760)
      return NextResponse.json({ error: 'PDF limit is 10 MB.' }, { status: 413 });
    const buffer = Buffer.from(await file.arrayBuffer());
    await validatePdfBuffer(buffer);
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    if (await hasBillHashForUser(user.id, sha256))
      return NextResponse.json({ error: 'Duplicate PDF.' }, { status: 409 });
    const month = String(form.get('month') || '').trim(),
      units = Number(form.get('units')),
      amount = Number(form.get('amount'));
    if (!month || !Number.isFinite(units) || units < 0 || !Number.isFinite(amount) || amount < 0)
      return NextResponse.json(
        { error: 'Valid month, units and amount are required.' },
        { status: 400 },
      );
    const n = (k) => {
      const v = form.get(k);
      if (v == null || v === '') return null;
      const x = Number(v);
      return Number.isFinite(x) && x >= 0 ? x : null;
    };
    const id = randomUUID();
    key = `users/${user.id}/bills/${id}.pdf`;
    await putBillObject({ key, body: buffer });
    const bill = await saveBillForUser(user.id, {
      id,
      billType: form.get('billType') === 'net-metered' ? 'net-metered' : 'standard',
      month,
      billDate: String(form.get('billDate') || ''),
      units,
      importedUnits: n('importedUnits') ?? units,
      exportedUnits: n('exportedUnits'),
      billedConsumption: n('billedConsumption'),
      bankOpening: n('bankOpening'),
      bankClosing: n('bankClosing'),
      amount,
      netPayable: n('netPayable'),
      consumerNumber: String(form.get('consumerNumber') || ''),
      originalName: path.basename(file.name || 'bill.pdf'),
      objectKey: key,
      sha256,
      uploadedAt: new Date().toISOString(),
    });
    key = null;
    return NextResponse.json({ bill: safe(bill) }, { status: 201 });
  } catch (e) {
    if (key) {
      try {
        await deleteBillObject(key);
      } catch (cleanupError) {
        console.error('Upload rollback cleanup failed; recording retry:', cleanupError);
        try {
          await recordStorageCleanupFailure(key, cleanupError);
        } catch (queueError) {
          console.error('Could not persist upload rollback cleanup task:', queueError);
        }
      }
    }
    if (e.status === 401)
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    if (e.status === 409) return NextResponse.json({ error: e.message }, { status: 409 });
    if (e.status === 400 || e.status === 413)
      return NextResponse.json({ error: e.message || 'Invalid PDF.' }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: 'Could not save bill.' }, { status: 500 });
  }
}
