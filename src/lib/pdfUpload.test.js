import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePdfBuffer } from './pdfUpload.js';

function makePdf() {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> >>',
  ];
  let output = '%PDF-1.4\n% Wattwise validation fixture\n';
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
}

test('accepts a readable one-page PDF', async () => {
  assert.equal(await validatePdfBuffer(makePdf()), true);
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
    validatePdfBuffer(Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF')),
    /too small to be valid|page tree/,
  );
});

test('rejects files larger than the upload limit', async () => {
  const oversized = Buffer.concat([makePdf(), Buffer.alloc(10 * 1024 * 1024)]);
  await assert.rejects(validatePdfBuffer(oversized), { status: 413 });
});

test('rejects a fake PDF that has markers but cannot be parsed', async () => {
  const malformed = Buffer.from('%PDF-1.4\n<< /Type /Pages >>\n%%EOF');
  await assert.rejects(validatePdfBuffer(malformed), { status: 400 });
});
