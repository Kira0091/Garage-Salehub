// src/pages/CartPage.jsx
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { productsAPI } from "../services/api";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <div className="empty-state-icon">🛒</div>
            <div className="empty-state-title">Your cart is empty</div>
            <div className="empty-state-text">Add some items to get started</div>
            <Link to="/shop" className="btn btn-primary" style={{ marginTop: 16 }}>Browse Products</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">🛒 Shopping Cart</h1>
          <p className="page-subtitle">{cart.length} item{cart.length !== 1 ? "s" : ""} in your cart</p>
        </div>

        <div style={styles.layout}>
          {/* Items */}
          <div>
            {cart.map(({ product, quantity }) => {
              const price = product.negotiated_price || product.price;
              const img = product.images?.[0] ? productsAPI.imageUrl(product.images[0]) : "https://placehold.co/100x100/f2f2f2/aaa?text=Item";
              return (
                <div key={product.id} className="card" style={styles.item}>
                  <img src={img} alt={product.title} style={styles.itemImg} />
                  <div style={styles.itemInfo}>
                    <Link to={`/product/${product.id}`} style={styles.itemTitle}>{product.title}</Link>
                    <div style={styles.itemMeta}>
                      <span className="badge badge-gray">{product.condition}</span>
                      {product.category && <span style={{ fontSize: 12, color: "var(--gray-400)" }}>{product.category.name}</span>}
                    </div>
                    <div style={styles.itemPrice}>₱{price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div style={styles.itemActions}>
                    <div style={styles.qtyControl}>
                      <button style={styles.qtyBtn} onClick={() => updateQuantity(product.id, quantity - 1)}>−</button>
                      <span style={styles.qtyNum}>{quantity}</span>
                      <button style={styles.qtyBtn} onClick={() => updateQuantity(product.id, Math.min(product.stock, quantity + 1))}>+</button>
                    </div>
                    <div style={styles.subtotal}>₱{(price * quantity).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</div>
                    <button style={styles.removeBtn} onClick={() => removeFromCart(product.id)}>🗑️</button>
                  </div>
                </div>
              );
            })}
            <button className="btn btn-ghost btn-sm" onClick={clearCart} style={{ marginTop: 8 }}>Clear Cart</button>
          </div>

          {/* Summary */}
          <div>
            <div className="card" style={styles.summary}>
              <h3 style={styles.summaryTitle}>Order Summary</h3>
              <div style={styles.summaryRows}>
                {cart.map(({ product, quantity }) => {
                  const price = product.negotiated_price || product.price;
                  return (
                    <div key={product.id} style={styles.summaryRow}>
                      <span style={{ fontSize: 13, color: "var(--gray-600)" }}>{product.title} × {quantity}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>₱{(price * quantity).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                    </div>
                  );
                })}
              </div>
              <div style={styles.divider} />
              <div style={styles.totalRow}>
                <span style={{ fontWeight: 700 }}>Total</span>
                <span style={styles.totalPrice}>₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
              </div>
              <button
                className="btn btn-primary btn-lg"
                style={{ width: "100%", marginTop: 20 }}
                onClick={() => user ? navigate("/checkout") : navigate("/login")}
              >
                Proceed to Checkout
              </button>
              <Link to="/shop" className="btn btn-ghost btn-sm" style={{ width: "100%", marginTop: 10, justifyContent: "center" }}>
                ← Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  layout: { display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "start" },
  item: { display: "flex", alignItems: "center", gap: 16, padding: 16, marginBottom: 12 },
  itemImg: { width: 90, height: 90, objectFit: "cover", borderRadius: 8, flexShrink: 0 },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: 600, color: "var(--black)", display: "block", marginBottom: 6 },
  itemMeta: { display: "flex", gap: 8, marginBottom: 6 },
  itemPrice: { fontSize: 16, fontWeight: 700, color: "var(--red)" },
  itemActions: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 },
  qtyControl: { display: "flex", alignItems: "center", border: "1.5px solid var(--gray-200)", borderRadius: 8, overflow: "hidden" },
  qtyBtn: { width: 32, height: 32, background: "var(--gray-50)", border: "none", cursor: "pointer", fontSize: 16, fontWeight: 600 },
  qtyNum: { width: 36, textAlign: "center", fontSize: 14, fontWeight: 600 },
  subtotal: { fontSize: 15, fontWeight: 700 },
  removeBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: 4, opacity: 0.7 },
  summary: { padding: 24, position: "sticky", top: 160 },
  summaryTitle: { fontSize: 18, marginBottom: 16 },
  summaryRows: { display: "flex", flexDirection: "column", gap: 10 },
  summaryRow: { display: "flex", justifyContent: "space-between" },
  divider: { border: "none", borderTop: "1px solid var(--gray-200)", margin: "16px 0" },
  totalRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  totalPrice: { fontSize: 22, fontWeight: 800, color: "var(--red)", fontFamily: "Syne, sans-serif" },
};
