import { db } from "../store/inMemoryDb.js";
import { queueCommunication } from "./communication.service.js";

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function preferredChannel(hasEmail: boolean): "EMAIL" | "SMS" {
  const enabled = db.settings.reminderPolicy.enabledChannels;
  if (hasEmail && enabled.includes("EMAIL")) return "EMAIL";
  if (enabled.includes("SMS")) return "SMS";
  return "EMAIL";
}

export function runReminderSweep(referenceDateIso = new Date().toISOString(), options?: { dryRun?: boolean }): {
  queued: number;
  vaccineDue: number;
  annualExamDue: number;
} {
  const referenceDate = new Date(referenceDateIso);
  const policy = db.settings.reminderPolicy;
  let queued = 0;
  let vaccineDue = 0;
  let annualExamDue = 0;

  for (const vaccine of db.vaccines) {
    if (!vaccine.dueAt) continue;
    const dueDate = new Date(vaccine.dueAt);
    const daysUntil = daysBetween(dueDate, referenceDate);
    if (daysUntil < 0 || daysUntil > policy.vaccineLeadDays) continue;

    const pet = db.pets.find((p) => p.id === vaccine.petId);
    if (!pet) continue;
    const client = db.clients.find((c) => c.id === pet.clientId);
    if (!client) continue;

    if (!options?.dryRun) {
      queueCommunication({
        channel: preferredChannel(Boolean(client.email)),
        recipient: client.email ?? client.phone,
        template: "VACCINE_DUE_REMINDER",
        context: { petId: pet.id, vaccineName: vaccine.vaccineName, dueAt: vaccine.dueAt }
      });
    }
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
    if (daysSince < policy.annualExamIntervalDays) continue;

    const client = db.clients.find((c) => c.id === pet.clientId);
    if (!client) continue;

    if (!options?.dryRun) {
      queueCommunication({
        channel: preferredChannel(Boolean(client.email)),
        recipient: client.email ?? client.phone,
        template: "ANNUAL_EXAM_REMINDER",
        context: { petId: pet.id, lastVisit: lastVisit.startsAt, daysSince }
      });
    }
    queued += 1;
    annualExamDue += 1;
  }

  return { queued, vaccineDue, annualExamDue };
}
