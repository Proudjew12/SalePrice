import type { jsPDF } from "jspdf";

export interface PdfFonts {
  normal: string;
  bold: string;
}

let fontData: PdfFonts | undefined;

async function fetchFont(filename: string): Promise<string> {
  const response = await fetch(`${import.meta.env.BASE_URL}fonts/${filename}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("The PDF font could not be loaded. Please try again.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (
    bytes.length < 12 || bytes.length > 2_000_000 ||
    bytes[0] !== 0 || bytes[1] !== 1 || bytes[2] !== 0 || bytes[3] !== 0
  ) {
    throw new Error("The PDF font could not be loaded. Please try again.");
  }
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 8192)));
  }
  return btoa(chunks.join(""));
}

export async function loadPdfFonts(): Promise<PdfFonts> {
  if (fontData !== undefined) return fontData;
  const [normal, bold] = await Promise.all([
    fetchFont("DejaVuSans.ttf"),
    fetchFont("DejaVuSans-Bold.ttf"),
  ]);
  return { normal, bold };
}

export function registerPdfFonts(document: jsPDF, fonts: PdfFonts): void {
  document.addFileToVFS("DejaVuSans.ttf", fonts.normal);
  document.addFileToVFS("DejaVuSans-Bold.ttf", fonts.bold);
  document.addFont("DejaVuSans.ttf", "DejaVuSans", "normal");
  document.addFont("DejaVuSans-Bold.ttf", "DejaVuSans", "bold");
  // jsPDF parses font tables on registration. Check both before retaining fetched bytes for reuse.
  for (const style of ["normal", "bold"]) {
    document.setFont("DejaVuSans", style);
    const width = document.getTextWidth("Aa 0123456789");
    if (!Number.isFinite(width) || width <= 0) {
      throw new Error("The PDF font could not be loaded. Please try again.");
    }
  }
  fontData = fonts;
  document.setFont("DejaVuSans", "normal");
}
