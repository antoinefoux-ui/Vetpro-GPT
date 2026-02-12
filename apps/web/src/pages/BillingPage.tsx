import { FormEvent, useCallback, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { Invoice } from "../types/app";
import { usePolling } from "../hooks/usePolling";

export function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [editableLinesJson, setEditableLinesJson] = useState("[]");
  const [error, setError] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({ invoiceId: "", amount: "", method: "CARD" as const });

  const load = useCallback(async () => {
    try {
      const response = await api.listInvoices();
      setInvoices(response.items);
      const first = response.items[0];
      if (first) {
        if (!paymentForm.invoiceId) setPaymentForm((prev) => ({ ...prev, invoiceId: first.id }));
        if (!selectedInvoiceId) {
          setSelectedInvoiceId(first.id);
          setEditableLinesJson(JSON.stringify(first.lines, null, 2));
        }
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [paymentForm.invoiceId, selectedInvoiceId]);

  usePolling(load, 5000);

  const selected = useMemo(() => invoices.find((i) => i.id === selectedInvoiceId), [invoices, selectedInvoiceId]);

  async function submitPayment(event: FormEvent) {
    event.preventDefault();
    const amount = Number(paymentForm.amount);
    if (!paymentForm.invoiceId || Number.isNaN(amount) || amount <= 0) {
      setError("Choose invoice and enter valid amount.");
      return;
    }

    try {
      await api.payInvoice(paymentForm.invoiceId, amount, paymentForm.method);
      setPaymentForm((prev) => ({ ...prev, amount: "" }));
      setError(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function saveDraftLines() {
    if (!selected) return;
    try {
      const lines = JSON.parse(editableLinesJson) as Invoice["lines"];
      await api.updateInvoiceDraft(selected.id, lines);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section>
      <h2>Billing & Checkout</h2>
      <div className="grid">
        <article className="card">
          <h3>Invoices</h3>
          <table>
            <thead><tr><th>#</th><th>Status</th><th>Total</th><th>Paid</th><th>Remaining</th></tr></thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} onClick={() => { setSelectedInvoiceId(invoice.id); setEditableLinesJson(JSON.stringify(invoice.lines, null, 2)); }}>
                  <td>{invoice.number}</td><td>{invoice.status}</td><td>€{invoice.total.toFixed(2)}</td><td>€{invoice.paidAmount.toFixed(2)}</td><td>€{(invoice.total - invoice.paidAmount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="card">
          <h3>Draft Invoice Editor</h3>
          {selected ? <p>{selected.number} · {selected.status}</p> : <p>Select an invoice</p>}
          <textarea rows={10} value={editableLinesJson} onChange={(e) => setEditableLinesJson(e.target.value)} />
          <button onClick={() => void saveDraftLines()}>Save draft lines</button>
        </article>

        <article className="card">
          <h3>Post Payment</h3>
          <form onSubmit={submitPayment} className="form-grid">
            <label>Invoice<select value={paymentForm.invoiceId} onChange={(e) => setPaymentForm({ ...paymentForm, invoiceId: e.target.value })}><option value="">Select invoice</option>{invoices.map((invoice) => <option value={invoice.id} key={invoice.id}>{invoice.number} ({invoice.status})</option>)}</select></label>
            <label>Amount<input value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} /></label>
            <label>Method<select value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as typeof paymentForm.method })}><option value="CARD">CARD</option><option value="CASH">CASH</option><option value="BANK_TRANSFER">BANK_TRANSFER</option><option value="INSURANCE">INSURANCE</option></select></label>
            <button type="submit">Submit payment</button>
          </form>
        </article>
      </div>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
