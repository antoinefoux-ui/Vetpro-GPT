import { FormEvent, useCallback, useState } from "react";
import { api } from "../lib/api";
import type { StaffCredential, UserRole } from "../types/app";
import { usePolling } from "../hooks/usePolling";

export function AdminCompliancePage() {
  const [logs, setLogs] = useState<Array<{ id: string; action: string; createdAt: string; entityType: string }>>([]);
  const [staff, setStaff] = useState<Array<{ id: string; fullName: string; email: string; role: UserRole }>>([]);
  const [credentials, setCredentials] = useState<StaffCredential[]>([]);
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [gdpr, setGdpr] = useState<Array<{ id: string; clientId: string; type: string; status: string; createdAt: string }>>([]);
  const [settings, setSettings] = useState({ clinicName: "", timezone: "Europe/Bratislava", defaultLanguage: "sk" as "en" | "sk", appointmentDefaultMinutes: 30, reminder24hEnabled: true, integrations: { googleCalendarApiKey: "", sendgridApiKey: "", smsProviderKey: "", stripePublicKey: "", ekasaEndpoint: "" }, reminderPolicy: { vaccineLeadDays: 30, annualExamIntervalDays: 365, enabledChannels: ["EMAIL", "SMS"] as Array<"EMAIL" | "SMS"> }, communicationPolicy: { maxAttempts: 3 } });
  const [communications, setCommunications] = useState<Array<{ id: string; channel: "EMAIL" | "SMS"; recipient: string; template: string; status: "QUEUED" | "SENT" | "FAILED"; attempts: number; lastAttemptAt?: string; errorMessage?: string; createdAt: string }>>([]);
  const [gdprPreview, setGdprPreview] = useState("");
  const [gdprDeleteCheck, setGdprDeleteCheck] = useState("");
  const [form, setForm] = useState({ clientId: "", type: "EXPORT" as "EXPORT" | "DELETE" });
  const [credentialForm, setCredentialForm] = useState({ userId: "", credentialType: "DVM" as StaffCredential["credentialType"], credentialNumber: "", expiresAt: "" });
  const [error, setError] = useState<string | null>(null);
  const [reminderResult, setReminderResult] = useState<{ queued: number; vaccineDue: number; annualExamDue: number } | null>(null);
  const [reminderRunDate, setReminderRunDate] = useState("");

  const load = useCallback(async () => {
    try {
      const [logRes, staffRes, permRes, gdprRes, settingsRes, credRes, commRes] = await Promise.all([
        api.auditLogs(), api.listStaff(), api.listPermissions(), api.listGdprRequests(), api.getSettings(), api.listStaffCredentials(), api.listCommunications()
      ]);
      setLogs(logRes.items);
      setStaff(staffRes.items);
      setPermissions(permRes.rolePermissions);
      setGdpr(gdprRes.items);
      setSettings(settingsRes as typeof settings);
      setCredentials(credRes.items);
      setCommunications(commRes.items);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  usePolling(load, 10000);

  async function changeRole(id: string, role: UserRole) { try { await api.updateStaffRole(id, role); await load(); } catch (err) { setError((err as Error).message); } }
  async function submitGdpr(event: FormEvent) { event.preventDefault(); if (!form.clientId) return setError("clientId is required"); try { await api.createGdprRequest(form.clientId, form.type); setForm({ clientId: "", type: "EXPORT" }); await load(); } catch (err) { setError((err as Error).message); } }
  async function previewGdpr(clientId: string) { try { const [pkg, check] = await Promise.all([api.getGdprExportPackage(clientId), api.getGdprDeleteCheck(clientId)]); setGdprPreview(JSON.stringify(pkg.package, null, 2)); setGdprDeleteCheck(JSON.stringify(check, null, 2)); } catch (err) { setError((err as Error).message); } }
  async function saveSettings(event: FormEvent) { event.preventDefault(); try { await api.updateSettings(settings); await load(); } catch (err) { setError((err as Error).message); } }

  async function runReminders(dryRun: boolean) {
    try {
      const result = await api.runReminderSweep({ dryRun, referenceDateIso: reminderRunDate ? new Date(reminderRunDate).toISOString() : undefined });
      setReminderResult(result);
      await load();
    } catch (err) { setError((err as Error).message); }
  }

  async function createCredential(event: FormEvent) {
    event.preventDefault();
    try {
      await api.createStaffCredential({ ...credentialForm, expiresAt: credentialForm.expiresAt ? new Date(credentialForm.expiresAt).toISOString() : undefined });
      setCredentialForm({ userId: "", credentialType: "DVM", credentialNumber: "", expiresAt: "" });
      await load();
    } catch (err) { setError((err as Error).message); }
  }

  return (
    <section>
      <h2>Admin & Compliance Center</h2>
      {error ? <p className="error">{error}</p> : null}
      <div className="grid">
        <article className="card">
          <h3>System Settings & Integrations</h3>
          <form className="form-grid" onSubmit={saveSettings}>
            <label>Clinic Name<input value={settings.clinicName} onChange={(e) => setSettings({ ...settings, clinicName: e.target.value })} /></label>
            <label>Timezone<input value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} /></label>
            <label>Language<select value={settings.defaultLanguage} onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value as "en" | "sk" })}><option value="en">en</option><option value="sk">sk</option></select></label>
            <label>Vaccine lead days<input type="number" min={0} value={settings.reminderPolicy.vaccineLeadDays} onChange={(e) => setSettings({ ...settings, reminderPolicy: { ...settings.reminderPolicy, vaccineLeadDays: Number(e.target.value) } })} /></label>
            <label>Annual exam interval days<input type="number" min={1} value={settings.reminderPolicy.annualExamIntervalDays} onChange={(e) => setSettings({ ...settings, reminderPolicy: { ...settings.reminderPolicy, annualExamIntervalDays: Number(e.target.value) } })} /></label>
            <label>Reminder channels<select multiple value={settings.reminderPolicy.enabledChannels} onChange={(e) => { const selected = Array.from(e.target.selectedOptions).map((o) => o.value as "EMAIL" | "SMS"); setSettings({ ...settings, reminderPolicy: { ...settings.reminderPolicy, enabledChannels: selected.length ? selected : settings.reminderPolicy.enabledChannels } }); }}><option value="EMAIL">EMAIL</option><option value="SMS">SMS</option></select></label>
            <label>Communication max attempts<input type="number" min={1} max={10} value={settings.communicationPolicy.maxAttempts} onChange={(e) => setSettings({ ...settings, communicationPolicy: { maxAttempts: Number(e.target.value) } })} /></label>
            <label>Google API key<input value={settings.integrations.googleCalendarApiKey} onChange={(e) => setSettings({ ...settings, integrations: { ...settings.integrations, googleCalendarApiKey: e.target.value } })} /></label>
            <label>SMS Provider<input value={settings.integrations.smsProviderKey} onChange={(e) => setSettings({ ...settings, integrations: { ...settings.integrations, smsProviderKey: e.target.value } })} /></label>
            <label>eKasa Endpoint<input value={settings.integrations.ekasaEndpoint} onChange={(e) => setSettings({ ...settings, integrations: { ...settings.integrations, ekasaEndpoint: e.target.value } })} /></label>
            <button type="submit">Save settings</button>
          </form>
        </article>

        <article className="card">
          <h3>Staff Role & Credential Center</h3>
          <table><thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody>{staff.map((member) => <tr key={member.id}><td>{member.fullName}</td><td>{member.email}</td><td><select value={member.role} onChange={(e) => void changeRole(member.id, e.target.value as UserRole)}><option>ADMIN</option><option>VETERINARIAN</option><option>NURSE</option><option>RECEPTIONIST</option><option>SHOP_STAFF</option></select></td></tr>)}</tbody></table>
          <form className="form-grid" onSubmit={createCredential}>
            <label>User<select value={credentialForm.userId} onChange={(e) => setCredentialForm({ ...credentialForm, userId: e.target.value })}><option value="">Select</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}</select></label>
            <label>Type<select value={credentialForm.credentialType} onChange={(e) => setCredentialForm({ ...credentialForm, credentialType: e.target.value as StaffCredential["credentialType"] })}><option>DVM</option><option>RVT</option><option>CPR</option><option>XRAY</option><option>OTHER</option></select></label>
            <label>Number<input value={credentialForm.credentialNumber} onChange={(e) => setCredentialForm({ ...credentialForm, credentialNumber: e.target.value })} /></label>
            <label>Expires<input type="date" value={credentialForm.expiresAt} onChange={(e) => setCredentialForm({ ...credentialForm, expiresAt: e.target.value })} /></label>
            <button type="submit">Add credential</button>
          </form>
          <ul>{credentials.map((c) => <li key={c.id}>{c.userId} · {c.credentialType} · {c.status}</li>)}</ul>
        </article>

        <article className="card">
          <h3>Role Permission Matrix</h3>
          {Object.entries(permissions).map(([role, perms]) => <div key={role}><strong>{role}</strong><p className="muted">{perms.join(", ")}</p></div>)}
        </article>

        <article className="card">
          <h3>GDPR Legal-hold / Deletion Approvals</h3>
          <form onSubmit={submitGdpr} className="form-grid">
            <label>Client ID<input value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} /></label>
            <label>Type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "EXPORT" | "DELETE" })}><option value="EXPORT">EXPORT</option><option value="DELETE">DELETE</option></select></label>
            <button type="submit">Create request</button>
          </form>
          <ul>{gdpr.map((request) => (<li key={request.id}>{request.type} · {request.clientId} · {request.status}
            <div className="inline-actions">
              <button onClick={() => void previewGdpr(request.clientId)}>Preview package/check</button>
              <button onClick={() => void api.legalHoldGdpr(request.id, "Regulatory investigation").then(load)}>Legal hold</button>
              <button onClick={() => void api.approveDeletionGdpr(request.id).then(load)}>Approve deletion</button>
              <button onClick={() => void api.executeGdprDeletion(request.clientId).then(async (result) => { setGdprDeleteCheck(JSON.stringify(result, null, 2)); await load(); })}>Execute deletion</button>
            </div>
          </li>))}</ul>
          {gdprPreview ? <pre className="transcript">{gdprPreview}</pre> : null}
          {gdprDeleteCheck ? <pre className="transcript">{gdprDeleteCheck}</pre> : null}
        </article>



        <article className="card">
          <h3>Communication Outbox</h3>
          <div className="inline-actions">
            <button onClick={() => void api.processCommunications().then(load)}>Process queued</button>
            <button onClick={() => void api.retryFailedCommunications().then(load)}>Requeue failed</button>
            <label>Reference date<input type="date" value={reminderRunDate} onChange={(e) => setReminderRunDate(e.target.value)} /></label>
            <button onClick={() => void runReminders(false)}>Run reminder sweep</button>
            <button onClick={() => void runReminders(true)}>Dry run reminder sweep</button>
          </div>
          <table>
            <thead><tr><th>Time</th><th>Channel</th><th>Recipient</th><th>Template</th><th>Attempts</th><th>Last Attempt</th><th>Last Error</th><th>Status</th></tr></thead>
            <tbody>
              {communications.map((msg) => (
                <tr key={msg.id}>
                  <td>{new Date(msg.createdAt).toLocaleString()}</td>
                  <td>{msg.channel}</td>
                  <td>{msg.recipient}</td>
                  <td>{msg.template}</td>
                  <td>{msg.attempts}</td>
                  <td>{msg.lastAttemptAt ? new Date(msg.lastAttemptAt).toLocaleString() : "—"}</td>
                  <td>{msg.errorMessage ?? "—"}</td>
                  <td>
                    <select value={msg.status} onChange={(e) => void api.setCommunicationStatus(msg.id, e.target.value as "QUEUED" | "SENT" | "FAILED").then(load)}>
                      <option value="QUEUED">QUEUED</option>
                      <option value="SENT">SENT</option>
                      <option value="FAILED">FAILED</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reminderResult ? <p className="muted">Queued: {reminderResult.queued} (Vaccines: {reminderResult.vaccineDue}, Annual exams: {reminderResult.annualExamDue})</p> : null}
        </article>

        <article className="card">
          <h3>Audit Log Explorer</h3>
          <table><thead><tr><th>Time</th><th>Action</th><th>Entity</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td>{new Date(log.createdAt).toLocaleString()}</td><td>{log.action}</td><td>{log.entityType}</td></tr>)}</tbody></table>
        </article>
      </div>
    </section>
  );
}
