import { useDroppable } from "@dnd-kit/react";

import { Icon } from "@/components/ui/Icon";
import { QuoteLineEditor } from "@/features/quotes/components/QuoteLineEditor";
import { QuoteSummary } from "@/features/quotes/components/QuoteSummary";
import type { useQuoteDraft } from "@/features/quotes/useQuoteDraft";
import { classNames } from "@/shared/utils/classNames";
import styles from "@/features/quotes/components/QuoteWorkspace.module.scss";

interface Props {
  quote: ReturnType<typeof useQuoteDraft>;
  exporting: boolean;
  onExport: () => void;
  onNewOrder: () => void;
  catalogWarning: string | null;
  exportError: string;
}

export function QuoteCanvas({ quote, exporting, onExport, onNewOrder, catalogWarning, exportError }: Props) {
  const { ref, isDropTarget } = useDroppable({ id: "quote-items", accept: "license" });
  const { draft } = quote;
  return (
    <main className={styles.quote} id="quote-content" aria-label="Order" tabIndex={-1}>
      <div className={styles.scroll}>
        <div className={styles.orderActions}>
          <button className={styles.newOrder} type="button" onClick={onNewOrder}><Icon name="plus" size={17} />New Order</button>
        </div>
        {quote.warning ? <div className={styles.warning} role="alert">{quote.warning}<button type="button" onClick={quote.dismissWarning} aria-label="Dismiss draft warning"><Icon name="close" size={16} /></button></div> : null}
        {catalogWarning ? <p className={styles.warning} role="alert">{catalogWarning}</p> : null}
        {quote.saveFailed ? <p className={styles.warning} role="alert">Changes may not be saved on this device. Export your quote before leaving.</p> : null}
        {exportError ? <p className={styles.warning} role="alert">{exportError}</p> : null}
        <div className={styles.details}>
          <label>Customer<input value={draft.customer} placeholder="Customer or company name" maxLength={200} autoComplete="organization"
            onChange={(event) => quote.editDetails({ customer: event.target.value })} /></label>
          <label>Quote reference<input value={draft.reference} maxLength={64}
            onChange={(event) => quote.editDetails({ reference: event.target.value })} /></label>
        </div>
        <section ref={ref} aria-label="Quote items" className={classNames(styles.items, isDropTarget && styles.over)}>
          {draft.lines.map((line) => <QuoteLineEditor key={line.id} line={line} onChange={(patch) => quote.editLine(line.id, patch)}
            onRemove={() => quote.removeLine(line.id)} />)}
          <div className={classNames(styles.dropzone, draft.lines.length === 0 && styles.empty)}>
            <span className={styles.dropIcon}><Icon name={draft.lines.length ? "plus" : "document"} size={26} /></span>
            <p>{isDropTarget ? "Release to add this license" : draft.lines.length ? "Drop another license here" : "Your next quote starts here"}</p>
            {draft.lines.length === 0 ? <span>Drag a license card here, or click or tap it to add.</span> : null}
          </div>
        </section>
        <label className={styles.notes}>Notes<textarea value={draft.notes} maxLength={4000} placeholder="Add any notes for this quote…" rows={3}
          onChange={(event) => quote.editDetails({ notes: event.target.value })} /></label>
      </div>
      <QuoteSummary draft={draft} exporting={exporting} onExport={onExport} />
    </main>
  );
}
