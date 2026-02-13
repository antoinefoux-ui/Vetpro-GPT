import type {
  AiDraft,
  Appointment,
  AuditEntry,
  Client,
  EcommerceOrder,
  EcommerceProduct,
  EkasaReceipt,
  GdprRequest,
  ImagingRecord,
  InventoryItem,
  Invoice,
  LabRecord,
  PasswordResetToken,
  PaymentRecord,
  Pet,
  PurchaseOrder,
  RefundRecord,
  StaffCredential,
  SurgeryRecord,
  SystemSettings,
  CommunicationLog,
  ReturnRequest,
  User,
  VaccineRecord,
  WaitlistEntry,
  NoShowRecord
} from "../types/domain.js";

interface DbState {
  users: User[];
  staffCredentials: StaffCredential[];
  clients: Client[];
  pets: Pet[];
  vaccines: VaccineRecord[];
  labs: LabRecord[];
  imaging: ImagingRecord[];
  surgeries: SurgeryRecord[];
  appointments: Appointment[];
  waitlist: WaitlistEntry[];
  noShows: NoShowRecord[];
  inventory: InventoryItem[];
  purchaseOrders: PurchaseOrder[];
  invoices: Invoice[];
  payments: PaymentRecord[];
  refunds: RefundRecord[];
  ekasaReceipts: EkasaReceipt[];
  products: EcommerceProduct[];
  orders: EcommerceOrder[];
  returnRequests: ReturnRequest[];
  communications: CommunicationLog[];
  refreshTokens: Array<{ token: string; userId: string; expiresAt: number }>;
  passwordResetTokens: PasswordResetToken[];
  auditLogs: AuditEntry[];
  gdprRequests: GdprRequest[];
  aiDrafts: AiDraft[];
  settings: SystemSettings;
}

export const db: DbState = {
  users: [],
  staffCredentials: [],
  clients: [],
  pets: [],
  vaccines: [],
  labs: [],
  imaging: [],
  surgeries: [],
  appointments: [],
  waitlist: [],
  noShows: [],
  inventory: [
    { id: "item_1", sku: "MED-OTOMAX", name: "Otomax Otic Ointment", unit: "tube", stockOnHand: 12, minStock: 10, unitPrice: 25 },
    { id: "item_2", sku: "MED-CONVENIA", name: "Convenia", unit: "mg", stockOnHand: 1000, minStock: 300, unitPrice: 0.4 }
  ],
  purchaseOrders: [],
  invoices: [],
  payments: [],
  refunds: [],
  ekasaReceipts: [],
  products: [
    { id: "prd_1", name: "Hill's Prescription Diet 5kg", category: "Food", price: 49.9, stock: 35 },
    { id: "prd_2", name: "Joint Health Supplement", category: "Supplements", price: 24.5, stock: 60 },
    { id: "prd_3", name: "Dental Chews Pack", category: "Dental", price: 12.9, stock: 80 }
  ],
  orders: [],
  returnRequests: [],
  communications: [],
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
    reminder24hEnabled: true,
    integrations: {
      googleCalendarApiKey: "",
      sendgridApiKey: "",
      smsProviderKey: "",
      stripePublicKey: "",
      ekasaEndpoint: ""
    }
  }
};
