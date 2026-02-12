import { db } from "../store/inMemoryDb.js";
import type { Invoice, InvoiceLineInput, PaymentRecord } from "../types/domain.js";
import { makeId } from "../utils/id.js";
import { nowIso } from "../utils/time.js";
import { adjustInventory, lowStockAlerts } from "./inventory.service.js";

let invoiceSeq = 1000;

function calculateTotals(lines: InvoiceLineInput[]): { subtotal: number; vatTotal: number; total: number } {
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const vatTotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice * line.vatRate, 0);
  return {
    subtotal: Number(subtotal.toFixed(2)),
    vatTotal: Number(vatTotal.toFixed(2)),
    total: Number((subtotal + vatTotal).toFixed(2))
  };
}

export function listInvoices(): Invoice[] {
  return db.invoices;
}

export function createInvoiceDraft(input: { clientId: string; petId?: string; lines: InvoiceLineInput[] }): Invoice {
  const client = db.clients.find((c) => c.id === input.clientId);
  if (!client) throw new Error("Client not found");

  const totals = calculateTotals(input.lines);

  const invoice: Invoice = {
    id: makeId("inv"),
    number: `INV-${invoiceSeq++}`,
    clientId: input.clientId,
    petId: input.petId,
    lines: input.lines,
    ...totals,
    paidAmount: 0,
    status: "DRAFT",
    createdAt: nowIso()
  };

  db.invoices.push(invoice);
  return invoice;
}

export function updateInvoiceDraft(invoiceId: string, lines: InvoiceLineInput[]): Invoice {
  const invoice = db.invoices.find((inv) => inv.id === invoiceId);
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "DRAFT") throw new Error("Only draft invoices can be edited");

  invoice.lines = lines;
  const totals = calculateTotals(lines);
  invoice.subtotal = totals.subtotal;
  invoice.vatTotal = totals.vatTotal;
  invoice.total = totals.total;
  return invoice;
}

export function approveInvoice(invoiceId: string): { invoice: Invoice; lowStockItemNames: string[] } {
  const invoice = db.invoices.find((inv) => inv.id === invoiceId);
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "DRAFT") throw new Error("Only draft invoices can be approved");

  for (const line of invoice.lines) {
    if (line.itemId) {
      adjustInventory(line.itemId, -line.quantity);
    }
  }

  invoice.status = "APPROVED";

  return {
    invoice,
    lowStockItemNames: lowStockAlerts().map((item) => item.name)
  };
}

export function postInvoicePayment(input: {
  invoiceId: string;
  amount: number;
  method: PaymentRecord["method"];
}): { invoice: Invoice; payment: PaymentRecord } {
  const invoice = db.invoices.find((inv) => inv.id === input.invoiceId);
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "DRAFT") throw new Error("Invoice must be approved before payment");

  const remaining = Number((invoice.total - invoice.paidAmount).toFixed(2));
  if (input.amount <= 0 || input.amount > remaining) {
    throw new Error("Payment amount exceeds remaining balance");
  }

  const payment: PaymentRecord = {
    id: makeId("pay"),
    invoiceId: invoice.id,
    amount: Number(input.amount.toFixed(2)),
    method: input.method,
    createdAt: nowIso()
  };

  db.payments.push(payment);
  invoice.paidAmount = Number((invoice.paidAmount + payment.amount).toFixed(2));

  if (invoice.paidAmount >= invoice.total) {
    invoice.status = "PAID";
  }

  return { invoice, payment };
}
