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
  id?: string;
  itemId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

export interface Invoice {
  id: string;
  number: string;
  status: "DRAFT" | "APPROVED" | "PARTIALLY_PAID" | "PAID" | "REFUNDED";
  total: number;
  paidAmount: number;
  refundedAmount: number;
  receivableAmount: number;
  ekasaStatus: "NOT_SENT" | "SENT" | "FISCALIZED";
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

export interface MedicalBundle {
  vaccines: Array<{ id: string; vaccineName: string; administeredAt: string; dueAt?: string }>;
  labs: Array<{ id: string; testType: string; resultSummary: string; abnormal: boolean; recordedAt: string }>;
  imaging: Array<{ id: string; modality: string; findings: string; recordedAt: string }>;
  surgeries: Array<{ id: string; procedureName: string; startedAt: string; endedAt?: string }>;
}

export interface EcommerceProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

export interface EcommerceOrder {
  id: string;
  email: string;
  status: "CART" | "PLACED" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELED" | "REFUNDED";
  lines: Array<{ productId: string; quantity: number; unitPrice: number }>;
  subtotal: number;
  taxTotal: number;
  shippingCost: number;
  total: number;
}

export interface StaffCredential {
  id: string;
  userId: string;
  credentialType: "DVM" | "RVT" | "CPR" | "XRAY" | "OTHER";
  credentialNumber?: string;
  expiresAt?: string;
  status: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED";
}


export interface WaitlistEntry {
  id: string;
  petId: string;
  reason: string;
  preferredDate?: string;
  status: "WAITING" | "CONTACTED" | "BOOKED" | "CANCELED";
  createdAt: string;
}


export interface NoShowRecord {
  id: string;
  appointmentId: string;
  clientId: string;
  petId: string;
  reason?: string;
  createdAt: string;
}


export interface ReturnRequest {
  id: string;
  orderId: string;
  reason: string;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "REFUNDED";
  createdAt: string;
}
