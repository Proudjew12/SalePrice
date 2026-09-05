import { useState } from "react";

import { catalogProducts, loadCatalog, saveCatalog, validCatalogName } from "../storage";
import { CATALOG_LIMITS } from "../types";
import type { CatalogChangeResult, CatalogProduct, CustomCatalog } from "../types";

export function useCatalog() {
  const [state, setState] = useState(loadCatalog);
  const products = catalogProducts(state.custom);

  function commit(custom: CustomCatalog): void {
    const saved = saveCatalog(custom);
    setState({ custom, warning: saved ? null : "Your catalog is available for this visit, but could not be saved on this device." });
  }

  function addProduct(name: string, firstLicense: string): CatalogChangeResult {
    const productName = name.trim();
    const licenseName = firstLicense.trim();
    if (!validCatalogName(productName) || !validCatalogName(licenseName)) {
      return { ok: false, message: "Enter a product and license name, each up to 80 characters." };
    }
    if (state.custom.products.length >= CATALOG_LIMITS.customProducts) {
      return { ok: false, message: "You can add up to 20 custom products on this device." };
    }
    if (products.some((product) => product.name.toLowerCase() === productName.toLowerCase())) {
      return { ok: false, message: "A product with this name already exists." };
    }
    const product: CatalogProduct = {
      id: `custom-${crypto.randomUUID()}`,
      name: productName,
      shortName: [...productName.replace(/\s+/g, "").toUpperCase()].slice(0, 2).join(""),
      licenses: [{ id: `custom-${crypto.randomUUID()}`, name: licenseName }],
    };
    commit({ ...state.custom, products: [...state.custom.products, product] });
    return { ok: true, productId: product.id };
  }

  function addLicense(productId: string, name: string): CatalogChangeResult {
    const licenseName = name.trim();
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) return { ok: false, message: "Select a product before adding a license." };
    if (!validCatalogName(licenseName)) return { ok: false, message: "Enter a license name up to 80 characters." };
    if (product.licenses.some((license) => license.name.toLowerCase() === licenseName.toLowerCase())) {
      return { ok: false, message: "This product already has a license with that name." };
    }
    if (product.licenses.length >= CATALOG_LIMITS.licensesPerProduct ||
      state.custom.licenses.length >= CATALOG_LIMITS.extraLicenses) {
      return { ok: false, message: "The catalog supports 30 licenses per product and 100 additional licenses." };
    }
    commit({
      ...state.custom,
      licenses: [...state.custom.licenses, { productId, license: { id: `custom-${crypto.randomUUID()}`, name: licenseName } }],
    });
    return { ok: true, productId };
  }

  return { products, warning: state.warning, addProduct, addLicense };
}
