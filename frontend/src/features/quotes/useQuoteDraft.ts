import { useCallback, useRef, useState } from "react";

import { createDraft, loadDraft, saveDraft } from "@/features/quotes/storage";
import type { BillingOption, QuoteDraft, QuoteLine } from "@/features/quotes/types";

export function useQuoteDraft() {
  const [state, setState] = useState(() => ({ ...loadDraft(), saveFailed: false }));
  const current = useRef(state.draft);

  const commit = useCallback((update: (previous: QuoteDraft) => QuoteDraft) => {
    const next = update(current.current);
    current.current = next;
    const saved = saveDraft(next);
    setState((previous) => ({ ...previous, draft: next, saveFailed: !saved }));
  }, []);

  function addLine(productId: string, productName: string, licenseName: string, billing: BillingOption) {
    if (current.current.lines.length >= 100) return false;
    commit((draft) => ({ ...draft, lines: [...draft.lines, {
      id: crypto.randomUUID(), productId, productName, licenseName, billing,
      quantity: "1", unitPrice: "",
    }] }));
    return true;
  }

  function editLine(id: string, patch: Partial<Pick<QuoteLine, "quantity" | "unitPrice" | "billing">>) {
    commit((draft) => ({ ...draft, lines: draft.lines.map((line) => {
      if (line.id !== id) return line;
      // A different payment schedule requires its own price; never silently reuse a monthly rate.
      const price = patch.billing && patch.billing !== line.billing ? "" : line.unitPrice;
      return { ...line, unitPrice: price, ...patch };
    }) }));
  }

  return {
    ...state, addLine, editLine,
    editDetails: (patch: Partial<Pick<QuoteDraft, "customer" | "reference" | "notes">>) =>
      commit((draft) => ({ ...draft, ...patch })),
    removeLine: (id: string) => commit((draft) => ({
      ...draft, lines: draft.lines.filter((line) => line.id !== id),
    })),
    reset: () => commit(() => createDraft()),
    dismissWarning: () => setState((previous) => ({ ...previous, warning: null })),
  };
}
