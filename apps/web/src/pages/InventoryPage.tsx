import { FormEvent, useCallback, useState } from "react";
import { api } from "../lib/api";
import type { InventoryItem, PurchaseOrder } from "../types/app";
import { usePolling } from "../hooks/usePolling";

export function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [form, setForm] = useState({ supplierName: "Main Supplier", itemId: "item_1", quantity: "10", unitCost: "20" });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [stock, low, po] = await Promise.all([api.listInventory(), api.lowStock(), api.listPurchaseOrders()]);
      setItems(stock.items);
      setAlerts(low.lowStock);
      setOrders(po.items);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  usePolling(load, 7000);

  async function createPo(event: FormEvent) {
    event.preventDefault();
    try {
      await api.createPurchaseOrder(form.supplierName, [
        { itemId: form.itemId, quantity: Number(form.quantity), unitCost: Number(form.unitCost) }
      ]);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section>
      <h2>Inventory</h2>
      <div className="grid">
        <article className="card">
          <h3>Current Stock</h3>
          <table>
            <thead><tr><th>SKU</th><th>Name</th><th>Stock</th><th>Min</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}><td>{item.sku}</td><td>{item.name}</td><td>{item.stockOnHand} {item.unit}</td><td>{item.minStock}</td></tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="card">
          <h3>Low Stock Alerts</h3>
          <ul>{alerts.map((item) => <li key={item.id}>⚠️ {item.name} ({item.stockOnHand}/{item.minStock})</li>)}</ul>
          {alerts.length === 0 ? <p>No active low-stock alerts.</p> : null}
        </article>

        <article className="card">
          <h3>Purchase Orders</h3>
          <form className="form-grid" onSubmit={createPo}>
            <label>Supplier<input value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} /></label>
            <label>Item<select value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })}>{items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
            <label>Qty<input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></label>
            <label>Unit Cost<input value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} /></label>
            <button type="submit">Create PO</button>
          </form>
          <table>
            <thead><tr><th>ID</th><th>Supplier</th><th>Status</th><th>Total</th><th>Actions</th></tr></thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td><td>{order.supplierName}</td><td>{order.status}</td><td>€{order.totalCost.toFixed(2)}</td>
                  <td>
                    {order.status === "DRAFT" ? <button onClick={() => void api.approvePurchaseOrder(order.id).then(load)}>Approve</button> : null}
                    {order.status === "APPROVED" ? <button onClick={() => void api.receivePurchaseOrder(order.id).then(load)}>Receive</button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </div>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
