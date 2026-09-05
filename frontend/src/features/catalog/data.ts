import type { CatalogProduct } from "./types";

// User-requested demonstration entry, not an official Acronis plan or price.
export const ACRONIS_EXAMPLE: CatalogProduct = {
  id: "acronis",
  name: "Acronis",
  shortName: "Acr",
  licenses: [{ id: "acronis-example", name: "Example license" }],
};

// A starter selection of license names, verified on the vendors' official pages.
// These definitions are not a live catalog and deliberately contain no vendor prices.
// Microsoft: https://www.microsoft.com/en-us/microsoft-365/business/microsoft-365-plans-and-pricing
// Google: https://workspace.google.com/pricing.html
// Adobe: https://www.adobe.com/acrobat/pricing.html
// Zoom: https://www.zoom.com/en/products/collaboration-tools/
export const DEFAULT_PRODUCTS: CatalogProduct[] = [
  {
    id: "microsoft-365",
    name: "Microsoft 365",
    shortName: "M365",
    licenses: [
      { id: "m365-business-basic", name: "Business Basic" },
      { id: "m365-business-standard", name: "Business Standard" },
      { id: "m365-business-premium", name: "Business Premium" },
    ],
  },
  {
    id: "google-workspace",
    name: "Google Workspace",
    shortName: "GW",
    licenses: [
      { id: "workspace-business-starter", name: "Business Starter" },
      { id: "workspace-business-standard", name: "Business Standard" },
      { id: "workspace-business-plus", name: "Business Plus" },
    ],
  },
  {
    id: "adobe-acrobat",
    name: "Adobe Acrobat",
    shortName: "Ac",
    licenses: [
      { id: "acrobat-standard", name: "Acrobat Standard" },
      { id: "acrobat-pro", name: "Acrobat Pro" },
    ],
  },
  {
    id: "zoom-workplace",
    name: "Zoom Workplace",
    shortName: "Zm",
    licenses: [
      { id: "zoom-workplace-pro", name: "Workplace Pro" },
      { id: "zoom-workplace-business", name: "Workplace Business" },
    ],
  },
  ACRONIS_EXAMPLE,
];
