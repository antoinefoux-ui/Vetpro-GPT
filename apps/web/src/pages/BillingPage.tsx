import { FormEvent, useCallback, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { Invoice, InvoiceLine } from "../types/app";
import { usePolling } from "../hooks/usePolling";

const emptyLine: InvoiceLine = { description: "", quantity: 1, unitPrice: 0, vatRate: 0.2 };

export function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [lineEditor, setLineEditor] = useState<InvoiceLine>(emptyLine);
  const [error, setError] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({ invoiceId: "", amount: "", method: "CARD" as const });
  const [refundForm, setRefundForm] = useState({ amount: "", reason: "Client return" });
  const [noShowFeeForm, setNoShowFeeForm] = useState({ clientId: "", petId: "", amount: "35" });
  const [receivables, setReceivables] = useState({ totalReceivable: 0, openInvoiceCount: 0, overdue30Count: 0, agingBuckets: { current: 0, d31to60: 0, d61to90: 0, d90plus: 0 } });

  const load = useCallback(async () => {
    try {
      const [response, recv] = await Promise.all([api.listInvoices(), api.receivables()]);
      setInvoices(response.items);
      setReceivables(recv);
      const first = response.items[0];
      if (first) {
        if (!paymentForm.invoiceId) setPaymentForm((prev) => ({ ...prev, invoiceId: first.id }));
        if (!selectedInvoiceId) setSelectedInvoiceId(first.id);
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
    if (!paymentForm.invoiceId || Number.isNaN(amount) || amount <= 0) return setError("Choose invoice and enter valid amount.");
    try {
      await api.payInvoice(paymentForm.invoiceId, amount, paymentForm.method);
      setPaymentForm((prev) => ({ ...prev, amount: "" }));
      setError(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function addLine() {
    if (!selected) return;
    try {
      await api.addInvoiceLine(selected.id, lineEditor);
      setLineEditor(emptyLine);
      await load();
    } catch (err) { setError((err as Error).message); }
  }

  async function updateLine(lineId: string, patch: Partial<InvoiceLine>) {
    if (!selected) return;
    try { await api.updateInvoiceLine(selected.id, lineId, patch); await load(); } catch (err) { setError((err as Error).message); }
  }

  async function removeLine(lineId?: string) {
    if (!selected || !lineId) return;
    try { await api.removeInvoiceLine(selected.id, lineId); await load(); } catch (err) { setError((err as Error).message); }
  }


  async function createNoShowFee() {
    const amount = Number(noShowFeeForm.amount);
    if (!noShowFeeForm.clientId || Number.isNaN(amount) || amount <= 0) return setError("clientId and valid amount required");
    try {
      await api.createNoShowFee({ clientId: noShowFeeForm.clientId, petId: noShowFeeForm.petId || undefined, amount });
      await load();
    } catch (err) { setError((err as Error).message); }
  }

  async function submitRefund() {
    if (!selected) return;
    try { await api.refundInvoice(selected.id, Number(refundForm.amount), refundForm.reason); await load(); } catch (err) { setError((err as Error).message); }
  }

  return (
    <section>
      <h2>Billing & Checkout</h2>
      <div className="grid">
        <article className="card">
          <h3>Receivables Analytics</h3>
          <p>Total receivable: €{receivables.totalReceivable.toFixed(2)}</p>
          <p>Open invoices: {receivables.openInvoiceCount}</p>
          <p>Overdue 30+ days: {receivables.overdue30Count}</p>
          <p>0-30d: €{receivables.agingBuckets.current.toFixed(2)} | 31-60d: €{receivables.agingBuckets.d31to60.toFixed(2)} | 61-90d: €{receivables.agingBuckets.d61to90.toFixed(2)} | 90+d: €{receivables.agingBuckets.d90plus.toFixed(2)}</p>
        </article>

        <article className="card">
          <h3>Invoices</h3>
          <table><thead><tr><th>#</th><th>Status</th><th>Total</th><th>Paid</th><th>Refunded</th><th>eKasa</th></tr></thead><tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} onClick={() => setSelectedInvoiceId(invoice.id)}>
                <td>{invoice.number}</td><td>{invoice.status}</td><td>€{invoice.total.toFixed(2)}</td><td>€{invoice.paidAmount.toFixed(2)}</td><td>€{invoice.refundedAmount.toFixed(2)}</td><td>{invoice.ekasaStatus}</td>
              </tr>
            ))}
          </tbody></table>
        </article>

        <article className="card">
          <h3>Structured Draft Invoice Editor</h3>
          {selected ? <p>{selected.number} · {selected.status}</p> : <p>Select an invoice</p>}
          <div className="form-grid">
            <label>Description<input value={lineEditor.description} onChange={(e) => setLineEditor({ ...lineEditor, description: e.target.value })} /></label>
            <label>Qty<input type="number" value={lineEditor.quantity} onChange={(e) => setLineEditor({ ...lineEditor, quantity: Number(e.target.value) })} /></label>
            <label>Unit price<input type="number" value={lineEditor.unitPrice} onChange={(e) => setLineEditor({ ...lineEditor, unitPrice: Number(e.target.value) })} /></label>
            <label>VAT<input type="number" step="0.01" value={lineEditor.vatRate} onChange={(e) => setLineEditor({ ...lineEditor, vatRate: Number(e.target.value) })} /></label>
            <button onClick={() => void addLine()}>Add line</button>
          </div>
          <ul>
            {selected?.lines.map((line) => (
              <li key={line.id}>
                {line.description} · {line.quantity} × €{line.unitPrice}
                <div className="inline-actions">
                  <button onClick={() => void updateLine(line.id!, { quantity: line.quantity + 1 })}>+1 qty</button>
                  <button onClick={() => void removeLine(line.id)}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="inline-actions">
            <button disabled={!selected} onClick={() => void selected && api.approveInvoice(selected.id).then(load)}>Approve invoice</button>
            <button disabled={!selected} onClick={() => void selected && api.fiscalizeInvoice(selected.id).then(load)}>Send to eKasa</button>
          </div>
        </article>

        <article className="card">
          <h3>Split Payments + Refunds</h3>
          <form onSubmit={submitPayment} className="form-grid">
            <label>Invoice<select value={paymentForm.invoiceId} onChange={(e) => setPaymentForm({ ...paymentForm, invoiceId: e.target.value })}><option value="">Select invoice</option>{invoices.map((invoice) => <option value={invoice.id} key={invoice.id}>{invoice.number} ({invoice.status})</option>)}</select></label>
            <label>Amount<input value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} /></label>
            <label>Method<select value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as typeof paymentForm.method })}><option value="CARD">CARD</option><option value="CASH">CASH</option><option value="BANK_TRANSFER">BANK_TRANSFER</option><option value="INSURANCE">INSURANCE</option></select></label>
            <button type="submit">Post payment</button>
          </form>
          <div className="form-grid">
            <label>Refund amount<input value={refundForm.amount} onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })} /></label>
            <label>Reason<input value={refundForm.reason} onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })} /></label>
            <button disabled={!selected} onClick={() => void submitRefund()}>Refund selected invoice</button>
          </div>
          <div className="form-grid">
            <label>No-show fee clientId<input value={noShowFeeForm.clientId} onChange={(e) => setNoShowFeeForm({ ...noShowFeeForm, clientId: e.target.value })} /></label>
            <label>Pet ID (optional)<input value={noShowFeeForm.petId} onChange={(e) => setNoShowFeeForm({ ...noShowFeeForm, petId: e.target.value })} /></label>
            <label>Fee amount<input value={noShowFeeForm.amount} onChange={(e) => setNoShowFeeForm({ ...noShowFeeForm, amount: e.target.value })} /></label>
            <button onClick={() => void createNoShowFee()}>Create no-show fee invoice</button>
          </div>

        </article>
      </div>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
