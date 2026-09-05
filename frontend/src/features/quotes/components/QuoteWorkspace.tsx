import { DragDropProvider } from "@dnd-kit/react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Icon } from "@/components/ui/Icon";
import { CatalogDialog } from "@/features/catalog/components/CatalogDialog";
import type { CatalogDialogTarget, CatalogEditorInput } from "@/features/catalog/components/CatalogDialog";
import { CatalogPanel } from "@/features/catalog/components/CatalogPanel";
import { ProductRail } from "@/features/catalog/components/ProductRail";
import { useCatalog } from "@/features/catalog/hooks/useCatalog";
import type { CatalogLicense, CatalogProduct } from "@/features/catalog/types";
import { TextSizeControl } from "@/features/display/TextSizeControl";
import { QuoteCanvas } from "@/features/quotes/components/QuoteCanvas";
import type { BillingOption } from "@/features/quotes/types";
import { useQuoteDraft } from "@/features/quotes/useQuoteDraft";
import styles from "@/features/quotes/components/QuoteWorkspace.module.scss";

export function QuoteWorkspace() {
  const quote = useQuoteDraft();
  const catalog = useCatalog();
  const [selectedId, setSelectedId] = useState("microsoft-365");
  const [billing, setBilling] = useState<BillingOption>("annual-monthly");
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState<CatalogDialogTarget | null>(null);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const [exportError, setExportError] = useState("");
  const product = catalog.products.find((item) => item.id === selectedId) ?? catalog.products[0];

  function addLicense(selectedProduct: CatalogProduct, license: CatalogLicense) {
    const added = quote.addLine(selectedProduct.id, selectedProduct.name, license.name, billing, license.prices?.[billing] ?? "");
    setMessage(added ? `${license.name} added to your quote.` : "A quote can contain up to 100 license lines.");
    setExportError("");
  }

  async function exportPdf() {
    setExporting(true);
    setExportError("");
    try {
      const { exportQuotePdf } = await import("@/features/quotes/exportPdf");
      await exportQuotePdf(quote.draft);
      setMessage("Your PDF quote has been downloaded.");
    } catch {
      setExportError("The PDF could not be created. Your quote is still here. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  function newOrder() {
    const hasWork = quote.draft.lines.length > 0 || quote.draft.customer.trim() || quote.draft.notes.trim();
    if (hasWork && !window.confirm("Start a new order? Export your current order first if you want to keep it.")) return;
    quote.reset(); setMessage("New order started."); setExportError("");
  }

  function submitCatalog(input: CatalogEditorInput): string | null {
    if (!dialog || !editing) return "Switch to Edit Mode to change your catalog.";
    const { name, firstLicense, shortName, prices } = input;
    const result = dialog.kind === "add-product" ? catalog.addProduct(name, firstLicense, shortName, prices)
      : dialog.kind === "edit-product" ? catalog.updateProduct(dialog.product.id, name, shortName)
      : dialog.kind === "add-license" ? catalog.addLicense(dialog.product.id, name, prices)
      : catalog.updateLicense(dialog.product.id, dialog.license.id, name, prices);
    if (!result.ok) return result.message;
    setSelectedId(result.productId); setDialog(null);
    setMessage("Catalog updated.");
    return null;
  }

  function deleteCatalog(): string | null {
    if (!editing || !dialog || (dialog.kind !== "edit-product" && dialog.kind !== "edit-license")) return "Select an item to delete.";
    const name = dialog.kind === "edit-product" ? dialog.product.name : dialog.license.name;
    if (!window.confirm(`Delete ${name} from your catalog? Existing order items will be kept.`)) return null;
    const result = dialog.kind === "edit-product" ? catalog.removeProduct(dialog.product.id)
      : catalog.removeLicense(dialog.product.id, dialog.license.id);
    if (!result.ok) return result.message;
    setDialog(null); setMessage("Item removed from the catalog.");
    return null;
  }

  return (
    <div className={styles.workspace}>
      <a className={styles.skip} href="#quote-content" onClick={(event) => {
        event.preventDefault(); document.getElementById("quote-content")?.focus();
      }}>Skip to main content</a>
      <header className={styles.header}>
        <Link className={styles.brand} to="/" aria-label="SalePrice home"><span>S</span>SalePrice</Link>
        <div className={styles.toolbar}>
          <TextSizeControl />
          <button type="button" className={styles.mode} aria-pressed={editing} title={editing ? "Switch to Normal Mode" : "Switch to Edit Mode"} onClick={() => setEditing(!editing)}>
            <Icon name={editing ? "edit" : "check"} size={16} />{editing ? "Edit Mode" : "Normal Mode"}
          </button>
        </div>
      </header>
      <DragDropProvider onDragEnd={(event) => {
        if (event.canceled || event.operation.target?.id !== "quote-items") return;
        const licenseId = event.operation.source?.id;
        for (const item of catalog.products) {
          const license = item.licenses.find((candidate) => candidate.id === licenseId);
          if (license) { addLicense(item, license); break; }
        }
      }}>
        <div className={styles.body}>
          <ProductRail products={catalog.products} selectedId={product?.id ?? ""} onSelect={setSelectedId} editing={editing} onAddProduct={() => setDialog({ kind: "add-product" })} />
          {product ? <CatalogPanel key={product.id} product={product} billing={billing} onBillingChange={setBilling} onAdd={addLicense} editing={editing}
            onAddLicense={() => setDialog({ kind: "add-license", product })} onEditProduct={() => setDialog({ kind: "edit-product", product })}
            onEditLicense={(license) => setDialog({ kind: "edit-license", product, license })} />
            : <section className={styles.emptyCatalog} aria-label="Licenses"><h2>No products yet</h2><p>{editing ? "Use + on the left to add your first product." : "Switch to Edit Mode to add a product."}</p></section>}
          <QuoteCanvas quote={quote} exporting={exporting} onExport={() => { void exportPdf(); }}
            catalogWarning={catalog.warning} exportError={exportError} onNewOrder={newOrder} />
        </div>
      </DragDropProvider>
      <div className={styles.announcement} role="status" aria-live="polite" aria-atomic="true">{message}</div>
      {dialog ? <CatalogDialog target={dialog} onClose={() => setDialog(null)} onSubmit={submitCatalog} onDelete={deleteCatalog} /> : null}
    </div>
  );
}
