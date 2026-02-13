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

export function placeLegalHold(id: string, reason: string): GdprRequest {
  const request = db.gdprRequests.find((item) => item.id === id);
  if (!request) throw new Error("GDPR request not found");
  request.status = "LEGAL_HOLD";
  request.legalHoldReason = reason;
  return request;
}

export function approveDeletion(id: string, adminUserId: string): GdprRequest {
  const request = db.gdprRequests.find((item) => item.id === id);
  if (!request) throw new Error("GDPR request not found");
  if (request.type !== "DELETE") throw new Error("Only deletion requests can be approved");
  request.deletionApprovedBy = adminUserId;
  request.status = "IN_PROGRESS";
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

  return {
    client,
    pets,
    appointments,
    invoices,
    payments,
    vaccines: db.vaccines.filter((v) => petIds.includes(v.petId)),
    labs: db.labs.filter((l) => petIds.includes(l.petId)),
    imaging: db.imaging.filter((i) => petIds.includes(i.petId)),
    surgeries: db.surgeries.filter((s) => petIds.includes(s.petId))
  };
}

export function evaluateDeletionImpact(clientId: string): { canDeleteNow: boolean; blockers: string[] } {
  const packageData = buildClientExportPackage(clientId);
  const invoices = (packageData.invoices as Array<{ receivableAmount: number }>) ?? [];

  const blockers: string[] = [];
  if (invoices.some((invoice) => invoice.receivableAmount > 0)) blockers.push("Client has open receivables");
  if (db.gdprRequests.some((r) => r.clientId === clientId && r.status === "LEGAL_HOLD")) blockers.push("Active legal hold exists");

  return {
    canDeleteNow: blockers.length === 0,
    blockers
  };
}

export function executeDeletion(clientId: string): { deleted: boolean; removed: { clients: number; pets: number; appointments: number; invoices: number; payments: number } } {
  const impact = evaluateDeletionImpact(clientId);
  if (!impact.canDeleteNow) throw new Error(`Deletion blocked: ${impact.blockers.join(", ")}`);

  const pets = db.pets.filter((p) => p.clientId === clientId);
  const petIds = pets.map((p) => p.id);
  const invoiceIds = db.invoices.filter((i) => i.clientId === clientId).map((i) => i.id);

  const before = {
    clients: db.clients.length,
    pets: db.pets.length,
    appointments: db.appointments.length,
    invoices: db.invoices.length,
    payments: db.payments.length
  };

  db.clients = db.clients.filter((c) => c.id !== clientId);
  db.pets = db.pets.filter((p) => p.clientId !== clientId);
  db.appointments = db.appointments.filter((a) => !petIds.includes(a.petId));
  db.vaccines = db.vaccines.filter((v) => !petIds.includes(v.petId));
  db.labs = db.labs.filter((l) => !petIds.includes(l.petId));
  db.imaging = db.imaging.filter((i) => !petIds.includes(i.petId));
  db.surgeries = db.surgeries.filter((s) => !petIds.includes(s.petId));
  db.waitlist = db.waitlist.filter((w) => !petIds.includes(w.petId));
  db.invoices = db.invoices.filter((i) => i.clientId !== clientId);
  db.payments = db.payments.filter((p) => !invoiceIds.includes(p.invoiceId));
  db.refunds = db.refunds.filter((r) => !invoiceIds.includes(r.invoiceId));
  db.gdprRequests = db.gdprRequests.map((r) => (r.clientId === clientId && r.type === "DELETE" ? { ...r, status: "COMPLETED" } : r));

  return {
    deleted: true,
    removed: {
      clients: before.clients - db.clients.length,
      pets: before.pets - db.pets.length,
      appointments: before.appointments - db.appointments.length,
      invoices: before.invoices - db.invoices.length,
      payments: before.payments - db.payments.length
    }
  };
}
