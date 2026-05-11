import { formatInvoice } from "../invoice.ts";
import type { Invoice } from "../types.ts";

export async function runBillingJob(invoices: Invoice[]): Promise<void> {
  for (const invoice of invoices) {
    if (invoice.lineItems.length === 0) continue;
    const formatted = formatInvoice(invoice);
    await sendReceipt(formatted);
  }
}

declare function sendReceipt(formatted: ReturnType<typeof formatInvoice>): Promise<void>;
