import { db } from "../store/inMemoryDb.js";
import type { EkasaReceipt, Invoice, InvoiceLineInput, PaymentRecord, RefundRecord } from "../types/domain.js";
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

function recalcInvoice(invoice: Invoice): Invoice {
  const totals = calculateTotals(invoice.lines);
  invoice.subtotal = totals.subtotal;
  invoice.vatTotal = totals.vatTotal;
  invoice.total = totals.total;
  invoice.receivableAmount = Number((invoice.total - invoice.paidAmount + invoice.refundedAmount).toFixed(2));
  if (invoice.paidAmount === 0) {
    invoice.status = invoice.status === "DRAFT" ? "DRAFT" : "APPROVED";
  } else if (invoice.paidAmount < invoice.total) {
    invoice.status = "PARTIALLY_PAID";
  } else {
    invoice.status = "PAID";
  }
  if (invoice.refundedAmount > 0 && invoice.refundedAmount >= invoice.paidAmount) invoice.status = "REFUNDED";
  return invoice;
}

export function listInvoices(): Invoice[] {
  return db.invoices;
}

export function createInvoiceDraft(input: { clientId: string; petId?: string; lines: InvoiceLineInput[] }): Invoice {
  const client = db.clients.find((c) => c.id === input.clientId);
  if (!client) throw new Error("Client not found");

  const totals = calculateTotals(input.lines.map((line) => ({ ...line, id: makeId("line") })));

  const invoice: Invoice = {
    id: makeId("inv"),
    number: `INV-${invoiceSeq++}`,
    clientId: input.clientId,
    petId: input.petId,
    lines: input.lines.map((line) => ({ ...line, id: makeId("line") })),
    ...totals,
    paidAmount: 0,
    refundedAmount: 0,
    receivableAmount: totals.total,
    status: "DRAFT",
    ekasaStatus: "NOT_SENT",
    createdAt: nowIso()
  };

  db.invoices.push(invoice);
  return invoice;
}

export function updateInvoiceDraft(invoiceId: string, lines: InvoiceLineInput[]): Invoice {
  const invoice = db.invoices.find((inv) => inv.id === invoiceId);
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "DRAFT") throw new Error("Only draft invoices can be edited");

  invoice.lines = lines.map((line) => ({ ...line, id: line.id ?? makeId("line") }));
  return recalcInvoice(invoice);
}

export function addInvoiceLine(invoiceId: string, line: Omit<InvoiceLineInput, "id">): Invoice {
  const invoice = db.invoices.find((inv) => inv.id === invoiceId);
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "DRAFT") throw new Error("Only draft invoices can be edited");
  invoice.lines.push({ ...line, id: makeId("line") });
  return recalcInvoice(invoice);
}

export function updateInvoiceLine(invoiceId: string, lineId: string, patch: Partial<Omit<InvoiceLineInput, "id">>): Invoice {
  const invoice = db.invoices.find((inv) => inv.id === invoiceId);
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "DRAFT") throw new Error("Only draft invoices can be edited");
  const line = invoice.lines.find((row) => row.id === lineId);
  if (!line) throw new Error("Invoice line not found");
  Object.assign(line, patch);
  return recalcInvoice(invoice);
}

export function removeInvoiceLine(invoiceId: string, lineId: string): Invoice {
  const invoice = db.invoices.find((inv) => inv.id === invoiceId);
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "DRAFT") throw new Error("Only draft invoices can be edited");
  invoice.lines = invoice.lines.filter((row) => row.id !== lineId);
  if (invoice.lines.length === 0) throw new Error("Invoice must contain at least one line");
  return recalcInvoice(invoice);
}

