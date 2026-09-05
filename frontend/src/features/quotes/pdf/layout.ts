import type { jsPDF } from "jspdf";

export type PdfColor = [number, number, number];
export type PdfWeight = "normal" | "bold";

export const PDF_PAGE = { left: 18, right: 192, width: 174, bottom: 273 };
export const PDF_COLORS = {
  ink: [48, 58, 64] as PdfColor,
  muted: [103, 117, 124] as PdfColor,
  accent: [50, 192, 204] as PdfColor,
  line: [216, 226, 230] as PdfColor,
  soft: [244, 247, 248] as PdfColor,
};

export function cleanPdfText(value: string): string {
  return Array.from(value.replaceAll("\r\n", "\n").replaceAll("\t", " "))
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return character === "\n" || (code >= 32 && code !== 127);
    }).join("");
}

export function cleanPdfField(value: string): string {
  return cleanPdfText(value).replace(/\s+/gu, " ").trim();
}

function isRtl(value: string): boolean {
  const firstLetter = Array.from(value).find((character) => /\p{Letter}/u.test(character));
  return firstLetter !== undefined && /[\u0590-\u08ff]/u.test(firstLetter);
}

export class QuotePdfLayout {
  y = 20;

  constructor(
    readonly document: jsPDF,
    private readonly reference: string,
    private readonly logo: Uint8Array,
  ) {}

  font(size: number, weight: PdfWeight = "normal", color: PdfColor = PDF_COLORS.ink): void {
    this.document.setFont("DejaVuSans", weight);
    this.document.setFontSize(size);
    this.document.setTextColor(...color);
  }

  text(value: string, x: number, y: number, width: number, size = 9,
    weight: PdfWeight = "normal", color: PdfColor = PDF_COLORS.ink): void {
    const text = cleanPdfText(value);
    const rtl = isRtl(text);
    this.font(size, weight, color);
    this.document.text(text, rtl ? x + width : x, y, {
      align: rtl ? "right" : "left",
      isInputVisual: false, isOutputVisual: true, isInputRtl: rtl, isOutputRtl: false,
    });
  }

  right(value: string, x: number, y: number, width: number, size = 9,
    weight: PdfWeight = "normal", color: PdfColor = PDF_COLORS.ink): void {
    const text = cleanPdfText(value);
    this.font(size, weight, color);
    const textWidth = this.document.getTextWidth(text);
    if (textWidth > width) this.document.setFontSize(size * width / textWidth);
    this.document.text(text, x + width, y, {
      align: "right",
      isInputVisual: false, isOutputVisual: true, isInputRtl: isRtl(text), isOutputRtl: false,
    });
  }

  wrap(value: string, width = PDF_PAGE.width, size = 9, weight: PdfWeight = "normal"): string[] {
    this.font(size, weight);
    const result: unknown = this.document.splitTextToSize(cleanPdfText(value), width);
    if (!Array.isArray(result) || !result.every((line): line is string => typeof line === "string")) {
      throw new Error("The PDF text could not be prepared. Please try again.");
    }
    return result;
  }

  logoAt(x: number, y: number, width: number): void {
    this.document.addImage(this.logo, "PNG", x, y, width, width * 300 / 800, "logi-logo", "FAST");
  }

  rule(y = this.y, x = PDF_PAGE.left, width = PDF_PAGE.width, accent = false): void {
    this.document.setDrawColor(...(accent ? PDF_COLORS.accent : PDF_COLORS.line));
    this.document.setLineWidth(accent ? 0.55 : 0.2);
    this.document.line(x, y, x + width, y);
  }

  fill(x: number, y: number, width: number, height: number, color = PDF_COLORS.soft): void {
    this.document.setFillColor(...color);
    this.document.rect(x, y, width, height, "F");
  }

  ensureSpace(height: number): boolean {
    if (this.y + height <= PDF_PAGE.bottom) return false;
    this.document.addPage();
    this.logoAt(PDF_PAGE.left - 0.5, 12, 34);
    this.right("SOFTWARE LICENSE QUOTATION", 97, 17, 95, 8, "bold");
    const references = this.wrap(this.reference, 85, 7.5);
    references.forEach((line, index) => this.right(line, 107, 23 + index * 4, 85, 7.5, "normal", PDF_COLORS.muted));
    this.y = Math.max(34, 29 + references.length * 4);
    this.rule(this.y - 4);
    return true;
  }

  paragraph(value: string, size = 9, color = PDF_COLORS.ink): void {
    const height = size * 0.3528 * 1.5;
    for (const line of this.wrap(value, PDF_PAGE.width, size)) {
      this.ensureSpace(height);
      this.text(line, PDF_PAGE.left, this.y, PDF_PAGE.width, size, "normal", color);
      this.y += height;
    }
  }

  label(value: string): void {
    this.ensureSpace(13);
    this.text(value.toUpperCase(), PDF_PAGE.left, this.y, PDF_PAGE.width, 7.5, "bold", PDF_COLORS.muted);
    this.y += 7;
  }

  finish(): void {
    const count = this.document.getNumberOfPages();
    for (let page = 1; page <= count; page += 1) {
      this.document.setPage(page);
      this.rule(282);
      this.text("Logi", PDF_PAGE.left, 288, 12, 8, "bold");
      this.text("www.logi-ltd.co.il", 33, 288, 70, 7.5, "normal", PDF_COLORS.muted);
      this.right(`Page ${page} of ${count}`, 147, 288, 45, 7.5, "normal", PDF_COLORS.muted);
    }
  }
}
