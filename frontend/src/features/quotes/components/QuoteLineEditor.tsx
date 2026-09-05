import { useId } from "react";

import { Icon } from "@/components/ui/Icon";
import { calculateLine, formatMoney, getLineError, parsePriceCents, parseQuantity } from "@/features/quotes/calculations";
import { BillingSelect } from "./BillingSelect";
import type { QuoteLine } from "@/features/quotes/types";
import styles from "@/features/quotes/components/QuoteLineEditor.module.scss";

interface Props {
  line: QuoteLine;
  onChange: (patch: Partial<Pick<QuoteLine, "quantity" | "unitPrice" | "billing">>) => void;
  onRemove: () => void;
}

export function QuoteLineEditor({ line, onChange, onRemove }: Props) {
  const errorId = useId();
  const priceLabelId = useId();
  const priceUnitId = useId();
  const total = calculateLine(line);
  const error = getLineError(line);
  const yearly = line.billing === "annual-upfront";
  const showError = error && (line.unitPrice !== "" || line.quantity !== "1");

  return (
    <fieldset className={styles.item} aria-label={line.licenseName} data-testid="quote-line">
      <div className={styles.heading}>
        <h2><strong>{line.productName}</strong><span aria-hidden="true"> – </span>{line.licenseName}</h2>
        <button type="button" className={styles.remove} aria-label={`Remove ${line.licenseName}`} onClick={onRemove}>
          <Icon name="close" />
        </button>
      </div>
      <div className={styles.fields}>
        <label className={styles.billing}>Billing Option
          <BillingSelect value={line.billing} onChange={(billing) => onChange({ billing })} />
        </label>
        <div className={styles.amounts}>
          <label>Quantity
            <input type="text" inputMode="numeric" value={line.quantity} maxLength={5}
              aria-invalid={parseQuantity(line.quantity) === null}
              aria-describedby={showError ? errorId : undefined}
              onChange={(event) => onChange({ quantity: event.target.value })} />
          </label>
          <label><span id={priceLabelId}>Price</span>
            <span className={styles.price}><span aria-hidden="true">$</span>
              <input type="text" inputMode="decimal" placeholder="0.00" value={line.unitPrice} maxLength={12}
                aria-labelledby={priceLabelId}
                aria-invalid={Boolean(line.unitPrice && parsePriceCents(line.unitPrice) === null)}
                aria-describedby={`${priceUnitId}${showError ? ` ${errorId}` : ""}`}
                onChange={(event) => onChange({ unitPrice: event.target.value })} />
            </span>
          </label>
        </div>
        <div className={styles.total}><span>Line total</span>
          <output aria-label={`${line.licenseName} line total`}>{total.valid ? formatMoney(total.subtotalCents) : "—"}</output>
          <small id={priceUnitId}>per {yearly ? "year" : "month"}</small>
        </div>
      </div>
      {showError ? <p className={styles.error} id={errorId}>{error}</p> : null}
    </fieldset>
  );
}
