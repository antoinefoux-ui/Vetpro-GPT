import type {
  AiDraft,
  Appointment,
  AuditEntry,
  Client,
  GdprRequest,
  InventoryItem,
  Invoice,
  PasswordResetToken,
  PaymentRecord,
  Pet,
  PurchaseOrder,
  SystemSettings,
  User
} from "../types/domain.js";

interface DbState {
  users: User[];
  clients: Client[];
  pets: Pet[];
  appointments: Appointment[];
  inventory: InventoryItem[];
  purchaseOrders: PurchaseOrder[];
  invoices: Invoice[];
  payments: PaymentRecord[];
  refreshTokens: Array<{ token: string; userId: string; expiresAt: number }>;
  passwordResetTokens: PasswordResetToken[];
  auditLogs: AuditEntry[];
  gdprRequests: GdprRequest[];
  aiDrafts: AiDraft[];
  settings: SystemSettings;
}

export const db: DbState = {
  users: [],
  clients: [],
  pets: [],
  appointments: [],
  inventory: [
    { id: "item_1", sku: "MED-OTOMAX", name: "Otomax Otic Ointment", unit: "tube", stockOnHand: 12, minStock: 10, unitPrice: 25 },
    { id: "item_2", sku: "MED-CONVENIA", name: "Convenia", unit: "mg", stockOnHand: 1000, minStock: 300, unitPrice: 0.4 }
  ],
  purchaseOrders: [],
  invoices: [],
  payments: [],
  refreshTokens: [],
  passwordResetTokens: [],
  auditLogs: [],
  gdprRequests: [],
  aiDrafts: [
    { id: "draft_1", kind: "CONSULTATION", summary: "Otitis externa suspected, topical treatment discussed.", confidence: 0.91, status: "PENDING_REVIEW", createdAt: new Date().toISOString() },
    { id: "draft_2", kind: "DISCHARGE", summary: "Post-op rest and medication schedule generated.", confidence: 0.86, status: "PENDING_REVIEW", createdAt: new Date().toISOString() }
  ],
  settings: {
    clinicName: "VetPro Clinic",
    timezone: "Europe/Bratislava",
    defaultLanguage: "sk",
    appointmentDefaultMinutes: 30,
    reminder24hEnabled: true
  }
};
