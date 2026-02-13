import { db } from "../store/inMemoryDb.js";
import type { EcommerceOrder, EcommerceOrderLine, EcommerceProduct } from "../types/domain.js";
import { makeId } from "../utils/id.js";
import { nowIso } from "../utils/time.js";

function recalc(lines: EcommerceOrderLine[]) {
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const taxTotal = subtotal * 0.2;
  const shippingCost = subtotal > 80 ? 0 : 5;
  const total = subtotal + taxTotal + shippingCost;
  return {
    subtotal: Number(subtotal.toFixed(2)),
    taxTotal: Number(taxTotal.toFixed(2)),
    shippingCost: Number(shippingCost.toFixed(2)),
    total: Number(total.toFixed(2))
  };
}

export function listProducts(): EcommerceProduct[] {
  return db.products;
}

export function createCart(email: string, clientId?: string): EcommerceOrder {
  const order: EcommerceOrder = {
    id: makeId("ord"),
    email,
    clientId,
    status: "CART",
    lines: [],
    subtotal: 0,
    shippingCost: 0,
    taxTotal: 0,
    total: 0,
    createdAt: nowIso()
  };
  db.orders.push(order);
  return order;
}

export function getOrder(orderId: string): EcommerceOrder {
  const order = db.orders.find((row) => row.id === orderId);
  if (!order) throw new Error("Order not found");
  return order;
}

export function addOrderLine(orderId: string, productId: string, quantity: number): EcommerceOrder {
  const order = getOrder(orderId);
  if (order.status !== "CART") throw new Error("Only cart can be edited");
  const product = db.products.find((row) => row.id === productId);
  if (!product) throw new Error("Product not found");
  if (quantity <= 0) throw new Error("Quantity must be positive");

  const existing = order.lines.find((line) => line.productId === productId);
  const nextQty = (existing?.quantity ?? 0) + quantity;
  if (nextQty > product.stock) throw new Error("Insufficient stock");

  if (existing) {
    existing.quantity = nextQty;
  } else {
    order.lines.push({ productId, quantity, unitPrice: product.price });
  }

  Object.assign(order, recalc(order.lines));
  return order;
}

export function checkoutOrder(orderId: string): EcommerceOrder {
  const order = getOrder(orderId);
  if (order.status !== "CART") throw new Error("Order not in cart state");
  if (order.lines.length === 0) throw new Error("Cart is empty");

  for (const line of order.lines) {
    const product = db.products.find((row) => row.id === line.productId);
    if (!product || product.stock < line.quantity) throw new Error("Stock changed; checkout blocked");
  }

  for (const line of order.lines) {
    const product = db.products.find((row) => row.id === line.productId)!;
    product.stock -= line.quantity;
  }

  order.status = "PLACED";
  return order;
}

export function updateOrderStatus(orderId: string, status: EcommerceOrder["status"]): EcommerceOrder {
  const order = getOrder(orderId);
  order.status = status;
  return order;
}


export function listReturnRequests() {
  return db.returnRequests;
}

export function createReturnRequest(orderId: string, reason: string) {
  const order = getOrder(orderId);
  if (!["PAID", "SHIPPED", "DELIVERED"].includes(order.status)) throw new Error("Order not eligible for return request");
  const row = { id: makeId("ret"), orderId, reason, status: "REQUESTED" as const, createdAt: nowIso() };
  db.returnRequests.unshift(row);
  return row;
}

export function updateReturnRequestStatus(id: string, status: "REQUESTED" | "APPROVED" | "REJECTED" | "REFUNDED") {
  const row = db.returnRequests.find((r) => r.id === id);
  if (!row) throw new Error("Return request not found");
  row.status = status;
  if (status === "REFUNDED") {
    const order = getOrder(row.orderId);
    order.status = "REFUNDED";
  }
  return row;
}
