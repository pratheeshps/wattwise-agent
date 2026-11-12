import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePdfBuffer } from './pdfUpload.js';

const validPdf = Buffer.from(
  '%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R >> endobj\n%%EOF',
);

test('accepts a structurally plausible PDF with a page tree and EOF marker', () => {
  assert.equal(validatePdfBuffer(validPdf), true);
});

test('rejects non-PDF content and a missing header', () => {
  assert.throws(() => validatePdfBuffer(Buffer.from('not a pdf')), {
    status: 400,
    message: 'PDF is empty or too small to be valid.',
  });
});

test('rejects truncated PDFs without an EOF marker', () => {
  const truncated = Buffer.from(validPdf.toString().replace('%%EOF', ''));
  assert.throws(() => validatePdfBuffer(truncated), /incomplete or truncated/);
});

test('rejects a PDF header without a page tree', () => {
  assert.throws(
    () => validatePdfBuffer(Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF')),
    /page tree/,
  );
});

test('rejects files larger than the upload limit', () => {
  const oversized = Buffer.concat([validPdf, Buffer.alloc(10 * 1024 * 1024)]);
  assert.throws(() => validatePdfBuffer(oversized), { status: 413 });
});
