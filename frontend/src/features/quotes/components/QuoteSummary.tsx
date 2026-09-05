import { Icon } from "@/components/ui/Icon";
import { calculateLine, calculateQuote, formatMoney } from "@/features/quotes/calculations";
import type { QuoteDraft } from "@/features/quotes/types";
import styles from "@/features/quotes/components/QuoteSummary.module.scss";

interface Props {
  draft: QuoteDraft;
  exporting: boolean;
  onExport: () => void;
}

export function QuoteSummary({ draft, exporting, onExport }: Props) {
  const totals = calculateQuote(draft.lines);
  const monthlyValid = draft.lines.filter((line) => line.billing !== "annual-upfront").every((line) => calculateLine(line).valid);
  const annualValid = draft.lines.filter((line) => line.billing === "annual-upfront").every((line) => calculateLine(line).valid);
  const ready = totals.valid && Boolean(draft.customer.trim() && draft.reference.trim());
  let hint = "Your quote is ready to download.";
  if (draft.lines.length === 0) hint = "Add a license to start your quote.";
  else if (!totals.valid) hint = "Enter a valid quantity and price for each license.";
  else if (!draft.customer.trim()) hint = "Add a customer to export this quote.";
  else if (!draft.reference.trim()) hint = "Add a quote reference to export.";

  return (
    <footer className={styles.summary}>
      <div className={styles.metrics}>
        <div><span>Monthly payments</span><output aria-label="Monthly payments">{monthlyValid ? formatMoney(totals.monthlyCents) : "—"}</output></div>
        <div><span>Annual upfront</span><output aria-label="Annual upfront">{annualValid ? formatMoney(totals.annualUpfrontCents) : "—"}</output></div>
        <div><span>Due at start</span><output aria-label="Due at start">{monthlyValid && annualValid ? formatMoney(totals.dueNowCents) : "—"}</output></div>
      </div>
      <div className={styles.action}>
        <p id="export-hint">{hint}</p>
        <button type="button" onClick={onExport} disabled={!ready || exporting} aria-describedby="export-hint">
          <Icon name="download" size={18} /> {exporting ? "Creating PDF…" : "Export PDF"}
        </button>
      </div>
      <div className={styles.caption}>
        <span>USD · Taxes not included</span>
        <span>12-month estimate <output aria-label="12-month estimate">{monthlyValid && annualValid ? formatMoney(totals.yearEstimateCents) : "—"}</output></span>
      </div>
      {draft.lines.some((line) => line.billing === "monthly") ?
        <p className={styles.assumption}>The estimate assumes monthly subscriptions continue for 12 months.</p> : null}
    </footer>
  );
}
