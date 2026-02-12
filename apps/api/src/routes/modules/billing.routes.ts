import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permissions.js";
import { approveInvoice, createInvoiceDraft, listInvoices, postInvoicePayment, updateInvoiceDraft } from "../../services/billing.service.js";
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

const draftUpdateSchema = z.object({
  lines: z.array(lineSchema).min(1)
});

const paymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"])
});

export const billingRouter = Router();
billingRouter.use(requireAuth);

billingRouter.get("/invoices", requirePermission("billing.read"), (_req, res) => {
  res.json({ items: listInvoices() });
});

billingRouter.post("/invoice-drafts", requirePermission("billing.write"), async (req, res) => {
  const parsed = draftSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const invoice = createInvoiceDraft(parsed.data);
    await logAuditEvent({
      userId: req.user!.id,
      action: "INVOICE_DRAFT_CREATED",
      entityType: "Invoice",
      entityId: invoice.id,
      metadata: { number: invoice.number, total: invoice.total },
      ipAddress: req.ip
    });
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
    await logAuditEvent({
      userId: req.user!.id,
      action: "INVOICE_DRAFT_UPDATED",
      entityType: "Invoice",
      entityId: invoice.id,
      metadata: { total: invoice.total, lineCount: invoice.lines.length },
      ipAddress: req.ip
    });
    return res.json(invoice);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

billingRouter.post("/invoices/:id/approve", requirePermission("billing.write"), async (req, res) => {
  try {
    const result = approveInvoice(req.params.id);
    await logAuditEvent({
      userId: req.user!.id,
      action: "INVOICE_APPROVED",
      entityType: "Invoice",
      entityId: result.invoice.id,
      metadata: { total: result.invoice.total, lowStock: result.lowStockItemNames },
      ipAddress: req.ip
    });
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
    await logAuditEvent({
      userId: req.user!.id,
      action: "INVOICE_PAYMENT_POSTED",
      entityType: "Payment",
      entityId: result.payment.id,
      metadata: { invoiceId: result.invoice.id, amount: result.payment.amount, method: result.payment.method },
      ipAddress: req.ip
    });
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});
