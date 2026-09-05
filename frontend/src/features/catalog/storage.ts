import { DEFAULT_PRODUCTS } from "./data";
import { CATALOG_LIMITS } from "./types";
import type { CatalogLicense, CatalogProduct, CustomCatalog } from "./types";

export const CATALOG_STORAGE_KEY = "saleprice.catalog.v1";
const MAX_STORED_CHARACTERS = 80_000;

export function validCatalogName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value === value.trim() &&
    value.length <= CATALOG_LIMITS.name &&
    [...value].every((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code >= 32 && code !== 127;
    });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCustomId(value: unknown): value is string {
  return typeof value === "string" && /^custom-[a-z0-9-]{1,80}$/.test(value);
}

function isLicense(value: unknown): value is CatalogLicense {
  return isRecord(value) && isCustomId(value.id) && validCatalogName(value.name);
}

function isProduct(value: unknown): value is CatalogProduct {
  return isRecord(value) && isCustomId(value.id) && validCatalogName(value.name) &&
    validCatalogName(value.shortName) && value.shortName.length <= 4 &&
    Array.isArray(value.licenses) && value.licenses.length === 1 && value.licenses.every(isLicense);
}

function emptyCatalog(): CustomCatalog {
  return { version: 1, products: [], licenses: [] };
}

function isExtraLicense(value: unknown): value is CustomCatalog["licenses"][number] {
  return isRecord(value) && typeof value.productId === "string" && isLicense(value.license);
}

export function catalogProducts(custom: CustomCatalog): CatalogProduct[] {
  return [...DEFAULT_PRODUCTS, ...custom.products].map((product) => ({
    ...product,
    licenses: [
      ...product.licenses,
      ...custom.licenses.filter((entry) => entry.productId === product.id).map((entry) => entry.license),
    ],
  }));
}

function isCustomCatalog(value: unknown): value is CustomCatalog {
  if (!isRecord(value) || value.version !== 1 ||
    !Array.isArray(value.products) || value.products.length > CATALOG_LIMITS.customProducts ||
    !value.products.every(isProduct) ||
    !Array.isArray(value.licenses) || value.licenses.length > CATALOG_LIMITS.extraLicenses ||
    !value.licenses.every(isExtraLicense)) {
    return false;
  }
  const products: CatalogProduct[] = [...DEFAULT_PRODUCTS, ...value.products];
  if (!value.licenses.every((entry) => products.some((product) => product.id === entry.productId))) {
    return false;
  }
  const custom: CustomCatalog = { version: 1, products: value.products, licenses: value.licenses };
  const allProducts = catalogProducts(custom);
  const productNames = new Set(allProducts.map((product) => product.name.trim().toLowerCase()));
  const productIds = new Set(allProducts.map((product) => product.id));
  const licenses = allProducts.flatMap((product) => product.licenses);
  return productNames.size === allProducts.length && productIds.size === allProducts.length &&
    new Set(licenses.map((license) => license.id)).size === licenses.length &&
    allProducts.every((product) => product.licenses.length <= CATALOG_LIMITS.licensesPerProduct &&
      new Set(product.licenses.map((license) => license.name.trim().toLowerCase())).size === product.licenses.length);
}

export function loadCatalog(): { custom: CustomCatalog; warning: string | null } {
  try {
    const stored = localStorage.getItem(CATALOG_STORAGE_KEY);
    if (stored === null) return { custom: emptyCatalog(), warning: null };
    if (stored.length <= MAX_STORED_CHARACTERS) {
      const parsed: unknown = JSON.parse(stored);
      if (isCustomCatalog(parsed)) return { custom: parsed, warning: null };
    }
    return { custom: emptyCatalog(), warning: "Saved products could not be read. The default catalog is available." };
  } catch {
    return { custom: emptyCatalog(), warning: "Saved products are unavailable. New products may not be kept after you leave." };
  }
}

export function saveCatalog(custom: CustomCatalog): boolean {
  if (!isCustomCatalog(custom)) return false;
  try {
    localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(custom));
    return true;
  } catch {
    return false;
  }
}
