import { useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { BillingSelect } from "@/features/quotes/components/BillingSelect";
import { BILLING_OPTIONS } from "@/features/quotes/calculations";
import type { BillingOption } from "@/features/quotes/types";
import type { CatalogLicense, CatalogProduct } from "../types";
import { LicenseCard } from "./LicenseCard";
import styles from "./CatalogPanel.module.scss";

interface CatalogPanelProps {
  product: CatalogProduct;
  billing: BillingOption;
  onBillingChange: (billing: BillingOption) => void;
  onAdd: (product: CatalogProduct, license: CatalogLicense) => void;
  onAddLicense: () => void;
  editing: boolean;
  onEditProduct: () => void;
  onEditLicense: (license: CatalogLicense) => void;
}

export function CatalogPanel({ product, billing, onBillingChange, onAdd, onAddLicense, editing, onEditProduct, onEditLicense }: CatalogPanelProps) {
  const [search, setSearch] = useState("");
  const licenses = product.licenses.filter((license) => license.name.toLowerCase().includes(search.trim().toLowerCase()));
  const billingDescription = BILLING_OPTIONS.find((option) => option.id === billing)?.description;

  return (
    <section className={styles.panel} aria-label="Licenses">
      <header className={styles.heading}>
        <h2>{product.name}</h2>
        {editing ? <button type="button" className={styles.editProduct} onClick={onEditProduct} aria-label="Edit product" title="Edit product"><Icon name="edit" size={18} /></button> : null}
      </header>
      <div className={styles.search}>
        <Icon name="search" />
        <input type="search" aria-label="Search licenses" placeholder="Search licenses" value={search} maxLength={80} onChange={(event) => setSearch(event.target.value)} />
      </div>
      <label className={styles.billing} htmlFor="catalog-billing">
        Billing Option
        <BillingSelect id="catalog-billing" describedBy="catalog-billing-description" value={billing} onChange={onBillingChange} />
      </label>
      <p id="catalog-billing-description" className={styles.billingHint}>{billingDescription}</p>
      <div className={styles.licenses}>
        {licenses.length > 0 ? licenses.map((license) => (
          <LicenseCard key={license.id} product={product} license={license} billing={billing} editing={editing} onEdit={() => onEditLicense(license)} onAdd={onAdd} />
        )) : <p className={styles.empty} role="status">{product.licenses.length === 0 ? "No licenses yet" : "No licenses match your search."}</p>}
      </div>
      <p id="catalog-card-instructions" className={styles.instruction}>Drag a card, or click or tap it to add. On touchscreens, hold the card briefly before dragging. You can also focus a card and press Enter.</p>
      {editing ? <button type="button" className={styles.addLicense} onClick={onAddLicense}>
        <Icon name="plus" /> Add license
      </button> : null}
    </section>
  );
}
