import { useState } from "react";

import { Icon } from "@/components/ui/Icon";
import type { CatalogLicense, CatalogProduct } from "../types";
import { LicenseCard } from "./LicenseCard";
import styles from "./CatalogPanel.module.scss";

interface CatalogPanelProps {
  product: CatalogProduct;
  onAdd: (product: CatalogProduct, license: CatalogLicense) => void;
  onAddLicense: () => void;
  editing: boolean;
  onEditProduct: () => void;
  onEditLicense: (license: CatalogLicense) => void;
}

export function CatalogPanel({ product, onAdd, onAddLicense, editing, onEditProduct, onEditLicense }: CatalogPanelProps) {
  const [search, setSearch] = useState("");
  const licenses = product.licenses.filter((license) => license.name.toLowerCase().includes(search.trim().toLowerCase()));

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
      <div className={styles.licenses}>
        {licenses.length > 0 ? licenses.map((license) => (
          <LicenseCard key={license.id} product={product} license={license} editing={editing} onEdit={() => onEditLicense(license)} onAdd={onAdd} />
        )) : <p className={styles.empty} role="status">{product.licenses.length === 0 ? "No licenses yet" : "No licenses match your search."}</p>}
      </div>
      {editing ? <button type="button" className={styles.addLicense} onClick={onAddLicense}>
        <Icon name="plus" /> Add license
      </button> : null}
    </section>
  );
}
