import { useCallback, useState } from "react";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";

export function AIDocsPage() {
  const [drafts, setDrafts] = useState<Array<{ id: string; kind: string; summary: string; confidence: number; status: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await api.listAiDrafts();
      setDrafts(response.items);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  usePolling(load, 6000);

  async function setStatus(id: string, status: "PENDING_REVIEW" | "APPROVED" | "REJECTED") {
    try {
      await api.updateAiDraftStatus(id, status);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section>
      <h2>AI Documentation Workflow</h2>
      <div className="grid">
        <article className="card">
          <h3>Live Transcript (planned wireframe)</h3>
          <p className="muted">Real-time stream panel and diarization labels will be rendered here.</p>
          <pre className="transcript">[12:00:02] Dr. Smith: Temperature is 38.9…
[12:00:07] Owner: Max has been scratching his ear…</pre>
        </article>
        <article className="card">
          <h3>AI Draft Approval Queue</h3>
          {error ? <p className="error">{error}</p> : null}
          <ul>
            {drafts.map((draft) => (
              <li key={draft.id}>
                {draft.kind} · confidence {draft.confidence.toFixed(2)} · {draft.status}
                <p className="muted">{draft.summary}</p>
                <div className="inline-actions">
                  <button onClick={() => void setStatus(draft.id, "APPROVED")}>Approve</button>
                  <button onClick={() => void setStatus(draft.id, "REJECTED")}>Reject</button>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
