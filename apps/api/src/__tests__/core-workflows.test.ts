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
import { addWaitlistEntry, createAppointment, markNoShow, updateWaitlistStatus } from "../services/scheduling.service.js";
import { approveInvoice, createInvoiceDraft, createNoShowFeeInvoice, fiscalizeInvoice, postInvoicePayment, refundInvoice } from "../services/billing.service.js";
import { approveDeletion, createGdprRequest, executeDeletion, placeLegalHold, setGdprRequestStatus } from "../services/gdpr.service.js";
import { addOrderLine, checkoutOrder, createCart, createReturnRequest, updateOrderStatus, updateReturnRequestStatus } from "../services/commerce.service.js";
import { createVaccine } from "../services/clinical.service.js";
import { runReminderSweep } from "../services/reminder.service.js";
import { updateSettings } from "../services/settings.service.js";
import { processQueuedCommunications, queueCommunication, retryFailedCommunications } from "../services/communication.service.js";

function resetDb() {
  db.users = [];
  db.staffCredentials = [];
  db.clients = [];
  db.pets = [];
  db.vaccines = [];
  db.labs = [];
  db.imaging = [];
  db.surgeries = [];
  db.appointments = [];
  db.waitlist = [];
  db.purchaseOrders = [];
  db.invoices = [];
  db.payments = [];
  db.refunds = [];
  db.ekasaReceipts = [];
  db.orders = [];
  db.returnRequests = [];
  db.noShows = [];
  db.communications = [];
  db.refreshTokens = [];
  db.passwordResetTokens = [];
  db.auditLogs = [];
  db.gdprRequests = [];
  db.settings = {
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
    },
    reminderPolicy: {
      vaccineLeadDays: 30,
      annualExamIntervalDays: 365,
      enabledChannels: ["EMAIL", "SMS"]
    }
  };
  db.inventory = [
    { id: "item_1", sku: "MED-OTOMAX", name: "Otomax Otic Ointment", unit: "tube", stockOnHand: 12, minStock: 10, unitPrice: 25 },
    { id: "item_2", sku: "MED-CONVENIA", name: "Convenia", unit: "mg", stockOnHand: 1000, minStock: 300, unitPrice: 0.4 }
  ];
}

