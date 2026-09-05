import { useDraggable } from "@dnd-kit/react";

import { Icon } from "@/components/ui/Icon";
import { formatMoney, parsePriceCents } from "@/features/quotes/calculations";
import type { BillingOption } from "@/features/quotes/types";
import { classNames } from "@/shared/utils/classNames";
import type { CatalogLicense, CatalogProduct } from "../types";
import styles from "./LicenseCard.module.scss";

interface LicenseCardProps {
  product: CatalogProduct;
  license: CatalogLicense;
  onAdd: (product: CatalogProduct, license: CatalogLicense) => void;
  billing: BillingOption;
  editing: boolean;
  onEdit: () => void;
}

export function LicenseCard({ product, license, onAdd, billing, editing, onEdit }: LicenseCardProps) {
  const { ref, handleRef, isDragging } = useDraggable({ id: license.id, type: "license" });
  const price = parsePriceCents(license.prices?.[billing] ?? "");

  return (
    <article ref={ref} className={classNames(styles.card, isDragging && styles.dragging)} aria-label={license.name}>
      <button ref={handleRef} type="button" className={styles.drag} aria-label={`Drag ${license.name}`} title="Drag to your quote">
        <Icon name="grip" size={14} />
      </button>
      <div className={styles.content}>
        <h3>{license.name}</h3>
        <p>{price === null ? "Price not set" : `${formatMoney(price)} / ${billing === "annual-upfront" ? "year" : "month"}`}</p>
      </div>
      <div className={styles.actions}>
        {editing ? <button type="button" className={styles.edit} aria-label={`Edit ${license.name}`} title="Edit license" onClick={onEdit}><Icon name="edit" size={17} /></button> : null}
        <button type="button" className={styles.add} aria-label={`Add ${license.name} to quote`} onClick={() => onAdd(product, license)}>
          <Icon name="plus" size={18} />
        </button>
      </div>
    </article>
  );
}
