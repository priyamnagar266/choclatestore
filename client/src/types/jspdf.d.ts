// Minimal type shim for jspdf to silence TS errors.
// If @types/jspdf becomes available / installed, this file can be removed.

declare module 'jspdf' {
  export class jsPDF {
    constructor(options?: any);
    setFontSize(size: number): void;
    setFont(family: string, style?: string): void;
    text(text: string | string[], x: number, y: number): void;
    splitTextToSize(text: string, size: number): string[];
    addPage(): void;
    save(filename?: string): void;
  }
  // CommonJS default interop fallback
  const _default: { new(options?: any): jsPDF };
  export default _default;
}
