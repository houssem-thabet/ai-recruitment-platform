import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import mammoth from 'mammoth';

export const ALLOWED_CV_EXTENSIONS = ['.pdf', '.docx'];
export const MAX_CV_SIZE_BYTES = Number(
  process.env.MAX_CV_FILE_SIZE_BYTES || 5 * 1024 * 1024
);

export type CVValidationErrorCode =
  | 'EMPTY_FILE'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_EXTENSION'
  | 'INVALID_SIGNATURE'
  | 'CORRUPT_DOCUMENT'
  | 'INSUFFICIENT_TEXT';

export class CVParseError extends Error {
  public readonly code: CVValidationErrorCode;

  constructor(code: CVValidationErrorCode, message: string) {
    super(message);
    this.name = 'CVParseError';
    this.code = code;
  }
}

export function getPrivateCVStorageDir(): string {
  return process.env.CV_STORAGE_DIR || path.join(process.cwd(), 'storage', 'cvs');
}

export interface FileValidationResult {
  valid: boolean;
  detectedType?: 'pdf' | 'docx';
  errorCode?: CVValidationErrorCode;
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
    return {
      valid: false,
      errorCode: 'EMPTY_FILE',
      error: 'Uploaded file is empty.',
    };
  }

  if (buffer.length > MAX_CV_SIZE_BYTES) {
    return {
      valid: false,
      errorCode: 'FILE_TOO_LARGE',
      error: `File exceeds maximum allowed size of ${Math.round(
        MAX_CV_SIZE_BYTES / (1024 * 1024)
      )} MB.`,
    };
  }

  const ext = path.extname(fileName || '').toLowerCase();
  if (!ALLOWED_CV_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      errorCode: 'UNSUPPORTED_EXTENSION',
      error:
        'Unsupported file format. Only PDF (.pdf) and Microsoft Word (.docx) files are accepted.',
    };
  }

  // Magic-byte verification for PDF (%PDF-)
  if (ext === '.pdf') {
    const header = buffer.subarray(0, 5).toString('ascii');
    if (header !== '%PDF-') {
      return {
        valid: false,
        errorCode: 'INVALID_SIGNATURE',
        error: 'Invalid PDF file signature. Please upload a genuine PDF document.',
      };
    }
    return { valid: true, detectedType: 'pdf' };
  }

  // Magic-byte verification for OOXML DOCX (ZIP local header PK\x03\x04)
  if (ext === '.docx') {
    if (
      buffer.length < 4 ||
      buffer[0] !== 0x50 ||
      buffer[1] !== 0x4b ||
      buffer[2] !== 0x03 ||
      buffer[3] !== 0x04
    ) {
      return {
        valid: false,
        errorCode: 'INVALID_SIGNATURE',
        error:
          'Invalid DOCX file signature. Please upload a genuine OOXML .docx document.',
      };
    }
    return { valid: true, detectedType: 'docx' };
  }

  return {
    valid: false,
    errorCode: 'UNSUPPORTED_EXTENSION',
    error: `Unsupported MIME type: ${mimeType || 'unknown'}`,
  };
}

const LIGATURE_MAP: Record<string, string> = {
  '\uFB00': 'ff',
  '\uFB01': 'fi',
  '\uFB02': 'fl',
  '\uFB03': 'ffi',
  '\uFB04': 'ffl',
  '\u2018': "'",
  '\u2019': "'",
  '\u201C': '"',
  '\u201D': '"',
  '\u00A0': ' ',
};

/**
 * Cleans PDF/DOCX extraction artifacts: ligatures, zero-width chars,
 * hyphenated line wraps, multi-column spacing, bullets, and page footers.
 */
