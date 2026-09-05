import type { jsPDF } from "jspdf";

const LEFT = 18;
const RIGHT = 192;
const BOTTOM = 272;
const LINE_HEIGHT = 5;

export function cleanPdfText(value: string): string {
  return Array.from(value.replaceAll("\r\n", "\n").replaceAll("\t", " "))
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return character === "\n" || (code >= 32 && code !== 127);
    })
    .join("");
}

function isRtl(value: string): boolean {
  const firstLetter = Array.from(value).find((character) => /\p{Letter}/u.test(character));
  return firstLetter !== undefined && /[\u0590-\u08ff]/u.test(firstLetter);
}

export class QuotePdfLayout {
  y = 28;

  constructor(private readonly document: jsPDF, private readonly reference: string) {}

  ensureSpace(height: number): void {
    if (this.y + height <= BOTTOM) return;
    this.document.addPage();
    this.document.setFontSize(9);
    this.document.setTextColor(105, 114, 130);
    this.document.text("SalePrice / Quote", LEFT, 17);
    const referenceLines = this.wrap(this.reference, 102, 8);
    referenceLines.forEach((line, index) => {
      const width = this.document.getTextWidth(line);
      this.text(line, RIGHT - width, 17 + index * 4, width, 8);
    });
    this.y = Math.max(30, 22 + referenceLines.length * 4);
  }

  text(value: string, x: number, y: number, width: number, size = 10): void {
    const text = cleanPdfText(value);
    const rtl = isRtl(text);
    this.document.setFontSize(size);
    this.document.text(text, rtl ? x + width : x, y, {
      align: rtl ? "right" : "left",
      isInputVisual: false,
      isOutputVisual: true,
      isInputRtl: rtl,
      isOutputRtl: false,
    });
  }

  wrap(value: string, width = RIGHT - LEFT, size = 10): string[] {
    this.document.setFontSize(size);
    const result: unknown = this.document.splitTextToSize(cleanPdfText(value), width);
    if (!Array.isArray(result) || !result.every((line): line is string => typeof line === "string")) {
      throw new Error("The PDF text could not be prepared. Please try again.");
    }
    return result;
  }

  paragraph(value: string, size = 10, color: [number, number, number] = [40, 49, 66]): void {
    const lines = this.wrap(value, RIGHT - LEFT, size);
    const lineHeight = Math.max(LINE_HEIGHT, size * 0.5);
    this.document.setTextColor(...color);
    for (const line of lines) {
      this.ensureSpace(lineHeight);
      this.document.setTextColor(...color);
      this.text(line, LEFT, this.y, RIGHT - LEFT, size);
      this.y += lineHeight;
    }
  }

  label(value: string): void {
    this.ensureSpace(12);
    this.paragraph(value.toUpperCase(), 8, [105, 114, 130]);
    this.y += 1;
  }

  rule(): void {
    this.document.setDrawColor(223, 228, 236);
    this.document.line(LEFT, this.y, RIGHT, this.y);
    this.y += 7;
  }

  amount(label: string, amount: string, emphasis = false): void {
    this.ensureSpace(11);
    const size = emphasis ? 12 : 10;
    this.document.setTextColor(40, 49, 66);
    this.text(label, LEFT, this.y, 92, size);
    this.document.setFontSize(size);
    const width = this.document.getTextWidth(amount);
    this.document.text(amount, RIGHT, this.y, {
      align: "right",
      horizontalScale: width > 70 ? 70 / width : 1,
    });
    this.y += emphasis ? 11 : 8;
  }

  finish(): void {
    const count = this.document.getNumberOfPages();
    for (let page = 1; page <= count; page += 1) {
      this.document.setPage(page);
      this.document.setFontSize(8);
      this.document.setTextColor(105, 114, 130);
      this.document.text("SalePrice | USD | Taxes not included", LEFT, 285);
      this.document.text(`${page} / ${count}`, RIGHT, 285, { align: "right" });
    }
  }
}
