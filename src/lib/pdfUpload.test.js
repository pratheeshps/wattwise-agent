import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validatePdfBuffer } from './pdfUpload.js';

const pdfFixture = readFileSync(
  new URL('./fixtures/valid-one-page.pdf.b64', import.meta.url),
  'utf8',
).trim();

function makePdf() {
  return Buffer.from(pdfFixture, 'base64');
}

test('accepts a readable one-page PDF', async () => {
  const parsed = await validatePdfBuffer(makePdf());
  assert.equal(parsed, true);
});

test('rejects non-PDF content and a missing header', async () => {
  await assert.rejects(validatePdfBuffer(Buffer.from('not a pdf')), {
    status: 400,
    message: 'PDF is empty or too small to be valid.',
  });
});

test('rejects truncated PDFs without an EOF marker', async () => {
  const truncated = Buffer.from(makePdf().toString().replace('%%EOF', ''));
  await assert.rejects(validatePdfBuffer(truncated), /incomplete or truncated/);
});

test('rejects a PDF header without a page tree', async () => {
  await assert.rejects(
    validatePdfBuffer(Buffer.from('%PDF-1.4\\n1 0 obj << /Type /Catalog >> endobj\\n%%EOF')),
    /too small to be valid|page tree/,
  );
});

test('rejects files larger than the upload limit', async () => {
  const oversized = Buffer.concat([makePdf(), Buffer.alloc(10 * 1024 * 1024)]);
  await assert.rejects(validatePdfBuffer(oversized), { status: 413 });
});

test('rejects a fake PDF that has markers but cannot be parsed', async () => {
  const malformed = Buffer.from('%PDF-1.4\\n<< /Type /Pages >>\\n%%EOF');
  await assert.rejects(validatePdfBuffer(malformed), { status: 400 });
});
