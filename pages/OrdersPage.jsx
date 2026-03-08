// src/pages/OrdersPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ordersAPI } from "../services/api";
import { useToast } from "../components/Toast";

const statusColors = {
  pending: "badge-yellow",
  processing: "badge-blue",
  shipped: "badge-blue",
  delivered: "badge-green",
  cancelled: "badge-red",
};

const statusIcons = {
  pending: "⏳",
  processing: "⚙️",
  shipped: "🚚",
  delivered: "✅",
  cancelled: "❌",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const toast = useToast();

  useEffect(() => {
    ordersAPI.getAll().then(setOrders).finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id) => {
    if (!confirm("Cancel this order?")) return;
    try {
      const updated = await ordersAPI.cancel(id);
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      toast("Order cancelled", "info");
    } catch (e) {
      toast(e.message, "error");
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">🛍️ My Orders</h1>
          <p className="page-subtitle">{orders.length} order{orders.length !== 1 ? "s" : ""} total</p>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🛍️</div>
            <div className="empty-state-title">No orders yet</div>
            <Link to="/shop" className="btn btn-primary" style={{ marginTop: 16 }}>Start Shopping</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {orders.map((order) => (
              <div key={order.id} className="card">
                {/* Order header */}
                <div style={styles.orderHeader} onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                  <div style={styles.orderMeta}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>Order #{order.id}</span>
                    <span style={{ fontSize: 13, color: "var(--gray-400)" }}>
                      {new Date(order.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                    </span>
                  </div>
                  <div style={styles.orderStatus}>
                    <span className={`badge ${statusColors[order.status]}`}>{statusIcons[order.status]} {order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                    <span className={`badge ${order.payment_status === "paid" ? "badge-green" : order.payment_status === "refunded" ? "badge-blue" : "badge-yellow"}`}>
                      💳 {order.payment_status}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "var(--red)", fontFamily: "Syne" }}>
                      ₱{order.total_amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </span>
                    <span style={{ color: "var(--gray-400)" }}>{expanded === order.id ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Expanded details */}
                {expanded === order.id && (
                  <div style={styles.orderDetails}>
                    <div style={styles.detailGrid}>
                      <div>
                        <div style={styles.detailLabel}>Tracking Number</div>
                        <div style={styles.detailValue}>{order.tracking_number}</div>
                      </div>
                      <div>
                        <div style={styles.detailLabel}>Payment Method</div>
                        <div style={styles.detailValue}>{order.payment_method.toUpperCase()}</div>
                      </div>
                      <div>
                        <div style={styles.detailLabel}>Delivery Address</div>
                        <div style={styles.detailValue}>{order.delivery_address}</div>
                      </div>
                    </div>

                    {/* Delivery progress */}
                    <div style={styles.deliveryProgress}>
                      {["pending", "processing", "shipped", "delivered"].map((s, i) => {
                        const statuses = ["pending", "processing", "shipped", "delivered"];
                        const current = statuses.indexOf(order.status);
                        const done = i <= current && order.status !== "cancelled";
                        return (
                          <div key={s} style={styles.progressStep}>
                            <div style={{ ...styles.progressCircle, ...(done ? styles.progressDone : {}) }}>
                              {statusIcons[s]}
                            </div>
                            <div style={{ fontSize: 11, color: done ? "var(--black)" : "var(--gray-400)", fontWeight: done ? 600 : 400, textTransform: "capitalize" }}>{s}</div>
                            {i < 3 && <div style={{ ...styles.progressLine, ...(done && i < current ? styles.progressLineDone : {}) }} />}
                          </div>
                        );
                      })}
                    </div>

                    {/* Items */}
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "var(--gray-600)" }}>ITEMS</div>
                      {order.items.map((item) => (
                        <div key={item.id} style={styles.orderItem}>
                          <Link to={`/product/${item.product.id}`} style={{ fontSize: 14, fontWeight: 600, color: "var(--black)" }}>{item.product.title}</Link>
                          <span style={{ fontSize: 13, color: "var(--gray-500)" }}>× {item.quantity}</span>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>₱{item.subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>

                    {["pending", "processing"].includes(order.status) && (
                      <button
                        className="btn btn-sm"
                        style={{ background: "#fee2e2", color: "var(--red)", border: "none", marginTop: 16 }}
                        onClick={() => handleCancel(order.id)}
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  orderHeader: { padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" },
  orderMeta: { display: "flex", flexDirection: "column", gap: 4 },
  orderStatus: { display: "flex", alignItems: "center", gap: 10 },
  orderDetails: { padding: "0 20px 20px", borderTop: "1px solid var(--gray-100)" },
  detailGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, padding: "16px 0" },
  detailLabel: { fontSize: 11, fontWeight: 700, color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 },
  detailValue: { fontSize: 14, fontWeight: 600 },
  deliveryProgress: { display: "flex", alignItems: "flex-start", gap: 0, padding: "16px 0" },
  progressStep: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 },
  progressCircle: { width: 36, height: 36, borderRadius: "50%", background: "var(--gray-200)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 },
  progressDone: { background: "var(--red)", fontSize: 14 },
  progressLine: { position: "absolute", width: "100%", height: 2, background: "var(--gray-200)", top: 18, left: "50%", zIndex: -1 },
  progressLineDone: { background: "var(--red)" },
  orderItem: { display: "flex", alignItems: "center", gap: 16, padding: "8px 0", borderBottom: "1px solid var(--gray-100)" },
};
