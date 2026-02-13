import { db } from "../store/inMemoryDb.js";
import type { Client, Invoice, Pet } from "../types/domain.js";
import { makeId } from "../utils/id.js";
import { nowIso } from "../utils/time.js";

export function listClients(): Array<Client & { pets: Pet[] }> {
  return db.clients.map((client) => ({
    ...client,
    pets: db.pets.filter((pet) => pet.clientId === client.id)
  }));
}

export function getClientById(clientId: string): (Client & { pets: Pet[]; invoices: Invoice[] }) | null {
  const client = db.clients.find((c) => c.id === clientId);
  if (!client) return null;

  const pets = db.pets.filter((pet) => pet.clientId === clientId);
  const invoices = db.invoices.filter((inv) => inv.clientId === clientId);
  return { ...client, pets, invoices };
}

export function getClientTimeline(clientId: string): Array<Record<string, unknown>> {
  const client = db.clients.find((c) => c.id === clientId);
  if (!client) throw new Error("Client not found");

  const petIds = db.pets.filter((pet) => pet.clientId === clientId).map((pet) => pet.id);

  const events = [
    ...db.appointments
      .filter((apt) => petIds.includes(apt.petId))
      .map((apt) => ({ type: "APPOINTMENT", at: apt.startsAt, payload: apt })),
    ...db.invoices
      .filter((inv) => inv.clientId === clientId)
      .map((inv) => ({ type: "INVOICE", at: inv.createdAt, payload: inv })),
    ...db.payments
      .filter((p) => db.invoices.some((inv) => inv.id === p.invoiceId && inv.clientId === clientId))
      .map((payment) => ({ type: "PAYMENT", at: payment.createdAt, payload: payment })),
    ...db.vaccines.filter((v) => petIds.includes(v.petId)).map((v) => ({ type: "VACCINE", at: v.administeredAt, payload: v })),
    ...db.labs.filter((l) => petIds.includes(l.petId)).map((l) => ({ type: "LAB", at: l.recordedAt, payload: l })),
    ...db.imaging.filter((i) => petIds.includes(i.petId)).map((i) => ({ type: "IMAGING", at: i.recordedAt, payload: i })),
    ...db.surgeries.filter((s) => petIds.includes(s.petId)).map((s) => ({ type: "SURGERY", at: s.startedAt, payload: s }))
  ];

  return events.sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

export function createClient(input: Omit<Client, "id" | "createdAt">): Client {
  const client: Client = { id: makeId("cli"), createdAt: nowIso(), ...input };
  db.clients.push(client);
  return client;
}

export function createPet(input: Omit<Pet, "id" | "createdAt">): Pet {
  const owner = db.clients.find((c) => c.id === input.clientId);
  if (!owner) throw new Error("Client not found");

  const pet: Pet = { id: makeId("pet"), createdAt: nowIso(), ...input };
  db.pets.push(pet);
  return pet;
}
