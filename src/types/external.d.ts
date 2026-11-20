declare module 'pdfkit' {
  export default class PDFDocument {
    constructor(options?: Record<string, unknown>);
    on(event: string, listener: (...args: any[]) => void): this;
    fontSize(size: number): this;
    text(text: string, options?: Record<string, unknown>): this;
    moveDown(lines?: number): this;
    end(): void;
  }
}

declare module 'pdf-parse/lib/pdf-parse.js' {
  export default function pdfParse(
    dataBuffer: Buffer
  ): Promise<{ text: string; numpages: number; info: Record<string, unknown> }>;
}
