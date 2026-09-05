import type { jsPDF } from "jspdf";

let fontData: string | undefined;

export async function loadPdfFont(): Promise<string> {
  if (fontData !== undefined) return fontData;
  const response = await fetch(`${import.meta.env.BASE_URL}fonts/DejaVuSans.ttf`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("The PDF font could not be loaded. Please try again.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (
    bytes.length > 2_000_000 ||
    bytes[0] !== 0 || bytes[1] !== 1 || bytes[2] !== 0 || bytes[3] !== 0
  ) {
    throw new Error("The PDF font could not be loaded. Please try again.");
  }
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 8192)));
  }
  fontData = btoa(chunks.join(""));
  return fontData;
}

export function registerPdfFont(document: jsPDF, data: string): void {
  document.addFileToVFS("DejaVuSans.ttf", data);
  document.addFont("DejaVuSans.ttf", "DejaVuSans", "normal");
  document.setFont("DejaVuSans", "normal");
}
