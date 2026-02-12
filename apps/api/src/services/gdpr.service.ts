import { db } from "../store/inMemoryDb.js";
import type { GdprRequest } from "../types/domain.js";
import { makeId } from "../utils/id.js";
import { nowIso } from "../utils/time.js";

export function createGdprRequest(input: {
  clientId: string;
  type: "EXPORT" | "DELETE";
  requestedByUserId: string;
}): GdprRequest {
  const client = db.clients.find((c) => c.id === input.clientId);
  if (!client) throw new Error("Client not found");

  const request: GdprRequest = {
    id: makeId("gdpr"),
    clientId: input.clientId,
    type: input.type,
    status: "REQUESTED",
    requestedByUserId: input.requestedByUserId,
    createdAt: nowIso()
  };

  db.gdprRequests.unshift(request);
  return request;
}

export function listGdprRequests(): GdprRequest[] {
  return db.gdprRequests;
}

export function setGdprRequestStatus(id: string, status: GdprRequest["status"]): GdprRequest {
  const request = db.gdprRequests.find((item) => item.id === id);
  if (!request) throw new Error("GDPR request not found");
  request.status = status;
  return request;
}

export function buildClientExportPackage(clientId: string): Record<string, unknown> {
  const client = db.clients.find((c) => c.id === clientId);
  if (!client) throw new Error("Client not found");

  const pets = db.pets.filter((p) => p.clientId === clientId);
  const petIds = pets.map((p) => p.id);
  const appointments = db.appointments.filter((a) => petIds.includes(a.petId));
  const invoices = db.invoices.filter((i) => i.clientId === clientId);
  const payments = db.payments.filter((p) => invoices.some((i) => i.id === p.invoiceId));

  return { client, pets, appointments, invoices, payments };
}

export function evaluateDeletionImpact(clientId: string): { canDeleteNow: boolean; blockers: string[] } {
  const packageData = buildClientExportPackage(clientId);
  const invoices = (packageData.invoices as Array<{ status: string }>) ?? [];

  const blockers: string[] = [];
  if (invoices.some((invoice) => invoice.status !== "PAID")) {
    blockers.push("Client has unpaid invoices");
  }

  return {
    canDeleteNow: blockers.length === 0,
    blockers
  };
}
