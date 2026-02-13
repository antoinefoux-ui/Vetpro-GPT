import { db } from "../store/inMemoryDb.js";
import type { Appointment, AppointmentStatus, NoShowRecord, WaitlistEntry } from "../types/domain.js";
import { makeId } from "../utils/id.js";
import { nowIso } from "../utils/time.js";
import { queueCommunication } from "./communication.service.js";

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && startB < endA;
}

function inRange(value: Date, from: Date, to: Date): boolean {
  return value >= from && value < to;
}

export function listAppointments(): Appointment[] {
  return db.appointments;
}

export function listAppointmentsByRange(fromIso: string, toIso: string): Appointment[] {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  return db.appointments.filter((apt) => inRange(new Date(apt.startsAt), from, to));
}

export function createAppointment(input: Omit<Appointment, "id" | "createdAt" | "status"> & { status?: Appointment["status"] }): Appointment {
  const pet = db.pets.find((p) => p.id === input.petId);
  if (!pet) throw new Error("Pet not found");

  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (!(startsAt < endsAt)) throw new Error("Invalid appointment time range");

  const vetConflicts = db.appointments.some((existing) => {
    if (!input.veterinarianId || existing.veterinarianId !== input.veterinarianId) return false;
    if (existing.status === "CANCELED") return false;
    return overlaps(startsAt, endsAt, new Date(existing.startsAt), new Date(existing.endsAt));
  });

  if (vetConflicts) throw new Error("Double booking detected for veterinarian");

  const appointment: Appointment = {
    id: makeId("apt"),
    createdAt: nowIso(),
    status: input.status ?? "SCHEDULED",
    ...input
  };

  db.appointments.push(appointment);

  const waitlistMatch = db.waitlist.find((entry) => entry.petId === input.petId && entry.status === "WAITING");
  if (waitlistMatch) waitlistMatch.status = "BOOKED";

  return appointment;
}

export function updateAppointmentStatus(appointmentId: string, status: AppointmentStatus): Appointment {
  const appointment = db.appointments.find((apt) => apt.id === appointmentId);
  if (!appointment) throw new Error("Appointment not found");
  appointment.status = status;
  return appointment;
}

export function assignAppointmentResources(appointmentId: string, input: { room?: string; equipment?: string }): Appointment {
  const appointment = db.appointments.find((apt) => apt.id === appointmentId);
  if (!appointment) throw new Error("Appointment not found");
  appointment.room = input.room;
  appointment.equipment = input.equipment;
  return appointment;
}

export function moveAppointment(appointmentId: string, startsAt: string, endsAt: string): Appointment {
  const appointment = db.appointments.find((apt) => apt.id === appointmentId);
  if (!appointment) throw new Error("Appointment not found");
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (!(start < end)) throw new Error("Invalid appointment time range");

  const conflict = db.appointments.some((existing) => {
    if (existing.id === appointment.id || existing.status === "CANCELED") return false;
    if (!appointment.veterinarianId || existing.veterinarianId !== appointment.veterinarianId) return false;
    return overlaps(start, end, new Date(existing.startsAt), new Date(existing.endsAt));
  });

  if (conflict) throw new Error("Cannot move appointment due to conflict");
  appointment.startsAt = startsAt;
  appointment.endsAt = endsAt;
  return appointment;
}

export function calendarGrid(view: "day" | "week" | "month", anchorDateIso: string): Record<string, Appointment[]> {
  const anchor = new Date(anchorDateIso);
  if (Number.isNaN(anchor.getTime())) throw new Error("Invalid anchor date");

  let from = new Date(anchor);
  let to = new Date(anchor);

  if (view === "day") {
    from.setHours(0, 0, 0, 0);
    to = new Date(from);
    to.setDate(to.getDate() + 1);
  } else if (view === "week") {
    const day = from.getDay();
    const diff = from.getDate() - day + (day === 0 ? -6 : 1);
    from.setDate(diff);
    from.setHours(0, 0, 0, 0);
    to = new Date(from);
    to.setDate(to.getDate() + 7);
  } else {
    from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
  }

  const result: Record<string, Appointment[]> = {};
  for (const apt of listAppointmentsByRange(from.toISOString(), to.toISOString())) {
    const key = view === "month" ? apt.startsAt.slice(0, 10) : apt.startsAt.slice(0, 13);
    if (!result[key]) result[key] = [];
    result[key].push(apt);
  }
  return result;
}

export function listWaitlist(): WaitlistEntry[] {
  return db.waitlist;
}

export function addWaitlistEntry(input: { petId: string; reason: string; preferredDate?: string }): WaitlistEntry {
  const pet = db.pets.find((p) => p.id === input.petId);
  if (!pet) throw new Error("Pet not found");
  const row: WaitlistEntry = {
    id: makeId("wlt"),
    petId: input.petId,
    reason: input.reason,
    preferredDate: input.preferredDate,
    status: "WAITING",
    createdAt: nowIso()
  };
  db.waitlist.unshift(row);
  return row;
}

export function updateWaitlistStatus(id: string, status: WaitlistEntry["status"]): WaitlistEntry {
  const row = db.waitlist.find((entry) => entry.id === id);
  if (!row) throw new Error("Waitlist entry not found");
  row.status = status;
  return row;
}

export function markNoShow(appointmentId: string, reason?: string): NoShowRecord {
  const appointment = db.appointments.find((apt) => apt.id === appointmentId);
  if (!appointment) throw new Error("Appointment not found");
  appointment.status = "CANCELED";

  const pet = db.pets.find((p) => p.id === appointment.petId);
  if (!pet) throw new Error("Pet not found");

  const row: NoShowRecord = {
    id: makeId("noshow"),
    appointmentId,
    petId: appointment.petId,
    clientId: pet.clientId,
    reason,
    createdAt: nowIso()
  };
  db.noShows.unshift(row);
  const client = db.clients.find((c) => c.id === pet.clientId);
  if (client?.phone) {
    queueCommunication({
      channel: "SMS",
      recipient: client.phone,
      template: "NO_SHOW_FOLLOW_UP",
      context: { appointmentId, petId: pet.id, reason }
    });
  }
  return row;
}

export function listNoShows(): NoShowRecord[] {
  return db.noShows;
}
