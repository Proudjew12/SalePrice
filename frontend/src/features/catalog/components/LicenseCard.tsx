import { PointerSensor, useDragDropMonitor, useDraggable } from "@dnd-kit/react";
import { useRef } from "react";

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
  const { ref, isDragging, isDropping } = useDraggable({ id: license.id, type: "license", sensors: [PointerSensor] });
  const dragged = useRef(false);
  useDragDropMonitor({
    onDragStart(event) {
      if (event.operation.source?.id === license.id) dragged.current = true;
    },
  });
  const price = parsePriceCents(license.prices?.[billing] ?? "");

  return (
    <article className={styles.card} aria-label={license.name}>
      <button ref={ref} type="button"
        className={classNames(styles.content, editing && styles.editable, isDragging && styles.dragging)}
        aria-label={`Add ${license.name} to quote`} aria-describedby="catalog-card-instructions"
        onPointerDown={() => { dragged.current = false; }}
        onClick={(event) => {
          // A completed or canceled drag must not also act as a click on the card.
          if (event.defaultPrevented || isDragging || isDropping || (event.detail > 0 && dragged.current)) return;
          onAdd(product, license);
        }}>
        <span className={styles.name}>{license.name}</span>
        <span className={styles.price}>{price === null ? "Price not set" : `${formatMoney(price)} / ${billing === "annual-upfront" ? "year" : "month"}`}</span>
      </button>
      {editing ? <button type="button" className={styles.edit} aria-label={`Edit ${license.name}`} title="Edit license" onClick={onEdit}><Icon name="edit" size={17} /></button> : null}
    </article>
  );
}
