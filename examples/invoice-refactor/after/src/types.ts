export type LineItem = { sku: string; amount: number };

export type Customer = { id: string; email: string };

export type Invoice = {
  id: string;
  currency: string;
  issuedAt: Date;
  lineItems: LineItem[];
  customer: Customer | null;
};

export type FormattedInvoice = {
  id: string;
  total: number;
  formattedTotal: string;
  currency: string;
  customerEmail: string;
  issuedAt: string;
};
