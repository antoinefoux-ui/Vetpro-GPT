import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permissions.js";
import { logAuditEvent } from "../../services/audit.service.js";
import { addOrderLine, checkoutOrder, createCart, createReturnRequest, getOrder, listProducts, listReturnRequests, updateOrderStatus, updateReturnRequestStatus } from "../../services/commerce.service.js";

const cartSchema = z.object({ email: z.string().email(), clientId: z.string().optional() });
const addLineSchema = z.object({ productId: z.string().min(1), quantity: z.number().int().positive() });
const statusSchema = z.object({ status: z.enum(["CART", "PLACED", "PAID", "SHIPPED", "DELIVERED", "CANCELED", "REFUNDED"]) });
const returnSchema = z.object({ orderId: z.string().min(1), reason: z.string().min(2) });
const returnStatusSchema = z.object({ status: z.enum(["REQUESTED", "APPROVED", "REJECTED", "REFUNDED"]) });

export const commerceRouter = Router();
commerceRouter.use(requireAuth);

commerceRouter.get("/products", requirePermission("inventory.read"), (_req, res) => {
  res.json({ items: listProducts() });
});

commerceRouter.post("/orders", requirePermission("billing.write"), (req, res) => {
  const parsed = cartSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  return res.status(201).json(createCart(parsed.data.email, parsed.data.clientId));
});

commerceRouter.get("/orders/:id", requirePermission("billing.read"), (req, res) => {
  try {
    return res.json(getOrder(req.params.id));
  } catch (error) {
    return res.status(404).json({ error: (error as Error).message });
  }
});

commerceRouter.post("/orders/:id/lines", requirePermission("billing.write"), async (req, res) => {
  const parsed = addLineSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  try {
    const order = addOrderLine(req.params.id, parsed.data.productId, parsed.data.quantity);
    await logAuditEvent({ userId: req.user!.id, action: "ECOMMERCE_LINE_ADDED", entityType: "Order", entityId: order.id, metadata: parsed.data, ipAddress: req.ip });
    return res.json(order);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

commerceRouter.post("/orders/:id/checkout", requirePermission("billing.write"), async (req, res) => {
  try {
    const order = checkoutOrder(req.params.id);
    await logAuditEvent({ userId: req.user!.id, action: "ECOMMERCE_CHECKOUT", entityType: "Order", entityId: order.id, ipAddress: req.ip });
    return res.json(order);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

commerceRouter.patch("/orders/:id/status", requirePermission("billing.write"), async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  try {
    const order = updateOrderStatus(req.params.id, parsed.data.status);
    await logAuditEvent({ userId: req.user!.id, action: "ECOMMERCE_STATUS_UPDATED", entityType: "Order", entityId: order.id, metadata: parsed.data, ipAddress: req.ip });
    return res.json(order);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

commerceRouter.get("/returns", requirePermission("billing.read"), (_req, res) => {
  return res.json({ items: listReturnRequests() });
});

commerceRouter.post("/returns", requirePermission("billing.write"), async (req, res) => {
  const parsed = returnSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  try {
    const row = createReturnRequest(parsed.data.orderId, parsed.data.reason);
    await logAuditEvent({ userId: req.user!.id, action: "RETURN_REQUEST_CREATED", entityType: "ReturnRequest", entityId: row.id, metadata: parsed.data, ipAddress: req.ip });
    return res.status(201).json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

commerceRouter.patch("/returns/:id/status", requirePermission("billing.write"), async (req, res) => {
  const parsed = returnStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  try {
    const row = updateReturnRequestStatus(req.params.id, parsed.data.status);
    await logAuditEvent({ userId: req.user!.id, action: "RETURN_REQUEST_STATUS_UPDATED", entityType: "ReturnRequest", entityId: row.id, metadata: parsed.data, ipAddress: req.ip });
    return res.json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});
