import type {
  Appointment,
  Client,
  EcommerceOrder,
  EcommerceProduct,
  InventoryItem,
  Invoice,
  MedicalBundle,
  PurchaseOrder,
  StaffCredential,
  UserRole,
  WaitlistEntry,
  NoShowRecord,
  ReturnRequest
} from "../types/app";

const base = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("vetpro_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init?.headers && !(init.headers instanceof Headers) ? (init.headers as Record<string, string>) : {})
    }
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error ?? `Request failed: ${response.status}`);
  }

  if (response.status === 204) return {} as T;
  return response.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; refreshToken: string; user: { id: string; fullName: string; email: string; role: UserRole } }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),
  oauthGoogle: (googleIdToken: string) => request<{ accessToken: string; refreshToken: string; user: { id: string; fullName: string; email: string; role: UserRole } }>("/auth/oauth/google", { method: "POST", body: JSON.stringify({ googleIdToken }) }),
  me: () => request<{ user: { id: string; fullName: string; email: string; role: UserRole } }>("/auth/me"),
  refresh: (refreshToken: string) => request<{ accessToken: string; refreshToken: string }>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }) }),
  logout: (refreshToken: string) => request<void>("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }),
  requestPasswordReset: (email: string) => request<{ resetToken: string }>("/auth/password-reset/request", { method: "POST", body: JSON.stringify({ email }) }),
  confirmPasswordReset: (resetToken: string, newPassword: string) => request<void>("/auth/password-reset/confirm", { method: "POST", body: JSON.stringify({ resetToken, newPassword }) }),

  listClients: () => request<{ items: Client[] }>("/crm/clients"),
  createClient: (payload: Pick<Client, "firstName" | "lastName" | "email" | "phone">) => request<Client>("/crm/clients", { method: "POST", body: JSON.stringify(payload) }),
  createPet: (payload: { clientId: string; name: string; species: string; breed?: string; weightKg?: number }) => request("/crm/pets", { method: "POST", body: JSON.stringify(payload) }),
  getClientTimeline: (clientId: string) => request<{ items: Array<{ type: string; at: string; payload: unknown }> }>(`/crm/clients/${clientId}/timeline`),
  getPetMedical: (petId: string) => request<MedicalBundle>(`/crm/pets/${petId}/medical`),
  addVaccine: (payload: { petId: string; vaccineName: string; administeredAt: string; dueAt?: string; batchNumber?: string; veterinarianId?: string; notes?: string }) => request("/crm/medical/vaccines", { method: "POST", body: JSON.stringify(payload) }),
  addLab: (payload: { petId: string; testType: string; resultSummary: string; abnormal: boolean; recordedAt: string }) => request("/crm/medical/labs", { method: "POST", body: JSON.stringify(payload) }),
  addImaging: (payload: { petId: string; modality: "XRAY" | "ULTRASOUND" | "CT" | "MRI"; findings: string; recordedAt: string }) => request("/crm/medical/imaging", { method: "POST", body: JSON.stringify(payload) }),
  addSurgery: (payload: { petId: string; procedureName: string; surgeonId?: string; startedAt: string; endedAt?: string; notes?: string }) => request("/crm/medical/surgeries", { method: "POST", body: JSON.stringify(payload) }),

  listAppointments: () => request<{ items: Appointment[] }>("/appointments/calendar"),
  getCalendarGrid: (view: "day" | "week" | "month", anchorDate: string) => request<{ buckets: Record<string, Appointment[]> }>(`/appointments/calendar-grid?view=${view}&anchorDate=${encodeURIComponent(anchorDate)}`),
  listWaitlist: () => request<{ items: WaitlistEntry[] }>("/appointments/waitlist"),
  addWaitlist: (payload: { petId: string; reason: string; preferredDate?: string }) => request<WaitlistEntry>("/appointments/waitlist", { method: "POST", body: JSON.stringify(payload) }),
  setWaitlistStatus: (id: string, status: WaitlistEntry["status"]) => request<WaitlistEntry>(`/appointments/waitlist/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  listNoShows: () => request<{ items: NoShowRecord[] }>("/appointments/no-shows"),
  markNoShow: (id: string, reason?: string) => request<NoShowRecord>(`/appointments/calendar/${id}/no-show`, { method: "PATCH", body: JSON.stringify({ reason }) }),
  createAppointment: (payload: Omit<Appointment, "id" | "status"> & { veterinarianId?: string; reason?: string }) => request<Appointment>("/appointments/calendar", { method: "POST", body: JSON.stringify(payload) }),
  setAppointmentStatus: (id: string, status: Appointment["status"]) => request<Appointment>(`/appointments/calendar/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  setAppointmentResources: (id: string, room?: string, equipment?: string) => request<Appointment>(`/appointments/calendar/${id}/resources`, { method: "PATCH", body: JSON.stringify({ room, equipment }) }),
  moveAppointment: (id: string, startsAt: string, endsAt: string) => request<Appointment>(`/appointments/calendar/${id}/move`, { method: "PATCH", body: JSON.stringify({ startsAt, endsAt }) }),

  listInvoices: () => request<{ items: Invoice[] }>("/billing/invoices"),
  receivables: () => request<{ totalReceivable: number; openInvoiceCount: number; overdue30Count: number; agingBuckets: { current: number; d31to60: number; d61to90: number; d90plus: number }; byInvoice: Array<{ id: string; number: string; receivableAmount: number; createdAt: string }> }>("/billing/receivables"),
  updateInvoiceDraft: (id: string, lines: Invoice["lines"]) => request<Invoice>(`/billing/invoice-drafts/${id}`, { method: "PATCH", body: JSON.stringify({ lines }) }),
  addInvoiceLine: (id: string, line: Invoice["lines"][number]) => request<Invoice>(`/billing/invoice-drafts/${id}/lines`, { method: "POST", body: JSON.stringify(line) }),
  updateInvoiceLine: (id: string, lineId: string, patch: Partial<Invoice["lines"][number]>) => request<Invoice>(`/billing/invoice-drafts/${id}/lines/${lineId}`, { method: "PATCH", body: JSON.stringify(patch) }),
  removeInvoiceLine: (id: string, lineId: string) => request<Invoice>(`/billing/invoice-drafts/${id}/lines/${lineId}`, { method: "DELETE" }),
  approveInvoice: (id: string) => request(`/billing/invoices/${id}/approve`, { method: "POST" }),
  payInvoice: (id: string, amount: number, method: "CARD" | "CASH" | "BANK_TRANSFER" | "INSURANCE") => request(`/billing/invoices/${id}/pay`, { method: "POST", body: JSON.stringify({ amount, method }) }),
  refundInvoice: (id: string, amount: number, reason: string) => request(`/billing/invoices/${id}/refund`, { method: "POST", body: JSON.stringify({ amount, reason }) }),
  fiscalizeInvoice: (id: string) => request(`/billing/invoices/${id}/fiscalize`, { method: "POST" }),
  createNoShowFee: (payload: { clientId: string; petId?: string; amount: number }) => request<Invoice>("/billing/no-show-fees", { method: "POST", body: JSON.stringify(payload) }),

  listInventory: () => request<{ items: InventoryItem[] }>("/inventory/items"),
  lowStock: () => request<{ lowStock: InventoryItem[] }>("/inventory/alerts"),
  listPurchaseOrders: () => request<{ items: PurchaseOrder[] }>("/inventory/purchase-orders"),
  createPurchaseOrder: (supplierName: string, lines: PurchaseOrder["lines"]) => request<PurchaseOrder>("/inventory/purchase-orders", { method: "POST", body: JSON.stringify({ supplierName, lines }) }),
  approvePurchaseOrder: (id: string) => request<PurchaseOrder>(`/inventory/purchase-orders/${id}/approve`, { method: "POST" }),
  receivePurchaseOrder: (id: string) => request<PurchaseOrder>(`/inventory/purchase-orders/${id}/receive`, { method: "POST" }),

  listProducts: () => request<{ items: EcommerceProduct[] }>("/commerce/products"),
  createOrder: (email: string, clientId?: string) => request<EcommerceOrder>("/commerce/orders", { method: "POST", body: JSON.stringify({ email, clientId }) }),
  getOrder: (id: string) => request<EcommerceOrder>(`/commerce/orders/${id}`),
  addOrderLine: (id: string, productId: string, quantity: number) => request<EcommerceOrder>(`/commerce/orders/${id}/lines`, { method: "POST", body: JSON.stringify({ productId, quantity }) }),
  checkoutOrder: (id: string) => request<EcommerceOrder>(`/commerce/orders/${id}/checkout`, { method: "POST" }),
  updateOrderStatus: (id: string, status: EcommerceOrder["status"]) => request<EcommerceOrder>(`/commerce/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  listReturns: () => request<{ items: ReturnRequest[] }>("/commerce/returns"),
  createReturn: (orderId: string, reason: string) => request<ReturnRequest>("/commerce/returns", { method: "POST", body: JSON.stringify({ orderId, reason }) }),
  setReturnStatus: (id: string, status: ReturnRequest["status"]) => request<ReturnRequest>(`/commerce/returns/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  auditLogs: () => request<{ items: Array<{ id: string; action: string; createdAt: string; entityType: string }> }>("/admin/audit-logs"),
  listPermissions: () => request<{ rolePermissions: Record<UserRole, string[]> }>("/admin/permissions"),
  listStaff: () => request<{ items: Array<{ id: string; fullName: string; email: string; role: UserRole }> }>("/admin/staff"),
  updateStaffRole: (id: string, role: UserRole) => request(`/admin/staff/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  listCommunications: (limit = 100) => request<{ items: Array<{ id: string; channel: "EMAIL" | "SMS"; recipient: string; template: string; status: "QUEUED" | "SENT" | "FAILED"; attempts: number; lastAttemptAt?: string; errorMessage?: string; createdAt: string }> }>(`/admin/communications?limit=${limit}`),
  processCommunications: () => request<{ processed: Array<{ id: string }> }>("/admin/communications/process", { method: "POST" }),
  retryFailedCommunications: () => request<{ retried: Array<{ id: string }> }>("/admin/communications/retry-failed", { method: "POST" }),
  runReminderSweep: (payload?: { dryRun?: boolean; referenceDateIso?: string }) => request<{ queued: number; vaccineDue: number; annualExamDue: number }>("/admin/communications/reminders/run", { method: "POST", body: JSON.stringify(payload ?? {}) }),
  setCommunicationStatus: (id: string, status: "QUEUED" | "SENT" | "FAILED") => request(`/admin/communications/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  listStaffCredentials: (userId?: string) => request<{ items: StaffCredential[] }>(`/admin/staff/credentials${userId ? `?userId=${userId}` : ""}`),
  createStaffCredential: (payload: { userId: string; credentialType: StaffCredential["credentialType"]; credentialNumber?: string; expiresAt?: string }) => request("/admin/staff/credentials", { method: "POST", body: JSON.stringify(payload) }),
  listGdprRequests: () => request<{ items: Array<{ id: string; clientId: string; type: string; status: string; createdAt: string }> }>("/admin/gdpr-requests"),
  createGdprRequest: (clientId: string, type: "EXPORT" | "DELETE") => request("/admin/gdpr-requests", { method: "POST", body: JSON.stringify({ clientId, type }) }),
  updateGdprStatus: (id: string, status: "REQUESTED" | "IN_PROGRESS" | "LEGAL_HOLD" | "COMPLETED" | "REJECTED") => request(`/admin/gdpr-requests/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  legalHoldGdpr: (id: string, reason: string) => request(`/admin/gdpr-requests/${id}/legal-hold`, { method: "POST", body: JSON.stringify({ reason }) }),
  approveDeletionGdpr: (id: string) => request(`/admin/gdpr-requests/${id}/approve-deletion`, { method: "POST" }),
  getGdprExportPackage: (clientId: string) => request<{ package: Record<string, unknown> }>(`/admin/gdpr-export/${clientId}`),
  getGdprDeleteCheck: (clientId: string) => request<{ canDeleteNow: boolean; blockers: string[] }>(`/admin/gdpr-delete-check/${clientId}`),
  executeGdprDeletion: (clientId: string) => request<{ deleted: boolean; removed: Record<string, number> }>(`/admin/gdpr-delete-execute/${clientId}`, { method: "POST" }),

  listAiDrafts: () => request<{ items: Array<{ id: string; kind: string; summary: string; confidence: number; status: string; createdAt: string }> }>("/ai/drafts"),
  updateAiDraftStatus: (id: string, status: "PENDING_REVIEW" | "APPROVED" | "REJECTED") => request(`/ai/drafts/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),

  getSettings: () => request<{ clinicName: string; timezone: string; defaultLanguage: "en" | "sk"; appointmentDefaultMinutes: number; reminder24hEnabled: boolean; integrations: Record<string, string>; reminderPolicy: { vaccineLeadDays: number; annualExamIntervalDays: number; enabledChannels: Array<"EMAIL" | "SMS"> } }>("/admin/settings"),
  updateSettings: (patch: Record<string, unknown>) => request("/admin/settings", { method: "PATCH", body: JSON.stringify(patch) })
};

export const eventStreamUrl = `${base}/realtime/events`;
export const websocketUrl = `${base.replace("http", "ws")}/realtime/ws`;
