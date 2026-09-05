export interface CatalogLicense {
  id: string;
  name: string;
}

export interface CatalogProduct {
  id: string;
  name: string;
  shortName: string;
  licenses: CatalogLicense[];
}

export interface CustomCatalog {
  version: 1;
  products: CatalogProduct[];
  licenses: { productId: string; license: CatalogLicense }[];
}

export type CatalogChangeResult =
  | { ok: true; productId: string }
  | { ok: false; message: string };

export const CATALOG_LIMITS = {
  name: 80,
  customProducts: 20,
  extraLicenses: 100,
  licensesPerProduct: 30,
} as const;
