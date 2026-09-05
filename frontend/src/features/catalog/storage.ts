import { DEFAULT_PRODUCTS } from "./data";
import { LEGACY_CATALOG_STORAGE_KEY, LEGACY_STORED_CHARACTERS, migrateLegacyCatalog } from "./migration";
import { CATALOG_LIMITS } from "./types";
import type { CatalogSnapshot } from "./types";
import { copyCatalog, isCatalogSnapshot } from "./validation";

export const CATALOG_STORAGE_KEY = "saleprice.catalog.v2";
const UNSAVED_WARNING = "Your catalog is available for this visit, but could not be saved on this device.";

interface CatalogState {
  catalog: CatalogSnapshot;
  warning: string | null;
}

function fallbackCatalog(warning: string | null): CatalogState {
  return { catalog: copyCatalog(DEFAULT_PRODUCTS), warning };
}

export function loadCatalog(): CatalogState {
  try {
    const stored = localStorage.getItem(CATALOG_STORAGE_KEY);
    if (stored !== null) {
      if (stored.length <= CATALOG_LIMITS.storedCharacters) {
        const parsed: unknown = JSON.parse(stored);
        if (isCatalogSnapshot(parsed)) return { catalog: copyCatalog(parsed.products), warning: null };
      }
      return fallbackCatalog("Saved products could not be read. The default catalog is available.");
    }

    const legacy = localStorage.getItem(LEGACY_CATALOG_STORAGE_KEY);
    if (legacy === null) return fallbackCatalog(null);
    if (legacy.length <= LEGACY_STORED_CHARACTERS) {
      const parsed: unknown = JSON.parse(legacy);
      const catalog = migrateLegacyCatalog(parsed);
      if (catalog) {
        // Keep the v1 source intact for recovery. A saved v2 snapshot takes precedence on later visits.
        const saved = saveCatalog(catalog);
        return { catalog, warning: saved ? null : UNSAVED_WARNING };
      }
    }
    return fallbackCatalog("Saved products could not be read. The default catalog is available.");
  } catch {
    return fallbackCatalog("Saved products are unavailable. Catalog changes may not be kept after you leave.");
  }
}

export function saveCatalog(catalog: CatalogSnapshot): boolean {
  if (!isCatalogSnapshot(catalog)) return false;
  try {
    const serialized = JSON.stringify(copyCatalog(catalog.products));
    if (serialized.length > CATALOG_LIMITS.storedCharacters) return false;
    localStorage.setItem(CATALOG_STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}