export function normalizeExtractedCVText(raw: string): string {
  if (!raw) return '';

  let cleaned = raw
    // Strip BOM, null bytes, soft hyphens, and zero-width characters
    .replace(/[\uFEFF\u200B\u200C\u200D\u00AD\0]/g, '')
    // Expand typographic ligatures & normalize smart quotes
    .replace(/[\uFB00-\uFB04\u2018\u2019\u201C\u201D\u00A0]/g, (ch) => LIGATURE_MAP[ch] || ch)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Normalize diverse bullet glyphs to standard markdown dash bullets
    .replace(/^[ \t]*[•●▪◦▸►❖➢✦✓✔][ \t]*/gm, '- ')
    // Rejoin words split across PDF line breaks (e.g. "micro-\nservices" -> "microservices"),
    // while keeping intentional compound words or uppercase acronyms intact
    .replace(/([a-z]{3,})-\n\s*([a-z]{3,})/g, '$1$2')
    // Convert wide multi-column gaps (4+ spaces or tabs) on header/table lines into pipe separators
    .replace(/[ \t]{4,}/g, ' | ')
    .replace(/[ \t]+/g, ' ');

  const lines = cleaned
    .split('\n')
    .map((line) => line.trim())
    // Remove standalone page-number footer artifacts ("Page 1 of 2", "- 1 -")
    .filter((line) => !/^(?:page\s+\d+(?:\s+of\s+\d+)?|-\s*\d+\s*-)$/i.test(line));

  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Pure-Node fallback extractor that decodes uncompressed and FlateDecode PDF
 * text streams (BT ... ET Tj / TJ operators) if pdf.js encounters non-standard XRef tables.
 */
function extractTextFromPdfStreamsFallback(buffer: Buffer): string {
  const rawLatin1 = buffer.toString('latin1');
  const collected: string[] = [];

  const extractStringLiteralsFromBT = (content: string) => {
    const btBlocks = content.match(/BT[\s\S]*?ET/g) || [content];
    for (const block of btBlocks) {
      const lines: string[] = [];
      // Match parenthesized PDF strings (...) and TJ arrays [...]
      const tokenRx = /\((?:\\.|[^\\()])*\)|\[[^\]]*\]\s*TJ/g;
      let m: RegExpExecArray | null;
      while ((m = tokenRx.exec(block)) !== null) {
        const tok = m[0];
        const innerRx = /\(((?:\\.|[^\\()])*)\)/g;
        let im: RegExpExecArray | null;
        let lineChunk = '';
        while ((im = innerRx.exec(tok)) !== null) {
          lineChunk += im[1]
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '')
            .replace(/\\t/g, ' ')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\\\/g, '\\');
        }
        if (lineChunk.trim()) lines.push(lineChunk);
      }
      if (lines.length > 0) collected.push(lines.join(' '));
    }
  };

  const streamRx = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let sm: RegExpExecArray | null;
  while ((sm = streamRx.exec(rawLatin1)) !== null) {
    const streamBytes = Buffer.from(sm[1], 'latin1');
    try {
      const inflated = zlib.inflateSync(streamBytes).toString('latin1');
      extractStringLiteralsFromBT(inflated);
    } catch {
      extractStringLiteralsFromBT(sm[1]);
    }
  }

  return normalizeExtractedCVText(collected.join('\n'));
}

export interface ParsedCVDocument {
  text: string;
  detectedType: 'pdf' | 'docx';
  pageCount?: number;
  wordCount: number;
  parserUsed: 'pdf-parse' | 'pdf-stream-fallback' | 'mammoth-docx';
}

export async function parseCVDocument(
  fileName: string,
  buffer: Buffer,
  mimeType?: string
): Promise<ParsedCVDocument> {
  const validation = validateCVFileBuffer(fileName, buffer, mimeType);
  if (!validation.valid || !validation.detectedType) {
    throw new CVParseError(
      validation.errorCode || 'UNSUPPORTED_EXTENSION',
      validation.error || 'Invalid CV document.'
    );
  }

  if (validation.detectedType === 'pdf') {
    let text = '';
    let pageCount: number | undefined;
    let parserUsed: ParsedCVDocument['parserUsed'] = 'pdf-parse';

    try {
      // Convert Node Buffer to standalone Uint8Array (byteOffset === 0) so pdf.js
      // never misreads offsets from Node's shared 8KB slab ArrayBuffer pool.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse/lib/pdf-parse.js');
      const parsed = await pdfParse(Uint8Array.from(buffer));
      text = normalizeExtractedCVText(parsed?.text || '');
      pageCount = typeof parsed?.numpages === 'number' ? parsed.numpages : undefined;
    } catch {
      text = extractTextFromPdfStreamsFallback(buffer);
      parserUsed = 'pdf-stream-fallback';
    }

    if (!text || text.length < 10) {
      const fallbackText = extractTextFromPdfStreamsFallback(buffer);
      if (fallbackText.length > text.length) {
        text = fallbackText;
        parserUsed = 'pdf-stream-fallback';
      }
    }

    if (!text) {
      throw new CVParseError(
        'CORRUPT_DOCUMENT',
        'Could not extract readable text from PDF document.'
      );
    }

    return {
      text,
      detectedType: 'pdf',
      pageCount,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      parserUsed,
    };
  }

  // DOCX extraction via Mammoth
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = normalizeExtractedCVText(result?.value || '');
    if (!text) {
      throw new CVParseError(
        'CORRUPT_DOCUMENT',
        'Could not extract readable text from DOCX document.'
      );
    }
    return {
      text,
      detectedType: 'docx',
      wordCount: text.split(/\s+/).filter(Boolean).length,
      parserUsed: 'mammoth-docx',
    };
  } catch (err) {
    if (err instanceof CVParseError) throw err;
    throw new CVParseError(
      'CORRUPT_DOCUMENT',
      'Malformed or unreadable .docx archive.'
    );
  }
}

export async function extractTextFromCVBuffer(
  buffer: Buffer,
  detectedType: 'pdf' | 'docx'
): Promise<string> {
  const syntheticName = detectedType === 'pdf' ? 'document.pdf' : 'document.docx';
  const parsed = await parseCVDocument(syntheticName, buffer);
  return parsed.text;
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
