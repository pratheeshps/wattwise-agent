import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { processPendingStorageCleanup } from '../../../../services/storageCleanup.js';

export const runtime = 'nodejs';

function hasValidSecret(request) {
  const expected = process.env.STORAGE_CLEANUP_SECRET;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!expected || !supplied) return false;
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return (
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}

export async function POST(request) {
  if (!process.env.STORAGE_CLEANUP_SECRET) {
    return NextResponse.json({ error: 'Storage cleanup is not configured.' }, { status: 503 });
  }
  if (!hasValidSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const result = await processPendingStorageCleanup({ limit: 50 });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Storage cleanup batch failed', error);
    return NextResponse.json({ error: 'Could not process storage cleanup.' }, { status: 500 });
  }
}
