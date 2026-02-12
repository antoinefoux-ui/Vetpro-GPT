import { useMemo, useState } from "react";

const products = [
  { id: "p1", name: "Hill's Prescription Diet 5kg", category: "Food", price: 49.9, rating: 4.8 },
  { id: "p2", name: "Joint Health Supplement", category: "Supplements", price: 24.5, rating: 4.4 },
  { id: "p3", name: "Dental Chews Pack", category: "Dental", price: 12.9, rating: 4.1 },
  { id: "p4", name: "Flea & Tick Prevention", category: "Medication", price: 29.0, rating: 4.7 }
];

export function EcommercePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<Array<{ id: string; qty: number }>>([]);

  const visible = useMemo(
    () =>
      products.filter((p) => {
        const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase());
        const matchesCategory = category === "All" || p.category === category;
        return matchesQuery && matchesCategory;
      }),
    [query, category]
  );

  const subtotal = useMemo(
    () =>
      cart.reduce((sum, line) => {
        const p = products.find((item) => item.id === line.id);
        return sum + (p ? p.price * line.qty : 0);
      }, 0),
    [cart]
  );

  function add(id: string) {
    setCart((prev) => {
      const existing = prev.find((line) => line.id === id);
      if (existing) return prev.map((line) => (line.id === id ? { ...line, qty: line.qty + 1 } : line));
      return [...prev, { id, qty: 1 }];
    });
  }

  return (
    <section>
      <h2>E-commerce</h2>
      <div className="grid">
        <article className="card">
          <h3>Product Listing (MVP)</h3>
          <div className="inline-actions">
            <input placeholder="Search products" value={query} onChange={(e) => setQuery(e.target.value)} />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>All</option>
              <option>Food</option>
              <option>Supplements</option>
              <option>Dental</option>
              <option>Medication</option>
            </select>
          </div>
          <table>
            <thead><tr><th>Name</th><th>Category</th><th>Rating</th><th>Price</th><th /></tr></thead>
            <tbody>
              {visible.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.category}</td>
                  <td>{product.rating}</td>
                  <td>€{product.price.toFixed(2)}</td>
                  <td><button onClick={() => add(product.id)}>Add to cart</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="card">
          <h3>Cart & Checkout (MVP)</h3>
          <ul>
            {cart.map((line) => {
              const p = products.find((product) => product.id === line.id);
              return <li key={line.id}>{p?.name} × {line.qty}</li>;
            })}
          </ul>
          <p>Subtotal: €{subtotal.toFixed(2)}</p>
          <button disabled={cart.length === 0}>Proceed to checkout</button>
        </article>
      </div>
    </section>
  );
}
