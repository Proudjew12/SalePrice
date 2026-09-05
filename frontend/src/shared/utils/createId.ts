export function createId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  // Local HTTP previews do not expose randomUUID, but support random bytes.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
