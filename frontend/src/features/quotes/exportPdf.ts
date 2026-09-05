import type { jsPDF } from "jspdf";

import { calculateLine, calculateQuote, formatMoney, parsePriceCents } from "./calculations";
import { loadPdfFont, registerPdfFont } from "./pdf/font";
import { cleanPdfText, QuotePdfLayout } from "./pdf/layout";
import { isQuoteDate, isQuoteDraft } from "./storage";
import { BILLING_OPTIONS } from "./types";
import type { QuoteDraft, QuoteLine } from "./types";

function writeLine(layout: QuotePdfLayout, document: jsPDF, line: QuoteLine, index: number): void {
  const option = BILLING_OPTIONS.find((billing) => billing.id === line.billing);
  const price = parsePriceCents(line.unitPrice);
  if (option === undefined || price === null) throw new Error("Complete every quote line first.");
  const heading = `${String(index + 1).padStart(2, "0")}  ${line.productName} / ${line.licenseName}`;
  const headingHeight = layout.wrap(heading, 174, 11).length * 5.5;
  layout.ensureSpace(headingHeight + 29);
  layout.paragraph(heading, 11);
  layout.paragraph(option.description, 9, [105, 114, 130]);
  layout.y += 2;
  document.setTextColor(105, 114, 130);
  layout.text("Quantity", 18, layout.y, 35, 8);
  layout.text(`Unit price (${line.billing === "annual-upfront" ? "year" : "month"})`, 71, layout.y, 50, 8);
  layout.text("Line total", 137, layout.y, 55, 8);
  layout.y += 6;
  document.setTextColor(40, 49, 66);
  layout.text(String(Number(line.quantity)), 18, layout.y, 35);
  layout.text(formatMoney(price), 71, layout.y, 50);
  layout.text(formatMoney(calculateLine(line).subtotalCents), 137, layout.y, 55);
  layout.y += 7;
  layout.rule();
}

export async function buildQuotePdf(draft: QuoteDraft): Promise<jsPDF> {
  if (
    !isQuoteDraft(draft) || !cleanPdfText(draft.customer).trim() ||
    !cleanPdfText(draft.reference).trim() || !isQuoteDate(draft.date) ||
    !calculateQuote(draft.lines).valid
  ) {
    throw new Error("Enter a customer, reference, and date, and complete every quote line before exporting.");
  }
  const [{ jsPDF }, font] = await Promise.all([import("jspdf"), loadPdfFont()]);
  const document = new jsPDF({ unit: "mm", format: "a4", compress: true, putOnlyUsedFonts: true });
  registerPdfFont(document, font);
  document.setProperties({ title: `SalePrice quote ${cleanPdfText(draft.reference)}`, author: "SalePrice" });
  const layout = new QuotePdfLayout(document, cleanPdfText(draft.reference));

  layout.paragraph("SalePrice", 23, [0, 91, 234]);
  layout.y += 3;
  layout.paragraph("LICENSE QUOTE", 11);
  layout.y += 3;
  layout.paragraph(`Reference: ${draft.reference}`, 9);
  layout.paragraph(`Date: ${draft.date}`, 9);
  layout.y += 7;
  layout.label("Prepared for");
  layout.paragraph(draft.customer.trim(), 13);
  layout.y += 7;
  layout.rule();

  draft.lines.forEach((line, index) => writeLine(layout, document, line, index));

  const totals = calculateQuote(draft.lines);
  layout.ensureSpace(66);
  layout.label("Quote summary · USD");
  layout.amount("Monthly payments", formatMoney(totals.monthlyCents));
  layout.amount("Annual upfront payments", formatMoney(totals.annualUpfrontCents));
  layout.amount("Due at start", formatMoney(totals.dueNowCents), true);
  layout.amount("12-month estimate", formatMoney(totals.yearEstimateCents));
  layout.y += 2;
  layout.paragraph("Due at start includes the first monthly payment and annual upfront payments.", 8);
  layout.paragraph("The 12-month estimate assumes monthly licenses continue for 12 months. Taxes are not included.", 8);
  if (draft.notes.trim()) {
    layout.y += 7;
    layout.label("Notes");
    layout.paragraph(draft.notes.trim());
  }
  layout.finish();
  return document;
}

export async function exportQuotePdf(draft: QuoteDraft): Promise<void> {
  const document = await buildQuotePdf(draft);
  const reference = draft.reference.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64);
  await document.save(`SalePrice-${reference || "quote"}.pdf`, { returnPromise: true });
}
