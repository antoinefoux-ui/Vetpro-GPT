import type { Appointment, Client, InventoryItem, Invoice, PurchaseOrder, UserRole } from "../types/app";

const base = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

function authHeaders() {
  const token = localStorage.getItem("vetpro_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...authHeaders(),
    ...(init?.headers as Record<string, string> ?? {})
  };

  const response = await fetch(`${base}${path}`, {
    ...init,
    headers
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error ?? `Request failed: ${response.status}`);
  }

  if (response.status === 204) return {} as T;
  return response.json() as Promise<T>;
}

// ... rest of your api object stays the same
