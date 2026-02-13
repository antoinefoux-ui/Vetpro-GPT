import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { EcommerceOrder, EcommerceProduct } from "../types/app";

export function EcommercePage() {
  const [products, setProducts] = useState<EcommerceProduct[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [order, setOrder] = useState<EcommerceOrder | null>(null);
  const [returns, setReturns] = useState<Array<{ id: string; orderId: string; reason: string; status: string }>>([]);
  const [returnReason, setReturnReason] = useState("Damaged item");
  const [email, setEmail] = useState("client@example.com");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [res, retRes] = await Promise.all([api.listProducts(), api.listReturns()]);
      setProducts(res.items);
      setReturns(retRes.items);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) && (category === "All" || p.category === category)), [products, query, category]);

  async function ensureCart() {
    if (order) return order;
    const created = await api.createOrder(email);
    setOrder(created);
    return created;
  }

  async function add(productId: string) {
    try {
      const cart = await ensureCart();
      const next = await api.addOrderLine(cart.id, productId, 1);
      setOrder(next);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function checkout() {
    if (!order) return;
    try {
      const checkedOut = await api.checkoutOrder(order.id);
      setOrder(checkedOut);
    } catch (err) { setError((err as Error).message); }
  }

  async function createReturn() {
    if (!order) return;
    try {
      const created = await api.createReturn(order.id, returnReason);
      setReturns((prev) => [created, ...prev]);
    } catch (err) { setError((err as Error).message); }
  }

  async function setReturnStatus(id: string, status: "REQUESTED" | "APPROVED" | "REJECTED" | "REFUNDED") {
    try {
      await api.setReturnStatus(id, status);
      await load();
      if (order) setOrder(await api.getOrder(order.id));
    } catch (err) { setError((err as Error).message); }
  }

  async function nextStatus(status: EcommerceOrder["status"]) {
    if (!order) return;
    try {
      const updated = await api.updateOrderStatus(order.id, status);
      setOrder(updated);
    } catch (err) { setError((err as Error).message); }
  }

  return (
    <section>
      <h2>E-commerce Lifecycle</h2>
      <div className="grid">
        <article className="card">
          <h3>Product Listing</h3>
          <div className="inline-actions">
            <input placeholder="Search products" value={query} onChange={(e) => setQuery(e.target.value)} />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>All</option>{Array.from(new Set(products.map((p) => p.category))).map((c) => <option key={c}>{c}</option>)}
            </select>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Checkout email" />
          </div>
          <table><thead><tr><th>Name</th><th>Category</th><th>Stock</th><th>Price</th><th /></tr></thead><tbody>
            {visible.map((product) => (
              <tr key={product.id}><td>{product.name}</td><td>{product.category}</td><td>{product.stock}</td><td>€{product.price.toFixed(2)}</td><td><button onClick={() => void add(product.id)}>Add to cart</button></td></tr>
            ))}
          </tbody></table>
        </article>

        <article className="card">
          <h3>Checkout / Order Lifecycle</h3>
          {!order ? <p>No cart yet.</p> : (
            <>
              <p><strong>Order:</strong> {order.id} · {order.status}</p>
              <ul>{order.lines.map((line) => <li key={line.productId}>{line.productId} × {line.quantity}</li>)}</ul>
              <p>Subtotal €{order.subtotal.toFixed(2)} · Tax €{order.taxTotal.toFixed(2)} · Shipping €{order.shippingCost.toFixed(2)} · Total €{order.total.toFixed(2)}</p>
              <div className="inline-actions">
                <button onClick={() => void checkout()} disabled={order.status !== "CART"}>Checkout</button>
                <button onClick={() => void nextStatus("PAID")}>Mark Paid</button>
                <button onClick={() => void nextStatus("SHIPPED")}>Mark Shipped</button>
                <button onClick={() => void nextStatus("DELIVERED")}>Mark Delivered</button>
                <button onClick={() => void nextStatus("REFUNDED")}>Refund</button>
              </div>
            </>
          )}
        </article>


        <article className="card">
          <h3>Returns & Refund Requests</h3>
          <div className="inline-actions">
            <input value={returnReason} onChange={(e) => setReturnReason(e.target.value)} />
            <button onClick={() => void createReturn()} disabled={!order}>Request return for active order</button>
          </div>
          <ul>
            {returns.map((row) => (
              <li key={row.id}>{row.orderId} · {row.reason} · {row.status}
                <div className="inline-actions">
                  <button onClick={() => void setReturnStatus(row.id, "APPROVED")}>Approve</button>
                  <button onClick={() => void setReturnStatus(row.id, "REJECTED")}>Reject</button>
                  <button onClick={() => void setReturnStatus(row.id, "REFUNDED")}>Mark Refunded</button>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </div>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
