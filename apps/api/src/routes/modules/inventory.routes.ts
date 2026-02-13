import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permissions.js";
import {
  adjustInventory,
  approvePurchaseOrder,
  createPurchaseOrder,
  listInventory,
  listPurchaseOrders,
  lowStockAlerts,
  receivePurchaseOrder
} from "../../services/inventory.service.js";
import { logAuditEvent } from "../../services/audit.service.js";

const adjustSchema = z.object({
  delta: z.number(),
  reason: z.string().optional()
});

const poLineSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().positive(),
  unitCost: z.number().nonnegative()
});

const poSchema = z.object({
  supplierName: z.string().min(1),
  lines: z.array(poLineSchema).min(1)
});

export const inventoryRouter = Router();
inventoryRouter.use(requireAuth);

inventoryRouter.get("/items", requirePermission("inventory.read"), (_req, res) => {
  res.json({ items: listInventory() });
});

inventoryRouter.get("/alerts", requirePermission("inventory.read"), (_req, res) => {
  res.json({ lowStock: lowStockAlerts() });
});

inventoryRouter.post("/items/:id/adjust", requirePermission("inventory.write"), async (req, res) => {
  const parsed = adjustSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const item = adjustInventory(req.params.id, parsed.data.delta);
    await logAuditEvent({
      userId: req.user!.id,
      action: "INVENTORY_ADJUSTED",
      entityType: "InventoryItem",
      entityId: item.id,
      metadata: { delta: parsed.data.delta, reason: parsed.data.reason, stockOnHand: item.stockOnHand },
      ipAddress: req.ip
    });
    return res.json({ item });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

inventoryRouter.get("/purchase-orders", requirePermission("inventory.read"), (_req, res) => {
  res.json({ items: listPurchaseOrders() });
});

inventoryRouter.post("/purchase-orders", requirePermission("inventory.write"), async (req, res) => {
  const parsed = poSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const po = createPurchaseOrder(parsed.data);
    await logAuditEvent({
      userId: req.user!.id,
      action: "PO_CREATED",
      entityType: "PurchaseOrder",
      entityId: po.id,
      metadata: { supplier: po.supplierName, totalCost: po.totalCost },
      ipAddress: req.ip
    });
    return res.status(201).json(po);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

inventoryRouter.post("/purchase-orders/:id/approve", requirePermission("inventory.write"), async (req, res) => {
  try {
    const po = approvePurchaseOrder(req.params.id);
    await logAuditEvent({
      userId: req.user!.id,
      action: "PO_APPROVED",
      entityType: "PurchaseOrder",
      entityId: po.id,
      ipAddress: req.ip
    });
    return res.json(po);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

inventoryRouter.post("/purchase-orders/:id/receive", requirePermission("inventory.write"), async (req, res) => {
  try {
    const po = receivePurchaseOrder(req.params.id);
    await logAuditEvent({
      userId: req.user!.id,
      action: "PO_RECEIVED",
      entityType: "PurchaseOrder",
      entityId: po.id,
      ipAddress: req.ip
    });
    return res.json(po);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});
