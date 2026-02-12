export type UserRole = "ADMIN" | "VETERINARIAN" | "NURSE" | "RECEPTIONIST" | "SHOP_STAFF";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  createdAt: string;
}

export interface Pet {
  id: string;
  clientId: string;
  name: string;
  species: string;
  breed?: string;
  weightKg?: number;
  createdAt: string;
}

export type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "CHECKED_IN" | "COMPLETED" | "CANCELED";

export interface Appointment {
  id: string;
  petId: string;
  veterinarianId?: string;
  room?: string;
  equipment?: string;
  type: string;
  reason?: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  stockOnHand: number;
  minStock: number;
  unitPrice: number;
}

export interface PurchaseOrderLine {
  itemId: string;
  quantity: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  supplierName: string;
  status: "DRAFT" | "APPROVED" | "RECEIVED";
  lines: PurchaseOrderLine[];
  totalCost: number;
  createdAt: string;
}

export interface InvoiceLineInput {
  itemId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  amount: number;
  method: "CASH" | "CARD" | "BANK_TRANSFER" | "INSURANCE";
  createdAt: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  petId?: string;
  number: string;
  lines: InvoiceLineInput[];
  subtotal: number;
  vatTotal: number;
  total: number;
  paidAmount: number;
  status: "DRAFT" | "APPROVED" | "PAID";
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface PasswordResetToken {
  token: string;
  userId: string;
  expiresAt: number;
}

export interface GdprRequest {
  id: string;
  clientId: string;
  type: "EXPORT" | "DELETE";
  status: "REQUESTED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  requestedByUserId: string;
  createdAt: string;
}

export interface AiDraft {
  id: string;
  kind: "CONSULTATION" | "SURGERY" | "DISCHARGE";
  summary: string;
  confidence: number;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export interface SystemSettings {
  clinicName: string;
  timezone: string;
  defaultLanguage: "en" | "sk";
  appointmentDefaultMinutes: number;
  reminder24hEnabled: boolean;
}
