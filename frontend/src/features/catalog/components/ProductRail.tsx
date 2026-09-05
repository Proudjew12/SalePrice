import { Icon } from "@/components/ui/Icon";
import { classNames } from "@/shared/utils/classNames";
import type { CatalogProduct } from "../types";
import styles from "./ProductRail.module.scss";

interface ProductRailProps {
  products: CatalogProduct[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddProduct: () => void;
}

function ProductGlyph({ id }: { id: string }) {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      {id === "microsoft-365" ? (
        <>
          <rect x="3" y="3" width="10" height="10" rx="1.4" />
          <rect x="19" y="3" width="10" height="10" rx="1.4" />
          <rect x="3" y="19" width="10" height="10" rx="1.4" />
          <rect x="19" y="19" width="10" height="10" rx="1.4" />
        </>
      ) : id === "google-workspace" ? (
        <path d="m9 4 14 0 7 12-7 12H9L2 16Z" />
      ) : id === "adobe-acrobat" ? (
        <path d="m4 27 9-22h6l9 22h-6L16 11 10 27Zm8-5h9" strokeLinejoin="round" />
      ) : id === "zoom-workplace" ? (
        <><rect x="2" y="6" width="21" height="20" rx="4" /><path d="m23 12 7-4v16l-7-4" strokeLinejoin="round" /></>
      ) : (
        <rect x="4" y="4" width="24" height="24" rx="5" />
      )}
    </svg>
  );
}

export function ProductRail({ products, selectedId, onSelect, onAddProduct }: ProductRailProps) {
  return (
    <nav className={styles.rail} aria-label="Products">
      {products.map((product) => (
        <button
          key={product.id}
          type="button"
          className={classNames(styles.product, product.id === selectedId && styles.selected)}
          aria-label={product.name}
          aria-pressed={product.id === selectedId}
          title={product.name}
          onClick={() => onSelect(product.id)}
        >
          <ProductGlyph id={product.id} />
          <span>{product.shortName}</span>
        </button>
      ))}
      <button type="button" className={styles.add} onClick={onAddProduct} aria-label="Add product" title="Add product">
        <Icon name="plus" />
        <span>Add</span>
      </button>
    </nav>
  );
}
