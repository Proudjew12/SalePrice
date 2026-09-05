import { PointerActivationConstraints } from "@dnd-kit/dom";
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

const cardPointerSensor = PointerSensor.configure({
  activationConstraints(event, source) {
    // A little movement distinguishes touch dragging from tapping, without a hold delay.
    if (event.pointerType === "touch") return [new PointerActivationConstraints.Distance({ value: 4 })];
    const defaults = PointerSensor.defaults.activationConstraints;
    return typeof defaults === "function" ? defaults(event, source) : defaults;
  },
});

export function LicenseCard({ product, license, onAdd, billing, editing, onEdit }: LicenseCardProps) {
  const { ref, isDragging, isDropping } = useDraggable({ id: license.id, type: "license", sensors: [cardPointerSensor] });
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
        aria-label={`Add ${license.name} to quote`}
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
