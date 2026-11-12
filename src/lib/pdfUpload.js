const MAX_PDF_BYTES = 10 * 1024 * 1024;

export function validatePdfBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 40) {
    const error = new Error('PDF is empty or too small to be valid.');
    error.status = 400;
    throw error;
  }
  if (buffer.subarray(0, 8).toString('ascii').indexOf('%PDF-') !== 0) {
    const error = new Error('Invalid PDF header.');
    error.status = 400;
    throw error;
  }
  if (buffer.length > MAX_PDF_BYTES) {
    const error = new Error('PDF limit is 10 MB.');
    error.status = 413;
    throw error;
  }

  const tail = buffer.subarray(Math.max(0, buffer.length - 1024)).toString('latin1');
  if (!/%%EOF\s*$/.test(tail)) {
    const error = new Error('PDF is incomplete or truncated.');
    error.status = 400;
    throw error;
  }

  const document = buffer.toString('latin1');
  if (!/\/Type\s*\/Pages?\b/.test(document)) {
    const error = new Error('PDF does not contain a page tree.');
    error.status = 400;
    throw error;
  }
  return true;
}
