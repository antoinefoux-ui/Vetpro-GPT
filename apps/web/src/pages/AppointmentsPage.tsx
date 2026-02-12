import { FormEvent, useCallback, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { Appointment } from "../types/app";
import { usePolling } from "../hooks/usePolling";

function startOfWeek(date: Date): Date {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const out = new Date(date);
  out.setDate(diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ petId: "", type: "Consultation", startsAt: "", endsAt: "" });

  const load = useCallback(async () => {
    try {
      const response = await api.listAppointments();
      setAppointments(response.items);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  usePolling(load, 5000);

  const weekly = useMemo(() => {
    const weekStart = startOfWeek(new Date());
    const byDay: Record<string, Appointment[]> = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] };
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (const apt of appointments) {
      const date = new Date(apt.startsAt);
      if (date >= weekStart && date < new Date(weekStart.getTime() + 7 * 86400000)) {
        byDay[labels[date.getDay()]].push(apt);
      }
    }
    return byDay;
  }, [appointments]);

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!form.petId || !form.startsAt || !form.endsAt) {
      setError("petId, start and end are required");
      return;
    }

    try {
      await api.createAppointment({
        petId: form.petId,
        type: form.type,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString()
      });
      setForm({ petId: "", type: "Consultation", startsAt: "", endsAt: "" });
      setError(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function updateStatus(id: string, status: Appointment["status"]) {
    try {
      await api.setAppointmentStatus(id, status);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }


  async function assignResource(id: string) {
    const room = prompt("Assign room (e.g., Room 2)") ?? undefined;
    const equipment = prompt("Assign equipment (optional)") ?? undefined;
    try {
      await api.setAppointmentResources(id, room, equipment);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section>
      <h2>Appointments</h2>
      <div className="grid">
        <article className="card">
          <h3>New Appointment</h3>
          <form onSubmit={create} className="form-grid">
            <label>Pet ID<input value={form.petId} onChange={(e) => setForm({ ...form, petId: e.target.value })} /></label>
            <label>Type<input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} /></label>
            <label>Start<input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></label>
            <label>End<input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></label>
            <button type="submit">Book appointment</button>
          </form>
        </article>

        <article className="card">
          <h3>Week View (basic)</h3>
          <table>
            <thead><tr><th>Day</th><th>Appointments</th></tr></thead>
            <tbody>
              {Object.entries(weekly).map(([day, rows]) => (
                <tr key={day}><td>{day}</td><td>{rows.map((r) => `${new Date(r.startsAt).toLocaleTimeString()} ${r.type} (${r.status})`).join("; ") || "—"}</td></tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="card">
          <h3>Calendar Feed</h3>
          <ul>
            {appointments.map((appointment) => (
              <li key={appointment.id}>
                {appointment.type} · {new Date(appointment.startsAt).toLocaleString()} · <strong>{appointment.status}</strong>
                <div className="inline-actions">
{(["CONFIRMED", "CHECKED_IN", "COMPLETED", "CANCELED"] as const).map((status) => (
                    <button key={status} onClick={() => updateStatus(appointment.id, status)}>{status}</button>
                  ))}
                  <button onClick={() => void assignResource(appointment.id)}>Assign room/equipment</button>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </div>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