test("auth register/login/token + refresh rotation + password reset", async () => {
  resetDb();
  await registerUser({ fullName: "Admin", email: "admin@vetpro.local", password: "password123", role: "ADMIN" });
  const login = await loginUser("admin@vetpro.local", "password123");
  const user = await authenticateToken(login.accessToken);
  assert.equal(user?.email, "admin@vetpro.local");
  assert.equal(user?.role, "ADMIN");

  const rotated = await rotateRefreshToken(login.refreshToken);
  assert.ok(rotated.accessToken.length > 20);
  assert.ok(rotated.refreshToken.length > 20);

  const reset = await requestPasswordReset("admin@vetpro.local");
  await resetPassword(reset.resetToken, "newPassword123");
  const relogin = await loginUser("admin@vetpro.local", "newPassword123");
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

test("billing split payment + refund + fiscalization", () => {
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
  const p1 = postInvoicePayment({ invoiceId: invoice.id, amount: 50, method: "CARD" });
  assert.equal(p1.invoice.status, "PARTIALLY_PAID");
  const p2 = postInvoicePayment({ invoiceId: invoice.id, amount: approved.invoice.total - 50, method: "CASH" });
  assert.equal(p2.invoice.status, "PAID");

  const refund = refundInvoice({ invoiceId: invoice.id, amount: 10, reason: "Customer goodwill" });
  assert.equal(refund.invoice.refundedAmount, 10);
  const receipt = fiscalizeInvoice(invoice.id);
  assert.equal(receipt.state, "FISCALIZED");

  const timeline = getClientTimeline(client.id);
  assert.ok(timeline.some((event) => event.type === "PAYMENT"));
});

test("gdpr legal-hold and deletion approvals", async () => {
  resetDb();
  const admin = await registerUser({ fullName: "Admin", email: "admin@x.com", password: "password123", role: "ADMIN" });
  const client = createClient({ firstName: "Eva", lastName: "Novak", phone: "+421900001111", email: "eva@example.com" });
  const req = createGdprRequest({ clientId: client.id, type: "DELETE", requestedByUserId: admin.id });
  placeLegalHold(req.id, "court order");
  const approved = approveDeletion(req.id, admin.id);
  const updated = setGdprRequestStatus(approved.id, "COMPLETED");
  assert.equal(updated.status, "COMPLETED");
});

test("ecommerce order lifecycle", () => {
  resetDb();
  const order = createCart("buyer@example.com");
  addOrderLine(order.id, "prd_1", 1);
  const placed = checkoutOrder(order.id);
  assert.equal(placed.status, "PLACED");
});


test("waitlist and deletion execution flows", async () => {
  resetDb();
  const admin = await registerUser({ fullName: "Admin", email: "admin@delete.com", password: "password123", role: "ADMIN" });
  const client = createClient({ firstName: "Del", lastName: "User", phone: "+421900002222", email: "del@example.com" });
  const pet = createPet({ clientId: client.id, name: "Milo", species: "Cat" });
  const wait = addWaitlistEntry({ petId: pet.id, reason: "Cancellation fill" });
  updateWaitlistStatus(wait.id, "CONTACTED");
  createAppointment({ petId: pet.id, type: "Consult", startsAt: new Date("2026-01-03T10:00:00.000Z").toISOString(), endsAt: new Date("2026-01-03T10:30:00.000Z").toISOString() });
  const req = createGdprRequest({ clientId: client.id, type: "DELETE", requestedByUserId: admin.id });
  approveDeletion(req.id, admin.id);
  setGdprRequestStatus(req.id, "IN_PROGRESS");
  const result = executeDeletion(client.id);
  assert.equal(result.deleted, true);
  assert.equal(db.clients.find((c) => c.id === client.id), undefined);
});


test("no-show fee and return flow", () => {
  resetDb();
  const client = createClient({ firstName: "Nina", lastName: "NoShow", phone: "+421900003333", email: "nina@example.com" });
  const pet = createPet({ clientId: client.id, name: "Koko", species: "Dog" });
  const apt = createAppointment({ petId: pet.id, type: "Consult", startsAt: new Date("2026-01-04T10:00:00.000Z").toISOString(), endsAt: new Date("2026-01-04T10:30:00.000Z").toISOString() });
  const ns = markNoShow(apt.id, "No arrival");
  assert.equal(ns.clientId, client.id);

  const feeInvoice = createNoShowFeeInvoice({ clientId: client.id, petId: pet.id, amount: 35 });
  assert.equal(feeInvoice.status, "APPROVED");

  const order = createCart("return@example.com");
  addOrderLine(order.id, "prd_1", 1);
  checkoutOrder(order.id);
  updateOrderStatus(order.id, "PAID");
  const ret = createReturnRequest(order.id, "Wrong size");
  const done = updateReturnRequestStatus(ret.id, "REFUNDED");
  assert.equal(done.status, "REFUNDED");
});


test("communication logs are queued for no-show and returns", () => {
  resetDb();
  const client = createClient({ firstName: "Com", lastName: "User", phone: "+421900004444", email: "com@example.com" });
  const pet = createPet({ clientId: client.id, name: "Luna", species: "Cat" });
  const apt = createAppointment({ petId: pet.id, type: "Consult", startsAt: new Date("2026-01-05T10:00:00.000Z").toISOString(), endsAt: new Date("2026-01-05T10:30:00.000Z").toISOString() });
  markNoShow(apt.id, "No answer");
  assert.ok(db.communications.some((m) => m.template === "NO_SHOW_FOLLOW_UP"));

  const order = createCart(client.email ?? "com@example.com");
  addOrderLine(order.id, "prd_1", 1);
  checkoutOrder(order.id);
  updateOrderStatus(order.id, "PAID");
  const ret = createReturnRequest(order.id, "Broken");
  updateReturnRequestStatus(ret.id, "APPROVED");
  assert.ok(db.communications.some((m) => m.template === "RETURN_REQUEST_RECEIVED"));
  assert.ok(db.communications.some((m) => m.template === "RETURN_STATUS_UPDATED"));
});


test("reminder sweep queues vaccine and annual exam reminders", () => {
  resetDb();
  const client = createClient({ firstName: "Rem", lastName: "Client", phone: "+421900005555", email: "rem@example.com" });
  const pet = createPet({ clientId: client.id, name: "Remy", species: "Dog" });

  createVaccine({
    petId: pet.id,
    vaccineName: "Rabies",
    administeredAt: new Date("2026-01-01T10:00:00.000Z").toISOString(),
    dueAt: new Date("2026-01-20T10:00:00.000Z").toISOString()
  });

  createAppointment({
    petId: pet.id,
    type: "Checkup",
    startsAt: new Date("2024-01-01T10:00:00.000Z").toISOString(),
    endsAt: new Date("2024-01-01T10:30:00.000Z").toISOString()
  });

  const result = runReminderSweep(new Date("2026-01-05T10:00:00.000Z").toISOString());
  assert.equal(result.vaccineDue, 1);
  assert.equal(result.annualExamDue, 1);
  assert.ok(db.communications.some((m) => m.template === "VACCINE_DUE_REMINDER"));
  assert.ok(db.communications.some((m) => m.template === "ANNUAL_EXAM_REMINDER"));
});


test("reminder policy and dry-run behavior", () => {
  resetDb();
  const client = createClient({ firstName: "Dry", lastName: "Run", phone: "+421900006666", email: "dry@example.com" });
  const pet = createPet({ clientId: client.id, name: "Nova", species: "Dog" });

  createVaccine({
    petId: pet.id,
    vaccineName: "Distemper",
    administeredAt: new Date("2026-01-01T10:00:00.000Z").toISOString(),
    dueAt: new Date("2026-02-15T10:00:00.000Z").toISOString()
  });

  updateSettings({ reminderPolicy: { vaccineLeadDays: 10, enabledChannels: ["SMS"] } });
  const before = db.communications.length;
  const dryRun = runReminderSweep(new Date("2026-01-05T10:00:00.000Z").toISOString(), { dryRun: true });
  assert.equal(dryRun.queued, 0);
  assert.equal(db.communications.length, before);

  updateSettings({ reminderPolicy: { vaccineLeadDays: 50, enabledChannels: ["SMS"] } });
  const run = runReminderSweep(new Date("2026-01-05T10:00:00.000Z").toISOString());
  assert.equal(run.vaccineDue, 1);
  const queued = db.communications.find((m) => m.template === "VACCINE_DUE_REMINDER");
  assert.equal(queued?.channel, "SMS");
});


test("communication failed messages can be requeued and retried", () => {
  resetDb();
  queueCommunication({ channel: "EMAIL", recipient: "invalid@recipient.local", template: "TEST_FAILURE", context: { forceFail: true } });

  const processed = processQueuedCommunications();
  assert.equal(processed.length, 1);
  assert.equal(processed[0].status, "FAILED");
  assert.equal(processed[0].attempts, 1);

  const retried = retryFailedCommunications();
  assert.equal(retried.length, 1);
  assert.equal(retried[0].status, "QUEUED");

  retried[0].context = { forceFail: false };
  retried[0].recipient = "valid@example.com";
  const processedAgain = processQueuedCommunications();
  assert.equal(processedAgain[0].status, "SENT");
  assert.equal(processedAgain[0].attempts, 2);
});
