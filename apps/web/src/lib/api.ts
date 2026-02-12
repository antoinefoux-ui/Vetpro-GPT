import type { Appointment, Client, InventoryItem, Invoice, PurchaseOrder, UserRole } from "../types/app";

const base = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

function authHeaders() {
  const token = localStorage.getItem("vetpro_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init?.headers ?? {})
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
  me: () => request<{ user: { id: string; fullName: string; email: string; role: UserRole } }>("/auth/me"),
  refresh: (refreshToken: string) => request<{ accessToken: string; refreshToken: string }>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }) }),
  logout: (refreshToken: string) => request<void>("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }),
  requestPasswordReset: (email: string) => request<{ resetToken: string }>("/auth/password-reset/request", { method: "POST", body: JSON.stringify({ email }) }),
  confirmPasswordReset: (resetToken: string, newPassword: string) =>
    request<void>("/auth/password-reset/confirm", { method: "POST", body: JSON.stringify({ resetToken, newPassword }) }),

  listClients: () => request<{ items: Client[] }>("/crm/clients"),
  createClient: (payload: Pick<Client, "firstName" | "lastName" | "email" | "phone">) =>
    request<Client>("/crm/clients", { method: "POST", body: JSON.stringify(payload) }),
  getClientTimeline: (clientId: string) => request<{ items: Array<{ type: string; at: string; payload: unknown }> }>(`/crm/clients/${clientId}/timeline`),

  listAppointments: () => request<{ items: Appointment[] }>("/appointments/calendar"),
  createAppointment: (payload: Omit<Appointment, "id" | "status"> & { veterinarianId?: string; reason?: string }) =>
    request<Appointment>("/appointments/calendar", { method: "POST", body: JSON.stringify(payload) }),
  setAppointmentStatus: (id: string, status: Appointment["status"]) =>
    request<Appointment>(`/appointments/calendar/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  setAppointmentResources: (id: string, room?: string, equipment?: string) =>
    request<Appointment>(`/appointments/calendar/${id}/resources`, { method: "PATCH", body: JSON.stringify({ room, equipment }) }),

  listInvoices: () => request<{ items: Invoice[] }>("/billing/invoices"),
  updateInvoiceDraft: (id: string, lines: Invoice["lines"]) =>
    request<Invoice>(`/billing/invoice-drafts/${id}`, { method: "PATCH", body: JSON.stringify({ lines }) }),
  payInvoice: (id: string, amount: number, method: "CARD" | "CASH" | "BANK_TRANSFER" | "INSURANCE") =>
    request(`/billing/invoices/${id}/pay`, { method: "POST", body: JSON.stringify({ amount, method }) }),

  listInventory: () => request<{ items: InventoryItem[] }>("/inventory/items"),
  lowStock: () => request<{ lowStock: InventoryItem[] }>("/inventory/alerts"),
  listPurchaseOrders: () => request<{ items: PurchaseOrder[] }>("/inventory/purchase-orders"),
  createPurchaseOrder: (supplierName: string, lines: PurchaseOrder["lines"]) =>
    request<PurchaseOrder>("/inventory/purchase-orders", { method: "POST", body: JSON.stringify({ supplierName, lines }) }),
  approvePurchaseOrder: (id: string) => request<PurchaseOrder>(`/inventory/purchase-orders/${id}/approve`, { method: "POST" }),
  receivePurchaseOrder: (id: string) => request<PurchaseOrder>(`/inventory/purchase-orders/${id}/receive`, { method: "POST" }),

  auditLogs: () => request<{ items: Array<{ id: string; action: string; createdAt: string; entityType: string }> }>("/admin/audit-logs"),
  listPermissions: () => request<{ rolePermissions: Record<UserRole, string[]> }>("/admin/permissions"),
  listStaff: () => request<{ items: Array<{ id: string; fullName: string; email: string; role: UserRole }> }>("/admin/staff"),
  updateStaffRole: (id: string, role: UserRole) => request(`/admin/staff/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  listGdprRequests: () => request<{ items: Array<{ id: string; clientId: string; type: string; status: string; createdAt: string }> }>("/admin/gdpr-requests"),
  createGdprRequest: (clientId: string, type: "EXPORT" | "DELETE") =>
    request("/admin/gdpr-requests", { method: "POST", body: JSON.stringify({ clientId, type }) }),
  updateGdprStatus: (id: string, status: "REQUESTED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED") =>
    request(`/admin/gdpr-requests/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  getGdprExportPackage: (clientId: string) => request<{ package: Record<string, unknown> }>(`/admin/gdpr-export/${clientId}`),
  getGdprDeleteCheck: (clientId: string) => request<{ canDeleteNow: boolean; blockers: string[] }>(`/admin/gdpr-delete-check/${clientId}`),

  listAiDrafts: () => request<{ items: Array<{ id: string; kind: string; summary: string; confidence: number; status: string; createdAt: string }> }>("/ai/drafts"),
  updateAiDraftStatus: (id: string, status: "PENDING_REVIEW" | "APPROVED" | "REJECTED") =>
    request(`/ai/drafts/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),

  getSettings: () => request<{ clinicName: string; timezone: string; defaultLanguage: "en" | "sk"; appointmentDefaultMinutes: number; reminder24hEnabled: boolean }>("/admin/settings"),
  updateSettings: (patch: Partial<{ clinicName: string; timezone: string; defaultLanguage: "en" | "sk"; appointmentDefaultMinutes: number; reminder24hEnabled: boolean }>) =>
    request("/admin/settings", { method: "PATCH", body: JSON.stringify(patch) })
};

export const eventStreamUrl = `${base}/realtime/events`;
