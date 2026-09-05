import type { BillingOption } from "@/features/quotes/types";

export type LicensePrices = Record<BillingOption, string>;

export interface CatalogLicense {
  id: string;
  name: string;
  prices?: LicensePrices;
}

export interface CatalogProduct {
  id: string;
  name: string;
  shortName: string;
  licenses: CatalogLicense[];
}

export interface CatalogSnapshot {
  version: 2;
  products: CatalogProduct[];
}

export type CatalogChangeResult =
  | { ok: true; productId: string }
  | { ok: false; message: string };

export const CATALOG_LIMITS = {
  name: 80,
  shortName: 4,
  products: 50,
  licensesPerProduct: 100,
  licenses: 2000,
  storedCharacters: 1_000_000,
} as const;
