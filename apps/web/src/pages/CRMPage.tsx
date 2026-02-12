import { FormEvent, useCallback, useState } from "react";
import { api } from "../lib/api";
import { usePolling } from "../hooks/usePolling";
import type { Client } from "../types/app";

export function CRMPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [timeline, setTimeline] = useState<Array<{ type: string; at: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });

  const loadClients = useCallback(async () => {
    try {
      const response = await api.listClients();
      setClients(response.items);
      if (!selectedClientId && response.items[0]) {
        setSelectedClientId(response.items[0].id);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [selectedClientId]);

  const loadTimeline = useCallback(async () => {
    if (!selectedClientId) return;
    try {
      const response = await api.getClientTimeline(selectedClientId);
      setTimeline(response.items.map((item) => ({ type: item.type, at: item.at })));
    } catch (err) {
      setError((err as Error).message);
    }
  }, [selectedClientId]);

  usePolling(loadClients, 8000);
  usePolling(loadTimeline, 8000);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.firstName || !form.lastName || !form.phone) {
      setError("First name, last name and phone are required.");
      return;
    }

    try {
      await api.createClient(form);
      setForm({ firstName: "", lastName: "", email: "", phone: "" });
      setError(null);
      await loadClients();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section>
      <h2>CRM</h2>
      <div className="split-grid">
        <article className="card">
          <h3>Create Client</h3>
          <form onSubmit={submit} className="form-grid">
            <label>First name<input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label>
            <label>Last name<input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label>
            <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <button type="submit">Create client</button>
          </form>
          {error ? <p className="error">{error}</p> : null}
        </article>

        <article className="card">
          <h3>Client Directory</h3>
          <select aria-label="Select client" value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}>
            <option value="">Select client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.firstName} {client.lastName}</option>
            ))}
          </select>
          <ul>
            {clients.map((client) => (
              <li key={client.id}>{client.firstName} {client.lastName} — {client.phone}</li>
            ))}
          </ul>
          <h4>Timeline</h4>
          <ul>
            {timeline.map((event, idx) => (
              <li key={`${event.at}-${idx}`}>{event.type} · {new Date(event.at).toLocaleString()}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
