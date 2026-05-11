import type { LineItem } from "./types.ts";

export function sumLineItems(items: LineItem[]): number {
  return items.reduce((s, li) => s + li.amount, 0);
}
