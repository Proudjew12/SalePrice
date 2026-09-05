import { DEFAULT_PRODUCTS } from "./data";
import type { CatalogLicense, CatalogProduct, CatalogSnapshot } from "./types";
import { copyCatalog, isCatalogSnapshot, isRecord, validCatalogName, validShortName } from "./validation";

export const LEGACY_CATALOG_STORAGE_KEY = "saleprice.catalog.v1";
export const LEGACY_STORED_CHARACTERS = 80_000;

interface LegacyCatalog {
  version: 1;
  products: CatalogProduct[];
  licenses: { productId: string; license: CatalogLicense }[];
}

function isCustomId(value: unknown): value is string {
  return typeof value === "string" && /^custom-[a-z0-9-]{1,80}$/.test(value);
}

function isLegacyLicense(value: unknown): value is CatalogLicense {
  return isRecord(value) && isCustomId(value.id) && validCatalogName(value.name);
}

function isLegacyProduct(value: unknown): value is CatalogProduct {
  return isRecord(value) && isCustomId(value.id) && validCatalogName(value.name) &&
    validShortName(value.shortName) && Array.isArray(value.licenses) &&
    value.licenses.length === 1 && value.licenses.every(isLegacyLicense);
}

function isExtraLicense(value: unknown): value is LegacyCatalog["licenses"][number] {
  return isRecord(value) && typeof value.productId === "string" && isLegacyLicense(value.license);
}

/** Retain the v1 limits and validate all references before combining it with the original defaults. */
export function migrateLegacyCatalog(value: unknown): CatalogSnapshot | null {
  if (!isRecord(value) || value.version !== 1 ||
    !Array.isArray(value.products) || value.products.length > 20 ||
    !value.products.every(isLegacyProduct) ||
    !Array.isArray(value.licenses) || value.licenses.length > 100 ||
    !value.licenses.every(isExtraLicense)) {
    return null;
  }
  const source: LegacyCatalog = { version: 1, products: value.products, licenses: value.licenses };
  const products = [...DEFAULT_PRODUCTS, ...source.products];
  if (!source.licenses.every((entry) => products.some((product) => product.id === entry.productId))) {
    return null;
  }
  const snapshot: CatalogSnapshot = {
    version: 2,
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      shortName: product.shortName,
      // v1 stored names only; ignore unknown legacy fields rather than treating them as prices.
      licenses: [
        ...product.licenses,
        ...source.licenses.filter((entry) => entry.productId === product.id).map((entry) => entry.license),
      ].map((license) => ({ id: license.id, name: license.name })),
    })),
  };
  return snapshot.products.every((product) => product.licenses.length <= 30) &&
    isCatalogSnapshot(snapshot) ? copyCatalog(snapshot.products) : null;
}
