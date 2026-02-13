import { FormEvent, useCallback, useMemo, useState } from "react";
import { api } from "../lib/api";
import { usePolling } from "../hooks/usePolling";
import type { Client, MedicalBundle } from "../types/app";

export function CRMPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [timeline, setTimeline] = useState<Array<{ type: string; at: string }>>([]);
  const [medical, setMedical] = useState<MedicalBundle>({ vaccines: [], labs: [], imaging: [], surgeries: [] });
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });

  const selectedPetId = useMemo(() => clients.find((c) => c.id === selectedClientId)?.pets?.[0]?.id ?? "", [clients, selectedClientId]);

  const loadClients = useCallback(async () => {
    try {
      const response = await api.listClients();
      setClients(response.items);
      if (!selectedClientId && response.items[0]) setSelectedClientId(response.items[0].id);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [selectedClientId]);

  const loadDetails = useCallback(async () => {
    if (!selectedClientId) return;
    try {
      const response = await api.getClientTimeline(selectedClientId);
      setTimeline(response.items.map((item) => ({ type: item.type, at: item.at })));
      const petId = clients.find((c) => c.id === selectedClientId)?.pets?.[0]?.id;
      if (petId) setMedical(await api.getPetMedical(petId));
    } catch (err) {
      setError((err as Error).message);
    }
  }, [clients, selectedClientId]);

  usePolling(loadClients, 8000);
  usePolling(loadDetails, 8000);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.firstName || !form.lastName || !form.phone) return setError("First name, last name and phone are required.");
    try {
      await api.createClient(form);
      setForm({ firstName: "", lastName: "", email: "", phone: "" });
      setError(null);
      await loadClients();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function seedMedical(type: "vaccine" | "lab" | "imaging" | "surgery") {
    if (!selectedPetId) return setError("Select client with pet first");
    try {
      const now = new Date().toISOString();
      if (type === "vaccine") await api.addVaccine({ petId: selectedPetId, vaccineName: "Rabies", administeredAt: now });
      if (type === "lab") await api.addLab({ petId: selectedPetId, testType: "CBC", resultSummary: "Mild leukocytosis", abnormal: true, recordedAt: now });
      if (type === "imaging") await api.addImaging({ petId: selectedPetId, modality: "XRAY", findings: "No fracture", recordedAt: now });
      if (type === "surgery") await api.addSurgery({ petId: selectedPetId, procedureName: "Dental cleaning", startedAt: now, notes: "3 extractions" });
      await loadDetails();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section>
      <h2>CRM + Medical Tabs</h2>
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
            {clients.map((client) => <option key={client.id} value={client.id}>{client.firstName} {client.lastName}</option>)}
          </select>
          <ul>{clients.map((client) => <li key={client.id}>{client.firstName} {client.lastName} — {client.phone} · pets: {client.pets?.length ?? 0}</li>)}</ul>
          <h4>Timeline</h4>
          <ul>{timeline.map((event, idx) => <li key={`${event.at}-${idx}`}>{event.type} · {new Date(event.at).toLocaleString()}</li>)}</ul>
        </article>

        <article className="card">
          <h3>Medical Sub-tabs</h3>
          <div className="inline-actions">
            <button onClick={() => void seedMedical("vaccine")}>Add Vaccine</button>
            <button onClick={() => void seedMedical("lab")}>Add Lab</button>
            <button onClick={() => void seedMedical("imaging")}>Add Imaging</button>
            <button onClick={() => void seedMedical("surgery")}>Add Surgery</button>
          </div>
          <p><strong>Vaccines:</strong> {medical.vaccines.length} | <strong>Labs:</strong> {medical.labs.length} | <strong>Imaging:</strong> {medical.imaging.length} | <strong>Surgeries:</strong> {medical.surgeries.length}</p>
        </article>
      </div>
    </section>
  );
}
