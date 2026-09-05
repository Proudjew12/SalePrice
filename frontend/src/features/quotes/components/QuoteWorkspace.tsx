import { DragDropProvider } from "@dnd-kit/react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Icon } from "@/components/ui/Icon";
import { CatalogDialog } from "@/features/catalog/components/CatalogDialog";
import { CatalogPanel } from "@/features/catalog/components/CatalogPanel";
import { ProductRail } from "@/features/catalog/components/ProductRail";
import { useCatalog } from "@/features/catalog/hooks/useCatalog";
import type { CatalogLicense, CatalogProduct } from "@/features/catalog/types";
import { QuoteCanvas } from "@/features/quotes/components/QuoteCanvas";
import type { BillingOption } from "@/features/quotes/types";
import { useQuoteDraft } from "@/features/quotes/useQuoteDraft";
import styles from "@/features/quotes/components/QuoteWorkspace.module.scss";

export function QuoteWorkspace() {
  const quote = useQuoteDraft();
  const catalog = useCatalog();
  const [selectedId, setSelectedId] = useState("microsoft-365");
  const [billing, setBilling] = useState<BillingOption>("annual-monthly");
  const [dialog, setDialog] = useState<"product" | "license" | null>(null);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const [exportError, setExportError] = useState("");
  const product = catalog.products.find((item) => item.id === selectedId) ?? catalog.products[0];

  function addLicense(selectedProduct: CatalogProduct, license: CatalogLicense) {
    const added = quote.addLine(selectedProduct.id, selectedProduct.name, license.name, billing);
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

  function newQuote() {
    const hasWork = quote.draft.lines.length > 0 || quote.draft.customer.trim() || quote.draft.notes.trim();
    if (hasWork && !window.confirm("Start a new quote? Export your current quote first if you want to keep it.")) return;
    quote.reset(); setMessage("New quote started."); setExportError("");
  }

  function submitCatalog(name: string, firstLicense: string): string | null {
    if (!product) return "Select a product first.";
    const result = dialog === "product" ? catalog.addProduct(name, firstLicense) : catalog.addLicense(product.id, name);
    if (!result.ok) return result.message;
    setSelectedId(result.productId); setDialog(null);
    setMessage(dialog === "product" ? "Product added to your catalog." : "License added to your catalog.");
    return null;
  }

  if (!product) return <p role="alert">The product catalog could not be loaded. Reload to try again.</p>;

  return (
    <div className={styles.workspace}>
      <a className={styles.skip} href="#quote-content" onClick={(event) => {
        event.preventDefault(); document.getElementById("quote-content")?.focus();
      }}>Skip to main content</a>
      <header className={styles.header}>
        <Link className={styles.brand} to="/" aria-label="SalePrice home"><span>S</span>SalePrice</Link>
        <span className={styles.title}>Quote builder</span>
        <span className={styles.saved}><Icon name="check" size={15} />{quote.saved ? "Saved on this device" : "Draft on this device"}</span>
        <button className={styles.newQuote} type="button" onClick={newQuote}><Icon name="plus" size={17} />New quote</button>
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
          <ProductRail products={catalog.products} selectedId={product.id} onSelect={setSelectedId} onAddProduct={() => setDialog("product")} />
          <CatalogPanel key={product.id} product={product} billing={billing} onBillingChange={setBilling} onAdd={addLicense} onAddLicense={() => setDialog("license")} />
          <QuoteCanvas quote={quote} exporting={exporting} onExport={() => { void exportPdf(); }}
            catalogWarning={catalog.warning} exportError={exportError} />
        </div>
      </DragDropProvider>
      <div className={styles.announcement} role="status" aria-live="polite" aria-atomic="true">{message}</div>
      {dialog ? <CatalogDialog mode={dialog} productName={product.name} onClose={() => setDialog(null)} onSubmit={submitCatalog} /> : null}
    </div>
  );
}
