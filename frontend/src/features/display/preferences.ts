export const TEXT_SIZES = [90, 100, 110, 120] as const;
export type TextSize = typeof TEXT_SIZES[number];

const STORAGE_KEY = "saleprice.display.v1";

export function isTextSize(value: unknown): value is TextSize {
  return TEXT_SIZES.some((size) => size === value);
}

export function loadTextSize(): TextSize {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null || stored.length > 100) return 100;
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed === "object" && parsed !== null && "textSize" in parsed && isTextSize(parsed.textSize)) {
      return parsed.textSize;
    }
  } catch {
    // Unavailable storage or invalid preferences must not prevent using the app.
  }
  return 100;
}

export function saveTextSize(textSize: TextSize): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ textSize }));
    return true;
  } catch {
    return false;
  }
}
