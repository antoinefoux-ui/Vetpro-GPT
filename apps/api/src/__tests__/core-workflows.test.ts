import assert from "node:assert/strict";
import test from "node:test";
import { db } from "../store/inMemoryDb.js";
import {
  authenticateToken,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  rotateRefreshToken
} from "../services/auth.service.js";
import { createClient, createPet, getClientTimeline } from "../services/crm.service.js";
import { createAppointment } from "../services/scheduling.service.js";
import { approveInvoice, createInvoiceDraft, postInvoicePayment } from "../services/billing.service.js";
import { createGdprRequest, setGdprRequestStatus } from "../services/gdpr.service.js";

function resetDb() {
  db.users = [];
  db.clients = [];
  db.pets = [];
  db.appointments = [];
  db.purchaseOrders = [];
  db.invoices = [];
  db.payments = [];
  db.refreshTokens = [];
  db.passwordResetTokens = [];
  db.auditLogs = [];
  db.gdprRequests = [];
  db.inventory = [
    { id: "item_1", sku: "MED-OTOMAX", name: "Otomax Otic Ointment", unit: "tube", stockOnHand: 12, minStock: 10, unitPrice: 25 },
    { id: "item_2", sku: "MED-CONVENIA", name: "Convenia", unit: "mg", stockOnHand: 1000, minStock: 300, unitPrice: 0.4 }
  ];
}

test("auth register/login/token + refresh rotation + password reset", () => {
  resetDb();
  registerUser({ fullName: "Admin", email: "admin@vetpro.local", password: "password123", role: "ADMIN" });
  const login = loginUser("admin@vetpro.local", "password123");
  const user = authenticateToken(login.accessToken);
  assert.equal(user?.email, "admin@vetpro.local");
  assert.equal(user?.role, "ADMIN");

  const rotated = rotateRefreshToken(login.refreshToken);
  assert.ok(rotated.accessToken.length > 20);
  assert.ok(rotated.refreshToken.length > 20);

  const reset = requestPasswordReset("admin@vetpro.local");
  resetPassword(reset.resetToken, "newPassword123");
  const relogin = loginUser("admin@vetpro.local", "newPassword123");
  assert.ok(relogin.accessToken.length > 20);
});

test("crm + scheduling prevents double booking", () => {
  resetDb();
  const client = createClient({ firstName: "John", lastName: "Novak", phone: "+421900000111", email: "john@example.com" });
  const pet = createPet({ clientId: client.id, name: "Max", species: "Dog", breed: "Golden Retriever", weightKg: 10 });

  const start = new Date("2026-01-01T10:00:00.000Z").toISOString();
  const end = new Date("2026-01-01T10:30:00.000Z").toISOString();
  createAppointment({ petId: pet.id, veterinarianId: "vet_1", type: "Consultation", startsAt: start, endsAt: end });

  assert.throws(() =>
    createAppointment({
      petId: pet.id,
      veterinarianId: "vet_1",
      type: "Follow-up",
      startsAt: new Date("2026-01-01T10:15:00.000Z").toISOString(),
      endsAt: new Date("2026-01-01T10:45:00.000Z").toISOString()
    })
  );
});

test("billing approval deducts inventory and payments update timeline", () => {
  resetDb();
  const client = createClient({ firstName: "Jane", lastName: "Smith", phone: "+421900000222", email: "jane@example.com" });
  const pet = createPet({ clientId: client.id, name: "Bella", species: "Dog" });

  const invoice = createInvoiceDraft({
    clientId: client.id,
    petId: pet.id,
    lines: [
      { itemId: "item_1", description: "Otomax", quantity: 2, unitPrice: 25, vatRate: 0.2 },
      { itemId: "item_2", description: "Convenia", quantity: 100, unitPrice: 0.4, vatRate: 0.2 }
    ]
  });

  const approved = approveInvoice(invoice.id);
  assert.equal(approved.invoice.status, "APPROVED");
  const otomax = db.inventory.find((i) => i.id === "item_1");
  assert.equal(otomax?.stockOnHand, 10);
  assert.ok(approved.lowStockItemNames.includes("Otomax Otic Ointment"));

  const paymentResult = postInvoicePayment({ invoiceId: invoice.id, amount: approved.invoice.total, method: "CARD" });
  assert.equal(paymentResult.invoice.status, "PAID");
  assert.equal(paymentResult.invoice.paidAmount, paymentResult.invoice.total);

  const timeline = getClientTimeline(client.id);
  assert.ok(timeline.some((event) => event.type === "PAYMENT"));
});

test("gdpr request lifecycle", () => {
  resetDb();
  const admin = registerUser({ fullName: "Admin", email: "admin@x.com", password: "password123", role: "ADMIN" });
  const client = createClient({ firstName: "Eva", lastName: "Novak", phone: "+421900001111", email: "eva@example.com" });
  const req = createGdprRequest({ clientId: client.id, type: "EXPORT", requestedByUserId: admin.id });
  assert.equal(req.status, "REQUESTED");
  const updated = setGdprRequestStatus(req.id, "COMPLETED");
  assert.equal(updated.status, "COMPLETED");
});
