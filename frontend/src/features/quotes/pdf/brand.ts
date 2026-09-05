const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

export async function loadPdfLogo(): Promise<Uint8Array> {
  const response = await fetch(`${import.meta.env.BASE_URL}branding/logi-logo.png`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("The PDF logo could not be loaded. Please try again.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length < 33 || bytes.length > 1_000_000 ||
    !PNG_SIGNATURE.every((value, index) => bytes[index] === value)) {
    throw new Error("The PDF logo could not be loaded. Please try again.");
  }
  const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = header.getUint32(16);
  const height = header.getUint32(20);
  if (header.getUint32(8) !== 13 || header.getUint32(12) !== 0x49484452 ||
    width === 0 || height === 0 || width > 4096 || height > 4096 || width * height > 8_000_000) {
    throw new Error("The PDF logo could not be loaded. Please try again.");
  }
  // jsPDF validates the image payload when it decodes it. Do not retain bytes from a failed export.
  return bytes;
}
