# Expected review

This file documents what a thorough human reviewer should flag on this PR. It is the answer key. Compare your model's output against this for both the diff-only and prpack runs.

## The bug

In `src/invoice.ts`, `formatInvoice` accesses `invoice.customer.email.toLowerCase()`.

`Customer` in `src/types.ts` is typed as `Customer | null`. So `invoice.customer` can be null.

The `before` version of `formatInvoice` had the same access pattern — it was always latently broken. **What this PR changes** is *when* that access is reached. The pre-refactor `.reduce` inlined the sum, which on an empty `lineItems` array returned `0` from the initial accumulator and immediately moved on. The caller in `src/jobs/billing.ts` short-circuits with `if (invoice.lineItems.length === 0) continue;` so empty-line-item invoices never hit the null path. But:

- `runBillingJob` does not check `invoice.customer` before calling `formatInvoice`.
- The type permits `customer: null`.
- `formatInvoice` unconditionally derefs `invoice.customer.email`.

This is a null-deref waiting on the first invoice with `customer === null` to land. The diff is a pure refactor — `sumLineItems` is a faithful extraction. Both versions crash on the null-customer path. The PR is not the *cause* of the bug, but a thorough reviewer should still flag it on the modified function.

## Why a diff-only review misses this

The diff shows three lines:

```
-  const total = invoice.lineItems.reduce((s, li) => s + li.amount, 0);
+  const total = sumLineItems(invoice.lineItems);
```

That is the entire visible code. The `invoice.customer.email` line is not in the diff and is not in any context window the diff carries. A reviewer with only this view sees a clean, semantically equivalent refactor and approves.

## Why the prpack review catches it

prpack includes the full post-change content of `src/invoice.ts`, so the reviewer sees the `customer.email.toLowerCase()` line. If you pass `--include-tests` or it pulls callers, it also sees `src/jobs/billing.ts` (which does not null-check `customer`). Combined with the `Customer | null` type in `src/types.ts`, the model has everything it needs to identify the latent null-deref.

A good review on the prpack version should:

1. Identify `invoice.customer.email.toLowerCase()` in `formatInvoice` (post-refactor) as unguarded.
2. Note that `Customer` is typed as nullable in `src/types.ts`.
3. Note that `runBillingJob` does not pre-filter null customers.
4. Recommend either an explicit guard in `formatInvoice` or a filter in `runBillingJob`.

## Verdict (correct)

`needs changes` — null-deref reachable on a typed-nullable customer field.

A model that says "Safe to merge" on the prpack version missed the bug. A model that says it on the diff-only version was simply working with less information.
