import { FormEvent, useCallback, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { Appointment } from "../types/app";
import { usePolling } from "../hooks/usePolling";

export function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [grid, setGrid] = useState<Record<string, Appointment[]>>({});
  const [anchorDate, setAnchorDate] = useState<string>(new Date().toISOString());
  const [error, setError] = useState<string | null>(null);
  const [waitlist, setWaitlist] = useState<Array<{ id: string; petId: string; reason: string; status: string }>>([]);
  const [noShows, setNoShows] = useState<Array<{ id: string; appointmentId: string; clientId: string; petId: string; reason?: string }>>([]);
  const [form, setForm] = useState({ petId: "", type: "Consultation", startsAt: "", endsAt: "" });
  const [waitlistForm, setWaitlistForm] = useState({ petId: "", reason: "Follow-up needed" });

  const load = useCallback(async () => {
    try {
      const [response, gridRes, waitlistRes, noShowRes] = await Promise.all([api.listAppointments(), api.getCalendarGrid(view, anchorDate), api.listWaitlist(), api.listNoShows()]);
      setAppointments(response.items);
      setGrid(gridRes.buckets);
      setWaitlist(waitlistRes.items);
      setNoShows(noShowRes.items);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [anchorDate, view]);

  usePolling(load, 5000);

  const sortedKeys = useMemo(() => Object.keys(grid).sort(), [grid]);

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!form.petId || !form.startsAt || !form.endsAt) return setError("petId, start and end are required");
    try {
      await api.createAppointment({ petId: form.petId, type: form.type, startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString() });
      setForm({ petId: "", type: "Consultation", startsAt: "", endsAt: "" });
      setError(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }


  async function addWaitlist() {
    if (!waitlistForm.petId) return setError("waitlist petId is required");
    try {
      await api.addWaitlist({ petId: waitlistForm.petId, reason: waitlistForm.reason });
      setWaitlistForm({ petId: "", reason: "Follow-up needed" });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function markNoShow(id: string) {
    const reason = prompt("No-show reason", "Client did not arrive") ?? undefined;
    try {
      await api.markNoShow(id, reason);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function moveAppointment(id: string) {
    const startsAt = prompt("New start (ISO)", new Date().toISOString());
    const endsAt = prompt("New end (ISO)", new Date(Date.now() + 30 * 60000).toISOString());
    if (!startsAt || !endsAt) return;
    try {
      await api.moveAppointment(id, startsAt, endsAt);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section>
      <h2>Appointments</h2>
      <div className="inline-actions">
        <label>View
          <select value={view} onChange={(e) => setView(e.target.value as "day" | "week" | "month")}>
            <option value="day">Day</option><option value="week">Week</option><option value="month">Month</option>
          </select>
        </label>
        <label>Anchor Date
          <input type="datetime-local" value={anchorDate.slice(0, 16)} onChange={(e) => setAnchorDate(new Date(e.target.value).toISOString())} />
        </label>
      </div>
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
          <h3>{view.toUpperCase()} Grid</h3>
          <table>
            <thead><tr><th>Bucket</th><th>Slots</th></tr></thead>
            <tbody>
              {sortedKeys.map((key) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td>{grid[key].map((r) => `${new Date(r.startsAt).toLocaleString()} ${r.type} (${r.status})`).join("; ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="card">
          <h3>Calendar Feed + Drag/Drop Simulation</h3>
          <ul>
            {appointments.map((appointment) => (
              <li key={appointment.id}>
                {appointment.type} · {new Date(appointment.startsAt).toLocaleString()} · <strong>{appointment.status}</strong>
                <div className="inline-actions">
                  <button onClick={() => void moveAppointment(appointment.id)}>Move (drag/drop)</button>
                  <button onClick={() => void markNoShow(appointment.id)}>Mark no-show</button>
                  <button onClick={() => void api.setAppointmentResources(appointment.id, "Room 1", "Ultrasound").then(load)}>Assign resources</button>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h3>Waitlist</h3>
          <div className="inline-actions">
            <input placeholder="Pet ID" value={waitlistForm.petId} onChange={(e) => setWaitlistForm({ ...waitlistForm, petId: e.target.value })} />
            <input placeholder="Reason" value={waitlistForm.reason} onChange={(e) => setWaitlistForm({ ...waitlistForm, reason: e.target.value })} />
            <button onClick={() => void addWaitlist()}>Add to waitlist</button>
          </div>
          <ul>
            {waitlist.map((entry) => (
              <li key={entry.id}>
                {entry.petId} · {entry.reason} · {entry.status}
                <div className="inline-actions">
                  <button onClick={() => void api.setWaitlistStatus(entry.id, "CONTACTED").then(load)}>CONTACTED</button>
                  <button onClick={() => void api.setWaitlistStatus(entry.id, "BOOKED").then(load)}>BOOKED</button>
                  <button onClick={() => void api.setWaitlistStatus(entry.id, "CANCELED").then(load)}>CANCELED</button>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </div>


        <article className="card">
          <h3>No-show Log</h3>
          <ul>
            {noShows.map((row) => (
              <li key={row.id}>{row.appointmentId} · pet {row.petId} · client {row.clientId} · {row.reason ?? "No reason"}</li>
            ))}
          </ul>
        </article>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
