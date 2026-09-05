import { useDraggable } from "@dnd-kit/react";

import { Icon } from "@/components/ui/Icon";
import { classNames } from "@/shared/utils/classNames";
import type { CatalogLicense, CatalogProduct } from "../types";
import styles from "./LicenseCard.module.scss";

interface LicenseCardProps {
  product: CatalogProduct;
  license: CatalogLicense;
  onAdd: (product: CatalogProduct, license: CatalogLicense) => void;
}

export function LicenseCard({ product, license, onAdd }: LicenseCardProps) {
  const { ref, handleRef, isDragging } = useDraggable({ id: license.id, type: "license" });

  return (
    <article ref={ref} className={classNames(styles.card, isDragging && styles.dragging)} aria-label={license.name}>
      <button ref={handleRef} type="button" className={styles.drag} aria-label={`Drag ${license.name}`} title="Drag to your quote">
        <Icon name="grip" />
      </button>
      <div className={styles.content}>
        <h3>{license.name}</h3>
        <p>{product.name}</p>
        <p className={styles.hint}>Set your price in the quote</p>
      </div>
      <button type="button" className={styles.add} aria-label={`Add ${license.name} to quote`} onClick={() => onAdd(product, license)}>
        <Icon name="plus" />
      </button>
    </article>
  );
}
