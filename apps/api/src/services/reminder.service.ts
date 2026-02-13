import { db } from "../store/inMemoryDb.js";
import { queueCommunication } from "./communication.service.js";

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

export function runReminderSweep(referenceDateIso = new Date().toISOString()): {
  queued: number;
  vaccineDue: number;
  annualExamDue: number;
} {
  const referenceDate = new Date(referenceDateIso);
  let queued = 0;
  let vaccineDue = 0;
  let annualExamDue = 0;

  for (const vaccine of db.vaccines) {
    if (!vaccine.dueAt) continue;
    const dueDate = new Date(vaccine.dueAt);
    const daysUntil = daysBetween(dueDate, referenceDate);
    if (daysUntil < 0 || daysUntil > 30) continue;

    const pet = db.pets.find((p) => p.id === vaccine.petId);
    if (!pet) continue;
    const client = db.clients.find((c) => c.id === pet.clientId);
    if (!client) continue;

    queueCommunication({
      channel: client.email ? "EMAIL" : "SMS",
      recipient: client.email ?? client.phone,
      template: "VACCINE_DUE_REMINDER",
      context: { petId: pet.id, vaccineName: vaccine.vaccineName, dueAt: vaccine.dueAt }
    });
    queued += 1;
    vaccineDue += 1;
  }

  for (const pet of db.pets) {
    const appointments = db.appointments
      .filter((a) => a.petId === pet.id && a.status !== "CANCELED")
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const lastVisit = appointments[appointments.length - 1];
    if (!lastVisit) continue;

    const daysSince = daysBetween(referenceDate, new Date(lastVisit.startsAt));
    if (daysSince < 365) continue;

    const client = db.clients.find((c) => c.id === pet.clientId);
    if (!client) continue;

    queueCommunication({
      channel: client.email ? "EMAIL" : "SMS",
      recipient: client.email ?? client.phone,
      template: "ANNUAL_EXAM_REMINDER",
      context: { petId: pet.id, lastVisit: lastVisit.startsAt, daysSince }
    });
    queued += 1;
    annualExamDue += 1;
  }

  return { queued, vaccineDue, annualExamDue };
}
