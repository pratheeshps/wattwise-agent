import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { extractBillFields } from '../../../../services/pdfBillParser.js';
import { getRequiredSession } from '../../../../lib/requireSession.js';
import { hasBillHashForUser } from '../../../../services/postgresBillStore.js';
import { validatePdfBuffer } from '../../../../lib/pdfUpload.js';
import { enforceApiRateLimit, rejectOversizedRequest, rejectUntrustedOrigin } from '../../../../lib/apiSecurity.js';
export const runtime = 'nodejs';
const pdf = createRequire(import.meta.url)('pdf-parse');
export async function POST(request) {
  try {
    const { user } = await getRequiredSession();
    const originError = rejectUntrustedOrigin(request);
    if (originError) return originError;
    const oversized = rejectOversizedRequest(request);
    if (oversized) return oversized;
    const limited = await enforceApiRateLimit(request, user.id, 'bill-preview');
    if (limited) return limited;
    const form = await request.formData(),
      file = form.get('bill');
    if (!file || typeof file.arrayBuffer !== 'function')
      return NextResponse.json({ error: 'Choose a PDF.' }, { status: 400 });
    if (file.size > 10485760)
      return NextResponse.json({ error: 'PDF limit is 10 MB.' }, { status: 413 });
    const buffer = Buffer.from(await file.arrayBuffer());
    await validatePdfBuffer(buffer);
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    if (await hasBillHashForUser(user.id, sha256))
      return NextResponse.json({ error: 'Duplicate PDF.' }, { status: 409 });
    const parsed = await pdf(buffer);
    if (!Number.isInteger(parsed.numpages) || parsed.numpages < 1)
      return NextResponse.json({ error: 'PDF contains no readable pages.' }, { status: 400 });
    return NextResponse.json({
      previewId: randomUUID(),
      originalName: path.basename(file.name || 'bill.pdf'),
      sha256,
      fields: extractBillFields(parsed.text || ''),
      textExtracted: Boolean(parsed.text?.trim()),
    });
  } catch (e) {
    if (e.status === 401)
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    if (e.status === 400 || e.status === 413)
      return NextResponse.json({ error: e.message || 'Invalid PDF.' }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: 'Could not read PDF.' }, { status: 400 });
  }
}
