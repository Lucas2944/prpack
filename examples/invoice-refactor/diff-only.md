# Pull Request: Refactor formatInvoice

Extract the line-item sum into a reusable `sumLineItems` helper.

## Diff

```diff
diff --git a/src/invoice.ts b/src/invoice.ts
index cc71786..bd73627 100644
--- a/src/invoice.ts
+++ b/src/invoice.ts
@@ -1,5 +1,6 @@
 import type { Invoice, FormattedInvoice } from "./types.ts";
 import { formatCurrency, formatDate } from "./format.ts";
+import { sumLineItems } from "./sum.ts";
 import { log } from "./log.ts";
 
 const ALLOWED_CURRENCIES = new Set(["USD", "EUR", "GBP", "CAD", "AUD"]);
@@ -15,7 +16,7 @@ export function formatInvoice(invoice: Invoice): FormattedInvoice {
 
   log.debug("formatting invoice", { id: invoice.id, items: invoice.lineItems.length });
 
-  const total = invoice.lineItems.reduce((s, li) => s + li.amount, 0);
+  const total = sumLineItems(invoice.lineItems);
 
   log.debug("computed total", { id: invoice.id, total });
 
diff --git a/src/sum.ts b/src/sum.ts
new file mode 100644
index 0000000..7bb13cc
--- /dev/null
+++ b/src/sum.ts
@@ -0,0 +1,5 @@
+import type { LineItem } from "./types.ts";
+
+export function sumLineItems(items: LineItem[]): number {
+  return items.reduce((s, li) => s + li.amount, 0);
+}
```
