export type BillingOption = "monthly" | "annual-monthly" | "annual-upfront";

export interface QuoteLine {
  id: string;
  productId: string;
  productName: string;
  licenseName: string;
  billing: BillingOption;
  quantity: string;
  unitPrice: string;
}

export interface QuoteDraft {
  version: 1;
  reference: string;
  customer: string;
  notes: string;
  date: string;
  lines: QuoteLine[];
}

export interface QuoteTotals {
  monthlyCents: number;
  annualUpfrontCents: number;
  dueNowCents: number;
  yearEstimateCents: number;
  valid: boolean;
}

export const BILLING_OPTIONS: ReadonlyArray<{
  id: BillingOption;
  label: string;
  description: string;
  unitLabel: string;
}> = [
  {
    id: "monthly",
    label: "Monthly",
    description: "Monthly term, paid monthly",
    unitLabel: "per license / month",
  },
  {
    id: "annual-monthly",
    label: "Annual · paid monthly",
    description: "Annual commitment, paid monthly",
    unitLabel: "per license / month",
  },
  {
    id: "annual-upfront",
    label: "Annual · paid upfront",
    description: "Annual commitment, paid upfront",
    unitLabel: "per license / year",
  },
];

export const QUOTE_LIMITS = {
  lines: 100,
  customer: 200,
  notes: 4000,
  reference: 64,
  name: 200,
  id: 128,
  numericInput: 32,
} as const;
