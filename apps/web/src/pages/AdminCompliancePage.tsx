import { FormEvent, useCallback, useState } from "react";
import { api } from "../lib/api";
import { usePolling } from "../hooks/usePolling";
import type { UserRole } from "../types/app";

export function AdminCompliancePage() {
  const [logs, setLogs] = useState<Array<{ id: string; action: string; entityType: string; createdAt: string }>>([]);
  const [staff, setStaff] = useState<Array<{ id: string; fullName: string; email: string; role: UserRole }>>([]);
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [gdpr, setGdpr] = useState<Array<{ id: string; clientId: string; type: string; status: string; createdAt: string }>>([]);
  const [settings, setSettings] = useState({ clinicName: "", timezone: "", defaultLanguage: "en" as "en" | "sk", appointmentDefaultMinutes: 30, reminder24hEnabled: true });
  const [gdprPreview, setGdprPreview] = useState<string>("");
  const [gdprDeleteCheck, setGdprDeleteCheck] = useState<string>("");
  const [form, setForm] = useState({ clientId: "", type: "EXPORT" as "EXPORT" | "DELETE" });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [logRes, staffRes, permRes, gdprRes, settingsRes] = await Promise.all([
        api.auditLogs(),
        api.listStaff(),
        api.listPermissions(),
        api.listGdprRequests(),
        api.getSettings()
      ]);
      setLogs(logRes.items);
      setStaff(staffRes.items);
      setPermissions(permRes.rolePermissions);
      setGdpr(gdprRes.items);
      setSettings(settingsRes);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  usePolling(load, 10000);

  async function changeRole(id: string, role: UserRole) {
    try {
      await api.updateStaffRole(id, role);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function submitGdpr(event: FormEvent) {
    event.preventDefault();
    if (!form.clientId) {
      setError("clientId is required");
      return;
    }

    try {
      await api.createGdprRequest(form.clientId, form.type);
      setForm({ clientId: "", type: "EXPORT" });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function previewGdpr(clientId: string) {
    try {
      const [pkg, check] = await Promise.all([api.getGdprExportPackage(clientId), api.getGdprDeleteCheck(clientId)]);
      setGdprPreview(JSON.stringify(pkg.package, null, 2));
      setGdprDeleteCheck(JSON.stringify(check, null, 2));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function updateGdpr(id: string, status: "REQUESTED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED") {
    try {
      await api.updateGdprStatus(id, status);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    try {
      await api.updateSettings(settings);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section>
      <h2>Admin & Compliance Center</h2>
      {error ? <p className="error">{error}</p> : null}
      <div className="grid">
        <article className="card">
          <h3>System Settings</h3>
          <form className="form-grid" onSubmit={saveSettings}>
            <label>Clinic Name<input value={settings.clinicName} onChange={(e) => setSettings({ ...settings, clinicName: e.target.value })} /></label>
            <label>Timezone<input value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} /></label>
            <label>Language<select value={settings.defaultLanguage} onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value as "en" | "sk" })}><option value="en">en</option><option value="sk">sk</option></select></label>
            <label>Default Appointment Minutes<input value={settings.appointmentDefaultMinutes} onChange={(e) => setSettings({ ...settings, appointmentDefaultMinutes: Number(e.target.value) })} /></label>
            <label><input type="checkbox" checked={settings.reminder24hEnabled} onChange={(e) => setSettings({ ...settings, reminder24hEnabled: e.target.checked })} /> 24h Reminder Enabled</label>
            <button type="submit">Save settings</button>
          </form>
        </article>

        <article className="card">
          <h3>Audit Log Explorer</h3>
          <table><thead><tr><th>Time</th><th>Action</th><th>Entity</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td>{new Date(log.createdAt).toLocaleString()}</td><td>{log.action}</td><td>{log.entityType}</td></tr>)}</tbody></table>
        </article>

        <article className="card">
          <h3>Staff Role Management</h3>
          <table><thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody>{staff.map((member) => <tr key={member.id}><td>{member.fullName}</td><td>{member.email}</td><td><select value={member.role} onChange={(e) => void changeRole(member.id, e.target.value as UserRole)}><option>ADMIN</option><option>VETERINARIAN</option><option>NURSE</option><option>RECEPTIONIST</option><option>SHOP_STAFF</option></select></td></tr>)}</tbody></table>
        </article>

        <article className="card">
          <h3>Role Permission Matrix</h3>
          {Object.entries(permissions).map(([role, perms]) => <div key={role}><strong>{role}</strong><p className="muted">{perms.join(", ")}</p></div>)}
        </article>

        <article className="card">
          <h3>GDPR Request Center</h3>
          <form onSubmit={submitGdpr} className="form-grid">
            <label>Client ID<input value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} /></label>
            <label>Type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "EXPORT" | "DELETE" })}><option value="EXPORT">EXPORT</option><option value="DELETE">DELETE</option></select></label>
            <button type="submit">Create request</button>
          </form>
          <ul>
            {gdpr.map((request) => (
              <li key={request.id}>
                {request.type} · {request.clientId} · {request.status}
                <div className="inline-actions">
                  <button onClick={() => void previewGdpr(request.clientId)}>Preview package/check</button>
                  {(["REQUESTED", "IN_PROGRESS", "COMPLETED", "REJECTED"] as const).map((status) => (
                    <button key={status} onClick={() => void updateGdpr(request.id, status)}>{status}</button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          {gdprPreview ? <pre className="transcript">{gdprPreview}</pre> : null}
          {gdprDeleteCheck ? <pre className="transcript">{gdprDeleteCheck}</pre> : null}
        </article>
      </div>
    </section>
  );
}
