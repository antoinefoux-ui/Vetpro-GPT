export type UserRole = "ADMIN" | "VETERINARIAN" | "NURSE" | "RECEPTIONIST" | "SHOP_STAFF";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
}

export interface StaffCredential {
  id: string;
  userId: string;
  credentialType: "DVM" | "RVT" | "CPR" | "XRAY" | "OTHER";
  credentialNumber?: string;
  expiresAt?: string;
  status: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED";
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

export interface VaccineRecord {
  id: string;
  petId: string;
  vaccineName: string;
  administeredAt: string;
  dueAt?: string;
  batchNumber?: string;
  veterinarianId?: string;
  notes?: string;
}

export interface LabRecord {
  id: string;
  petId: string;
  testType: string;
  resultSummary: string;
  abnormal: boolean;
  recordedAt: string;
}

export interface ImagingRecord {
  id: string;
  petId: string;
  modality: "XRAY" | "ULTRASOUND" | "CT" | "MRI";
  findings: string;
  recordedAt: string;
}

export interface SurgeryRecord {
  id: string;
  petId: string;
  procedureName: string;
  surgeonId?: string;
  startedAt: string;
  endedAt?: string;
  notes?: string;
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



export interface NoShowRecord {
  id: string;
  appointmentId: string;
  clientId: string;
  petId: string;
  reason?: string;
  createdAt: string;
}

export interface WaitlistEntry {
  id: string;
  petId: string;
  reason: string;
  preferredDate?: string;
  status: "WAITING" | "CONTACTED" | "BOOKED" | "CANCELED";
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
  id?: string;
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

export interface RefundRecord {
  id: string;
  invoiceId: string;
  amount: number;
  reason: string;
  createdAt: string;
}

export interface EkasaReceipt {
  id: string;
  invoiceId: string;
  state: "PENDING" | "FISCALIZED" | "FAILED";
  okp?: string;
  qrCode?: string;
  issuedAt?: string;
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
  refundedAmount: number;
  receivableAmount: number;
  status: "DRAFT" | "APPROVED" | "PAID" | "PARTIALLY_PAID" | "REFUNDED";
  ekasaStatus: "NOT_SENT" | "SENT" | "FISCALIZED";
  createdAt: string;
}

export interface EcommerceProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

export interface EcommerceOrderLine {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface EcommerceOrder {
  id: string;
  clientId?: string;
  email: string;
  status: "CART" | "PLACED" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELED" | "REFUNDED";
  lines: EcommerceOrderLine[];
  subtotal: number;
  shippingCost: number;
  taxTotal: number;
  total: number;
  createdAt: string;
}

export interface CommunicationLog {
  id: string;
  channel: "EMAIL" | "SMS";
  recipient: string;
  template: string;
  status: "QUEUED" | "SENT" | "FAILED";
  context?: Record<string, unknown>;
  createdAt: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  reason: string;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "REFUNDED";
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
  status: "REQUESTED" | "IN_PROGRESS" | "LEGAL_HOLD" | "COMPLETED" | "REJECTED";
  requestedByUserId: string;
  legalHoldReason?: string;
  deletionApprovedBy?: string;
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
  integrations: {
    googleCalendarApiKey?: string;
    sendgridApiKey?: string;
    smsProviderKey?: string;
    stripePublicKey?: string;
    ekasaEndpoint?: string;
  };
  reminderPolicy: {
    vaccineLeadDays: number;
    annualExamIntervalDays: number;
    enabledChannels: Array<"EMAIL" | "SMS">;
  };
}
