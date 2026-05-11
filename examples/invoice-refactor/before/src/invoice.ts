import type { Invoice, FormattedInvoice } from "./types.ts";
import { formatCurrency, formatDate } from "./format.ts";
import { log } from "./log.ts";

const ALLOWED_CURRENCIES = new Set(["USD", "EUR", "GBP", "CAD", "AUD"]);

export function formatInvoice(invoice: Invoice): FormattedInvoice {
  if (!ALLOWED_CURRENCIES.has(invoice.currency)) {
    throw new Error(`Unsupported currency: ${invoice.currency}`);
  }

  if (!Array.isArray(invoice.lineItems)) {
    throw new Error("Invoice line items must be an array");
  }

  log.debug("formatting invoice", { id: invoice.id, items: invoice.lineItems.length });

  const total = invoice.lineItems.reduce((s, li) => s + li.amount, 0);

  log.debug("computed total", { id: invoice.id, total });

  const formattedTotal = formatCurrency(total, invoice.currency);
  const issuedAt = formatDate(invoice.issuedAt);

  return {
    id: invoice.id,
    total,
    formattedTotal,
    currency: invoice.currency,
    customerEmail: invoice.customer.email.toLowerCase(),
    issuedAt,
  };
}
