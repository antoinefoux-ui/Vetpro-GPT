import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { eventStreamUrl, websocketUrl } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { useEventStream } from "../hooks/useEventStream";
import { useWebSocket } from "../hooks/useWebSocket";

interface RealtimeStats {
  timestamp: string;
  stats: { clients: number; appointments: number; invoices: number; lowStock: number };
}

function isRealtimeStats(payload: unknown): payload is RealtimeStats {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as Partial<RealtimeStats>;
  if (!candidate.stats || typeof candidate.stats !== "object") return false;
  return (
    typeof candidate.timestamp === "string" &&
    typeof candidate.stats.clients === "number" &&
    typeof candidate.stats.appointments === "number" &&
    typeof candidate.stats.invoices === "number" &&
    typeof candidate.stats.lowStock === "number"
  );
}

export function DashboardPage() {
  const { t } = useI18n();
  const [realtime, setRealtime] = useState<RealtimeStats | null>(null);

  const onData = useCallback((payload: unknown) => {
    if (isRealtimeStats(payload)) {
      setRealtime(payload);
    }
  }, []);

  useEventStream(eventStreamUrl, onData);
  useWebSocket(websocketUrl, onData);

  return (
    <div>
      <header className="page-header stack">
        <h2>{t("dashboard")}</h2>
        <p>Live dashboard now receives server-side real-time events (SSE + WebSocket) in addition to polling patterns.</p>
        <div className="quick-actions">
          <Link className="button-link" to="/crm">Open CRM</Link>
          <Link className="button-link" to="/appointments">Open Calendar</Link>
          <Link className="button-link" to="/billing">Open Checkout</Link>
          <Link className="button-link" to="/inventory">Open Inventory</Link>
          <Link className="button-link" to="/frontend-plan">View Full Plan</Link>
        </div>
      </header>

      <section className="grid">
        <article className="card">
          <h3>Realtime Feed</h3>
          {realtime ? (
            <ul>
              <li>Clients: {realtime.stats.clients}</li>
              <li>Appointments: {realtime.stats.appointments}</li>
              <li>Invoices: {realtime.stats.invoices}</li>
              <li>Low stock items: {realtime.stats.lowStock}</li>
              <li>Last update: {new Date(realtime.timestamp).toLocaleTimeString()}</li>
            </ul>
          ) : (
            <p>Waiting for event stream…</p>
          )}
        </article>

        <article className="card">
          <h3>Phase Progress</h3>
          <p>✅ Foundations across A-E are shipped; module depth and production hardening remain.</p>
        </article>
      </section>
    </div>
  );
}
