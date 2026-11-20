import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import mammoth from 'mammoth';

export const ALLOWED_CV_EXTENSIONS = ['.pdf', '.docx'];
export const MAX_CV_SIZE_BYTES = Number(process.env.MAX_CV_FILE_SIZE_BYTES || 5 * 1024 * 1024);

export function getPrivateCVStorageDir(): string {
  return process.env.CV_STORAGE_DIR || path.join(process.cwd(), 'storage', 'cvs');
}

export interface FileValidationResult {
  valid: boolean;
  detectedType?: 'pdf' | 'docx';
  error?: string;
}

/**
 * Validates file extension, size, AND magic-byte binary header signature.
 */
export function validateCVFileBuffer(
  fileName: string,
  buffer: Buffer,
  mimeType?: string
): FileValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'Uploaded file is empty.' };
  }

  if (buffer.length > MAX_CV_SIZE_BYTES) {
    return {
      valid: false,
      error: `File exceeds maximum allowed size of ${Math.round(MAX_CV_SIZE_BYTES / (1024 * 1024))} MB.`,
    };
  }

  const ext = path.extname(fileName || '').toLowerCase();
  if (!ALLOWED_CV_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: 'Unsupported file format. Only PDF (.pdf) and Microsoft Word (.docx) files are accepted.',
    };
  }

  // Magic-byte verification
  if (ext === '.pdf') {
    const header = buffer.subarray(0, 5).toString('ascii');
    if (header !== '%PDF-') {
      return {
        valid: false,
        error: 'Invalid PDF file signature. Please upload a genuine PDF document.',
      };
    }
    return { valid: true, detectedType: 'pdf' };
  }

  if (ext === '.docx') {
    // DOCX is an OOXML ZIP archive starting with PK\x03\x04
    if (
      buffer.length < 4 ||
      buffer[0] !== 0x50 ||
      buffer[1] !== 0x4b ||
      buffer[2] !== 0x03 ||
      buffer[3] !== 0x04
    ) {
      return {
        valid: false,
        error: 'Invalid DOCX file signature. Please upload a genuine OOXML .docx document.',
      };
    }
    return { valid: true, detectedType: 'docx' };
  }

  return { valid: false, error: `Unsupported MIME type: ${mimeType || 'unknown'}` };
}

export function normalizeExtractedCVText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[•●▪◦]/g, '- ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

export async function extractTextFromCVBuffer(
  buffer: Buffer,
  detectedType: 'pdf' | 'docx'
): Promise<string> {
  if (detectedType === 'pdf') {
    // Import internal lib directly to avoid pdf-parse's CLI test-file side effect.
    // Convert Node Buffer to a standalone Uint8Array (byteOffset === 0) so pdf.js
    // never misreads offsets from Node's shared 8KB slab ArrayBuffer pool.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse/lib/pdf-parse.js');
    const parsed = await pdfParse(Uint8Array.from(buffer));
    return normalizeExtractedCVText(parsed?.text || '');
  }

  if (detectedType === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    return normalizeExtractedCVText(result?.value || '');
  }

  throw new Error('Unsupported document type for extraction.');
}

export async function savePrivateCVFile(
  candidateProfileId: string,
  originalName: string,
  buffer: Buffer
): Promise<{ fileName: string; storagePath: string }> {
  const dir = getPrivateCVStorageDir();
  await fs.mkdir(dir, { recursive: true });

  const ext = path.extname(originalName).toLowerCase();
  const safeSlug = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 48);
  const uniqueId = crypto.randomBytes(8).toString('hex');
  const fileName = `${candidateProfileId}_${safeSlug}_${uniqueId}${ext}`;
  const storagePath = path.join(dir, fileName);

  await fs.writeFile(storagePath, buffer, { mode: 0o600 });
  return { fileName, storagePath };
}
