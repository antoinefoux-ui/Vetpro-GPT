import { db } from "../store/inMemoryDb.js";
import type { Appointment, AppointmentStatus } from "../types/domain.js";
import { makeId } from "../utils/id.js";
import { nowIso } from "../utils/time.js";

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && startB < endA;
}

export function listAppointments(): Appointment[] {
  return db.appointments;
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
