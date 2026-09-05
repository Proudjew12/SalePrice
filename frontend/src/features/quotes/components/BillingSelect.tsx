import { BILLING_OPTIONS } from "../types";
import type { BillingOption } from "../types";
import styles from "./BillingSelect.module.scss";

interface BillingSelectProps {
  id?: string;
  describedBy?: string;
  value: BillingOption;
  onChange: (value: BillingOption) => void;
}

export function BillingSelect({ id, describedBy, value, onChange }: BillingSelectProps) {
  return (
    <select id={id} aria-describedby={describedBy} className={styles.select} value={value} onChange={(event) => {
      const option = BILLING_OPTIONS.find((candidate) => candidate.id === event.target.value);
      if (option) onChange(option.id);
    }}>
      {BILLING_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select>
  );
}
