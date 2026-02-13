import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permissions.js";
import {
  addInvoiceLine,
  approveInvoice,
  createInvoiceDraft,
  createNoShowFeeInvoice,
  fiscalizeInvoice,
  listInvoices,
  postInvoicePayment,
  receivablesAnalytics,
  refundInvoice,
  removeInvoiceLine,
  updateInvoiceDraft,
  updateInvoiceLine
} from "../../services/billing.service.js";
import { logAuditEvent } from "../../services/audit.service.js";

const lineSchema = z.object({
  itemId: z.string().optional(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  vatRate: z.number().min(0).max(1)
});

const draftSchema = z.object({
  clientId: z.string().min(1),
  petId: z.string().optional(),
  lines: z.array(lineSchema).min(1)
});

const draftUpdateSchema = z.object({ lines: z.array(lineSchema).min(1) });
const linePatchSchema = lineSchema.partial();

const paymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"])
});

const refundSchema = z.object({ amount: z.number().positive(), reason: z.string().min(2) });
const noShowFeeSchema = z.object({ clientId: z.string().min(1), petId: z.string().optional(), amount: z.number().positive() });

export const billingRouter = Router();
billingRouter.use(requireAuth);

billingRouter.get("/invoices", requirePermission("billing.read"), (_req, res) => {
  res.json({ items: listInvoices() });
});

billingRouter.get("/receivables", requirePermission("billing.read"), (_req, res) => {
  res.json(receivablesAnalytics());
});

billingRouter.post("/no-show-fees", requirePermission("billing.write"), async (req, res) => {
  const parsed = noShowFeeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const invoice = createNoShowFeeInvoice(parsed.data);
    await logAuditEvent({ userId: req.user!.id, action: "NO_SHOW_FEE_CREATED", entityType: "Invoice", entityId: invoice.id, metadata: parsed.data as Record<string, unknown>, ipAddress: req.ip });
    return res.status(201).json(invoice);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});


billingRouter.post("/invoice-drafts", requirePermission("billing.write"), async (req, res) => {
  const parsed = draftSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const invoice = createInvoiceDraft(parsed.data);
    await logAuditEvent({ userId: req.user!.id, action: "INVOICE_DRAFT_CREATED", entityType: "Invoice", entityId: invoice.id, metadata: { number: invoice.number, total: invoice.total }, ipAddress: req.ip });
    return res.status(201).json(invoice);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

billingRouter.patch("/invoice-drafts/:id", requirePermission("billing.write"), async (req, res) => {
  const parsed = draftUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const invoice = updateInvoiceDraft(req.params.id, parsed.data.lines);
    await logAuditEvent({ userId: req.user!.id, action: "INVOICE_DRAFT_UPDATED", entityType: "Invoice", entityId: invoice.id, metadata: { total: invoice.total, lineCount: invoice.lines.length }, ipAddress: req.ip });
    return res.json(invoice);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

billingRouter.post("/invoice-drafts/:id/lines", requirePermission("billing.write"), (req, res) => {
  const parsed = lineSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  try {
    return res.json(addInvoiceLine(req.params.id, parsed.data));
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

billingRouter.patch("/invoice-drafts/:id/lines/:lineId", requirePermission("billing.write"), (req, res) => {
  const parsed = linePatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  try {
    return res.json(updateInvoiceLine(req.params.id, req.params.lineId, parsed.data));
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

billingRouter.delete("/invoice-drafts/:id/lines/:lineId", requirePermission("billing.write"), (req, res) => {
  try {
    return res.json(removeInvoiceLine(req.params.id, req.params.lineId));
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

billingRouter.post("/invoices/:id/approve", requirePermission("billing.write"), async (req, res) => {
  try {
    const result = approveInvoice(req.params.id);
    await logAuditEvent({ userId: req.user!.id, action: "INVOICE_APPROVED", entityType: "Invoice", entityId: result.invoice.id, metadata: { total: result.invoice.total, lowStock: result.lowStockItemNames }, ipAddress: req.ip });
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

billingRouter.post("/invoices/:id/pay", requirePermission("billing.write"), async (req, res) => {
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const result = postInvoicePayment({ invoiceId: req.params.id, ...parsed.data });
    await logAuditEvent({ userId: req.user!.id, action: "INVOICE_PAYMENT_POSTED", entityType: "Payment", entityId: result.payment.id, metadata: { invoiceId: result.invoice.id, amount: result.payment.amount, method: result.payment.method }, ipAddress: req.ip });
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

billingRouter.post("/invoices/:id/refund", requirePermission("billing.write"), async (req, res) => {
  const parsed = refundSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const result = refundInvoice({ invoiceId: req.params.id, ...parsed.data });
    await logAuditEvent({ userId: req.user!.id, action: "INVOICE_REFUNDED", entityType: "Refund", entityId: result.refund.id, metadata: { invoiceId: result.invoice.id, amount: result.refund.amount }, ipAddress: req.ip });
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

billingRouter.post("/invoices/:id/fiscalize", requirePermission("billing.write"), async (req, res) => {
  try {
    const receipt = fiscalizeInvoice(req.params.id);
    await logAuditEvent({ userId: req.user!.id, action: "INVOICE_FISCALIZED", entityType: "EkasaReceipt", entityId: receipt.id, metadata: { invoiceId: receipt.invoiceId, okp: receipt.okp }, ipAddress: req.ip });
    return res.status(201).json(receipt);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});