export function approveInvoice(invoiceId: string): { invoice: Invoice; lowStockItemNames: string[] } {
  const invoice = db.invoices.find((inv) => inv.id === invoiceId);
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "DRAFT") throw new Error("Only draft invoices can be approved");

  for (const line of invoice.lines) {
    if (line.itemId) adjustInventory(line.itemId, -line.quantity);
  }

  invoice.status = "APPROVED";
  invoice.receivableAmount = Number((invoice.total - invoice.paidAmount).toFixed(2));

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
  recalcInvoice(invoice);

  return { invoice, payment };
}

export function refundInvoice(input: { invoiceId: string; amount: number; reason: string }): { invoice: Invoice; refund: RefundRecord } {
  const invoice = db.invoices.find((inv) => inv.id === input.invoiceId);
  if (!invoice) throw new Error("Invoice not found");
  if (input.amount <= 0) throw new Error("Refund amount must be positive");
  if (input.amount > invoice.paidAmount - invoice.refundedAmount) throw new Error("Refund exceeds paid balance");

  const refund: RefundRecord = {
    id: makeId("ref"),
    invoiceId: invoice.id,
    amount: Number(input.amount.toFixed(2)),
    reason: input.reason,
    createdAt: nowIso()
  };
  db.refunds.push(refund);
  invoice.refundedAmount = Number((invoice.refundedAmount + refund.amount).toFixed(2));
  recalcInvoice(invoice);
  return { invoice, refund };
}

export function receivablesAnalytics() {
  const open = db.invoices.filter((invoice) => invoice.receivableAmount > 0);
  const totalReceivable = open.reduce((sum, invoice) => sum + invoice.receivableAmount, 0);
  const ageDays = (createdAt: string) => Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const buckets = { current: 0, d31to60: 0, d61to90: 0, d90plus: 0 };
  for (const invoice of open) {
    const age = ageDays(invoice.createdAt);
    if (age <= 30) buckets.current += invoice.receivableAmount;
    else if (age <= 60) buckets.d31to60 += invoice.receivableAmount;
    else if (age <= 90) buckets.d61to90 += invoice.receivableAmount;
    else buckets.d90plus += invoice.receivableAmount;
  }
  return {
    totalReceivable: Number(totalReceivable.toFixed(2)),
    openInvoiceCount: open.length,
    overdue30Count: open.filter((invoice) => ageDays(invoice.createdAt) > 30).length,
    agingBuckets: {
      current: Number(buckets.current.toFixed(2)),
      d31to60: Number(buckets.d31to60.toFixed(2)),
      d61to90: Number(buckets.d61to90.toFixed(2)),
      d90plus: Number(buckets.d90plus.toFixed(2))
    },
    byInvoice: open.map((invoice) => ({ id: invoice.id, number: invoice.number, receivableAmount: invoice.receivableAmount, createdAt: invoice.createdAt }))
  };
}

export function fiscalizeInvoice(invoiceId: string): EkasaReceipt {
  const invoice = db.invoices.find((inv) => inv.id === invoiceId);
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.ekasaStatus === "FISCALIZED") throw new Error("Invoice already fiscalized");

  invoice.ekasaStatus = "SENT";
  const receipt: EkasaReceipt = {
    id: makeId("ekasa"),
    invoiceId,
    state: "FISCALIZED",
    okp: `OKP-${invoice.number}-${Date.now()}`,
    qrCode: `QR:${invoice.number}:${invoice.total.toFixed(2)}`,
    issuedAt: nowIso()
  };
  db.ekasaReceipts.push(receipt);
  invoice.ekasaStatus = "FISCALIZED";
  return receipt;
}


export function createNoShowFeeInvoice(input: { clientId: string; petId?: string; amount: number }): Invoice {
  if (input.amount <= 0) throw new Error("Fee amount must be positive");
  const invoice = createInvoiceDraft({
    clientId: input.clientId,
    petId: input.petId,
    lines: [{ description: "No-show fee", quantity: 1, unitPrice: Number(input.amount.toFixed(2)), vatRate: 0.2 }]
  });
  approveInvoice(invoice.id);
  return invoice;
}
