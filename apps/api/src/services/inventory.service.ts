import { db } from "../store/inMemoryDb.js";
import type { InventoryItem, PurchaseOrder, PurchaseOrderLine } from "../types/domain.js";
import { makeId } from "../utils/id.js";
import { nowIso } from "../utils/time.js";

export function listInventory(): InventoryItem[] {
  return db.inventory;
}

export function adjustInventory(itemId: string, delta: number): InventoryItem {
  const item = db.inventory.find((inv) => inv.id === itemId);
  if (!item) throw new Error("Inventory item not found");
  if (item.stockOnHand + delta < 0) throw new Error(`Insufficient stock for ${item.name}`);
  item.stockOnHand += delta;
  return item;
}

export function lowStockAlerts(): InventoryItem[] {
  return db.inventory.filter((item) => item.stockOnHand <= item.minStock);
}

function sumCost(lines: PurchaseOrderLine[]): number {
  return Number(lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0).toFixed(2));
}

export function listPurchaseOrders(): PurchaseOrder[] {
  return db.purchaseOrders;
}

export function createPurchaseOrder(input: { supplierName: string; lines: PurchaseOrderLine[] }): PurchaseOrder {
  if (input.lines.length === 0) throw new Error("Purchase order requires at least one line");
  for (const line of input.lines) {
    const item = db.inventory.find((i) => i.id === line.itemId);
    if (!item) throw new Error(`Inventory item not found: ${line.itemId}`);
  }

  const po: PurchaseOrder = {
    id: makeId("po"),
    supplierName: input.supplierName,
    status: "DRAFT",
    lines: input.lines,
    totalCost: sumCost(input.lines),
    createdAt: nowIso()
  };

  db.purchaseOrders.unshift(po);
  return po;
}

export function approvePurchaseOrder(id: string): PurchaseOrder {
  const po = db.purchaseOrders.find((p) => p.id === id);
  if (!po) throw new Error("Purchase order not found");
  if (po.status !== "DRAFT") throw new Error("Only draft purchase orders can be approved");
  po.status = "APPROVED";
  return po;
}

export function receivePurchaseOrder(id: string): PurchaseOrder {
  const po = db.purchaseOrders.find((p) => p.id === id);
  if (!po) throw new Error("Purchase order not found");
  if (po.status !== "APPROVED") throw new Error("Only approved purchase orders can be received");

  for (const line of po.lines) {
    adjustInventory(line.itemId, line.quantity);
  }

  po.status = "RECEIVED";
  return po;
}
