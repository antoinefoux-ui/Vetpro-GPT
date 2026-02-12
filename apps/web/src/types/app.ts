export type UserRole = "ADMIN" | "VETERINARIAN" | "NURSE" | "RECEPTIONIST" | "SHOP_STAFF";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  pets?: Array<{ id: string; name: string; species: string }>;
}

export interface Appointment {
  id: string;
  petId: string;
  room?: string;
  equipment?: string;
  type: string;
  startsAt: string;
  endsAt: string;
  status: "SCHEDULED" | "CONFIRMED" | "CHECKED_IN" | "COMPLETED" | "CANCELED";
}

export interface InvoiceLine {
  itemId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

export interface Invoice {
  id: string;
  number: string;
  status: "DRAFT" | "APPROVED" | "PAID";
  total: number;
  paidAmount: number;
  lines: InvoiceLine[];
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  stockOnHand: number;
  minStock: number;
  unit: string;
}

export interface PurchaseOrder {
  id: string;
  supplierName: string;
  status: "DRAFT" | "APPROVED" | "RECEIVED";
  totalCost: number;
  createdAt: string;
  lines: Array<{ itemId: string; quantity: number; unitCost: number }>;
}
