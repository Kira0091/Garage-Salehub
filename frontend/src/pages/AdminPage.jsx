// src/pages/AdminPage.jsx
import { useState, useEffect } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { adminAPI, ordersAPI, productsAPI } from "../services/api";
import { useToast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";

const TABS = ["Dashboard", "Pending Items", "All Products", "Orders", "Users"];

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState("Dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [negotiateModal, setNegotiateModal] = useState(null);
  const [negotiatedPrice, setNegotiatedPrice] = useState("");
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const toast = useToast();
  const admin = String(user?.role || "").trim().toLowerCase() === "admin";

  if (authLoading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!admin) return <Navigate to="/" replace />;

  useEffect(() => {
    Promise.all([
      adminAPI.dashboard(),
      adminAPI.pendingProducts(),
    ]).then(([dash, pending]) => {
      setDashboard(dash);
      setPendingProducts(pending);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "Orders") adminAPI.getAllOrders().then(setAllOrders);
    if (tab === "Users") adminAPI.getUsers().then(setUsers);
  }, [tab]);

  const handleApprove = async (product) => {
    const price = negotiatedPrice ? parseFloat(negotiatedPrice) : null;
    try {
      await adminAPI.approveProduct(product.id, price ? { negotiated_price: price } : {});
      setPendingProducts((prev) => prev.filter((p) => p.id !== product.id));
      setDashboard((d) => ({ ...d, stats: { ...d.stats, pending_products: d.stats.pending_products - 1, approved_products: d.stats.approved_products + 1 } }));
      toast("Product approved!", "success");
      setNegotiateModal(null);
      setNegotiatedPrice("");
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const handleReject = async (id) => {
    try {
      await adminAPI.rejectProduct(id, { reason: rejectReason || "Item did not meet quality standards" });
      setPendingProducts((prev) => prev.filter((p) => p.id !== id));
      setDashboard((d) => ({ ...d, stats: { ...d.stats, pending_products: d.stats.pending_products - 1 } }));
      toast("Product rejected", "info");
      setRejectModal(null);
      setRejectReason("");
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const handleOrderStatus = async (id, status) => {
    try {
      const updated = await ordersAPI.updateStatus(id, { status });
      setAllOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      toast(`Order status updated to ${status}`, "success");
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const openMessage = (partner) => {
    if (!partner?.id) return;
    const name = encodeURIComponent(partner.name || "User");
    navigate(`/chat?partner=${partner.id}&name=${name}&role=user`);
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">⚙️ Admin Panel</h1>
          <p className="page-subtitle">GarageSaleHub Management Dashboard</p>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t}
              style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
              onClick={() => setTab(t)}
            >
              {t}
              {t === "Pending Items" && dashboard?.stats?.pending_products > 0 && (
                <span style={styles.tabBadge}>{dashboard.stats.pending_products}</span>
              )}
            </button>
          ))}
        </div>

        {/* Dashboard */}
        {tab === "Dashboard" && dashboard && (
          <div className="fade-in">
            <div style={styles.statsGrid}>
              {[
                { label: "Total Users", value: dashboard.stats.total_users, icon: "👥", color: "var(--blue)" },
                { label: "Total Products", value: dashboard.stats.total_products, icon: "📦", color: "var(--black)" },
                { label: "Pending Review", value: dashboard.stats.pending_products, icon: "⏳", color: "var(--yellow)" },
                { label: "Approved", value: dashboard.stats.approved_products, icon: "✅", color: "var(--green)" },
                { label: "Total Orders", value: dashboard.stats.total_orders, icon: "🛍️", color: "var(--blue)" },
                { label: "Revenue (Paid)", value: `₱${dashboard.stats.total_revenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`, icon: "💰", color: "var(--red)" },
              ].map((s) => (
                <div key={s.label} className="card" style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 28 }}>{s.icon}</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "Syne" }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: "var(--gray-500)", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 24 }}>
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 16, marginBottom: 16 }}>Recent Orders</h3>
                {dashboard.recent_orders.map((o) => (
                  <div key={o.id} style={styles.miniRow}>
                    <span style={{ fontSize: 13 }}>Order #{o.id} — {o.buyer.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--red)" }}>₱{o.total_amount.toLocaleString("en-PH", { maximumFractionDigits: 0 })}</span>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 16, marginBottom: 16 }}>Items Awaiting Review</h3>
                {dashboard.pending_products.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--gray-400)" }}>All caught up! ✓</p>
                ) : dashboard.pending_products.map((p) => (
                  <div key={p.id} style={styles.miniRow}>
                    <span style={{ fontSize: 13 }}>{p.title}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>₱{p.price.toLocaleString("en-PH", { maximumFractionDigits: 0 })}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pending Items */}
        {tab === "Pending Items" && (
          <div className="fade-in">
            {pendingProducts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <div className="empty-state-title">No pending items</div>
                <div className="empty-state-text">All submissions have been reviewed</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {pendingProducts.map((p) => {
                  return (
                    <div key={p.id} className="card" style={styles.pendingCard}>
                      <div style={styles.pendingImgs}>
                        {p.images.slice(0, 3).map((imgName, i) => (
                          <img key={i} src={productsAPI.imageUrl(imgName)} alt="" style={styles.pendingImg} />
                        ))}
                      </div>
                      <div style={styles.pendingInfo}>
                        <h3 style={{ fontSize: 16 }}>{p.title}</h3>
                        <p style={{ fontSize: 13, color: "var(--gray-500)", margin: "6px 0" }}>{p.description}</p>
                        <div style={{ display: "flex", gap: 12, fontSize: 13, flexWrap: "wrap" }}>
                          <span><strong>Asking Price:</strong> ₱{p.price.toLocaleString("en-PH")}</span>
                          <span><strong>Condition:</strong> {p.condition}</span>
                          <span><strong>Qty:</strong> {p.quantity}</span>
                          <span><strong>Seller:</strong> {p.seller.name}</span>
                          {p.category && <span><strong>Category:</strong> {p.category.name}</span>}
                        </div>
                        <div style={styles.pendingCommRow}>
                          <button
                            className="btn"
                            style={styles.messageSellerBtn}
                            onClick={() => openMessage(p.seller)}
                          >
                            Message Seller
                          </button>
                        </div>
                      </div>
                      <div style={styles.pendingActions}>
                        <button
                          className="btn btn-primary"
                          onClick={() => { setNegotiateModal(p); setNegotiatedPrice(String(p.price)); }}
                        >
                          ✅ Approve
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ background: "#fee2e2", color: "var(--red)", border: "none" }}
                          onClick={() => setRejectModal(p)}
                        >
                          ❌ Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Orders tab */}
        {tab === "Orders" && (
          <div className="fade-in card" style={{ overflow: "hidden" }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order #</th><th>Buyer</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allOrders.map((o) => (
                    <tr key={o.id}>
                      <td>#{o.id}</td>
                      <td>{o.buyer.name}</td>
                      <td style={{ fontWeight: 700 }}>₱{o.total_amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                      <td><span className={`badge ${o.payment_status === "paid" ? "badge-green" : "badge-yellow"}`}>{o.payment_status}</span></td>
                      <td><span className="badge badge-blue">{o.status}</span></td>
                      <td style={{ fontSize: 12 }}>{new Date(o.created_at).toLocaleDateString("en-PH")}</td>
                      <td>
                        <select
                          className="input-field"
                          style={{ padding: "4px 8px", fontSize: 12 }}
                          value={o.status}
                          onChange={(e) => handleOrderStatus(o.id, e.target.value)}
                        >
                          {["pending", "processing", "shipped", "delivered", "cancelled"].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users tab */}
        {tab === "Users" && (
          <div className="fade-in card" style={{ overflow: "hidden" }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Role</th><th>Items Submitted</th><th>Joined</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.name}</td>
                      <td>{u.email}</td>
                      <td><span className={`badge ${u.role === "admin" ? "badge-red" : "badge-blue"}`}>{u.role}</span></td>
                      <td>{u.product_count}</td>
                      <td style={{ fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString("en-PH")}</td>
                      <td>
                        {u.role !== "admin" && (
                          <button
                            className="btn btn-sm"
                            style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}
                            onClick={() => openMessage(u)}
                          >
                            Message
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Negotiate Modal */}
      {negotiateModal && (
        <div className="modal-overlay" onClick={() => setNegotiateModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Approve Item</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setNegotiateModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: "var(--gray-600)", marginBottom: 16 }}>
                Set the final selling price. Seller's asking price: <strong>₱{negotiateModal.price.toLocaleString("en-PH")}</strong>
              </p>
              <div className="input-group">
                <label>Negotiated/Final Price (₱)</label>
                <input className="input-field" type="number" value={negotiatedPrice} onChange={(e) => setNegotiatedPrice(e.target.value)} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button className="btn btn-ghost" onClick={() => setNegotiateModal(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleApprove(negotiateModal)}>
                  Approve & List Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reject Item</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setRejectModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="input-group" style={{ marginBottom: 16 }}>
                <label>Reason for rejection (optional)</label>
                <textarea className="input-field" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Poor photo quality, item not accepted..." />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-ghost" onClick={() => setRejectModal(null)}>Cancel</button>
                <button className="btn btn-sm" style={{ flex: 1, background: "var(--red)", color: "white", border: "none" }} onClick={() => handleReject(rejectModal.id)}>
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  tabs: { display: "flex", gap: 4, marginBottom: 24, borderBottom: "2px solid var(--gray-200)", paddingBottom: 0 },
  tab: { padding: "10px 20px", background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "var(--gray-500)", borderBottom: "2px solid transparent", marginBottom: -2, display: "flex", alignItems: "center", gap: 6 },
  tabActive: { color: "var(--red)", borderBottomColor: "var(--red)" },
  tabBadge: { background: "var(--red)", color: "white", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 },
  miniRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--gray-100)", fontSize: 13 },
  pendingCard: { display: "flex", gap: 20, padding: 20, alignItems: "flex-start" },
  pendingImgs: { display: "flex", gap: 6, flexShrink: 0 },
  pendingImg: { width: 80, height: 80, objectFit: "cover", borderRadius: 8 },
  pendingInfo: { flex: 1 },
  pendingCommRow: { marginTop: 14, display: "flex", alignItems: "center" },
  messageSellerBtn: {
    background: "#1d4ed8",
    color: "#fff",
    border: "1px solid #1d4ed8",
    fontWeight: 700,
    padding: "9px 14px",
    borderRadius: 8,
    cursor: "pointer",
  },
  pendingActions: { display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 },
};
