// src/pages/AdminPage.jsx
import { useState, useEffect } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { adminAPI, ordersAPI, productsAPI, chatAPI } from "../services/api";
import { useToast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";

const TABS = ["Dashboard", "Pending Items", "All Products", "Orders", "Users", "Messages"];

export default function AdminPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const initialTab = TABS.find(
    (t) => t.toLowerCase() === String(searchParams.get("tab") || "").trim().toLowerCase()
  ) || "Dashboard";
  const [tab, setTab] = useState(initialTab);
  const [dashboard, setDashboard] = useState(null);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [inventoryProducts, setInventoryProducts] = useState([]);
  const [approvedProducts, setApprovedProducts] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [conversations, setConversations] = useState([]);
  const [convLoading, setConvLoading] = useState(false);
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
    if (tab === "All Products") {
      adminAPI.inventoryProducts().then(setInventoryProducts);
      productsAPI.getAll({ status: "approved", per_page: 100 }).then((d) => setApprovedProducts(d.products || []));
    }
    if (tab === "Messages") {
      setConvLoading(true);
      chatAPI.conversations()
        .then(setConversations)
        .finally(() => setConvLoading(false));
    }
  }, [tab]);

  const handleApprove = async (product) => {
    try {
      await adminAPI.approveProduct(product.id, {});
      setPendingProducts((prev) => prev.filter((p) => p.id !== product.id));
      setDashboard((d) => ({ ...d, stats: { ...d.stats, pending_products: d.stats.pending_products - 1, approved_products: d.stats.approved_products + 1 } }));
      toast("Product approved!", "success");
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

  const handleRelease = async (id) => {
    try {
      const released = await adminAPI.releaseProduct(id);
      setInventoryProducts((prev) => prev.filter((p) => p.id !== id));
      setApprovedProducts((prev) => [released, ...prev]);
      toast("Product released to marketplace", "success");
      setDashboard((d) => ({ ...d, stats: { ...d.stats, inventory_products: d.stats.inventory_products - 1, approved_products: d.stats.approved_products + 1 } }));
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const handleMoveToInventory = async (id) => {
    try {
      const moved = await adminAPI.moveToInventory(id);
      setApprovedProducts((prev) => prev.filter((p) => p.id !== id));
      setInventoryProducts((prev) => [moved, ...prev]);
      toast("Product moved back to inventory", "info");
      setDashboard((d) => ({ ...d, stats: { ...d.stats, inventory_products: d.stats.inventory_products + 1, approved_products: d.stats.approved_products - 1 } }));
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
    navigate(`/chat?partner=${partner.id}&name=${name}&role=user&from=admin`);
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container">
        <div style={styles.adminWorkspace}>
        <div className="page-header">
          <h1 className="page-title" style={styles.adminTitleRow}>
            <span style={styles.adminTitleIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
                <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.8 1.8 0 1 1-2.6 2.6l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1.8 1.8 0 1 1-3.6 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.8 1.8 0 1 1-2.6-2.6l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1.8 1.8 0 1 1 0-3.6h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.8 1.8 0 1 1 2.6-2.6l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1.8 1.8 0 1 1 3.6 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.8 1.8 0 1 1 2.6 2.6l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a1.8 1.8 0 1 1 0 3.6h-.2a1 1 0 0 0-.9.6Z" />
              </svg>
            </span>
            <span>Admin Panel</span>
          </h1>
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
                { label: "Total Users", value: dashboard.stats.total_users, icon: "users", color: "var(--blue)" },
                { label: "Total Products", value: dashboard.stats.total_products, icon: "box", color: "var(--black)" },
                { label: "Pending Review", value: dashboard.stats.pending_products, icon: "hourglass", color: "var(--yellow)" },
                { label: "Inventory", value: dashboard.stats.inventory_products, icon: "tag", color: "var(--blue)" },
                { label: "Approved", value: dashboard.stats.approved_products, icon: "check", color: "var(--green)" },
                { label: "Total Orders", value: dashboard.stats.total_orders, icon: "cart", color: "var(--blue)" },
                { label: "Revenue (Paid)", value: `₱${dashboard.stats.total_revenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`, icon: "wallet", color: "var(--red)" },
              ].map((s) => (
                <div key={s.label} className="card" style={{ padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <StatCardIcon type={s.icon} />
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
                <div className="empty-state-icon">
                  <span style={styles.emptyStateIconBadge} aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
                    </svg>
                  </span>
                </div>
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
                          onClick={() => handleApprove(p)}
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

        {/* All Products tab */}
        {tab === "All Products" && (
          <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 16 }}>Inventory (Admin Only)</h3>
                <span className="badge badge-blue">{inventoryProducts.length}</span>
              </div>
              {inventoryProducts.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--gray-400)" }}>No items in inventory.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {inventoryProducts.map((p) => (
                    <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", paddingBottom: 10, borderBottom: "1px solid var(--gray-100)" }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{p.title}</div>
                        <div style={{ fontSize: 12, color: "var(--gray-500)" }}>
                          Final Price: ₱{(p.negotiated_price || p.price).toLocaleString("en-PH")}
                        </div>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => handleRelease(p.id)}>
                        Release
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 16 }}>Approved (Live in Shop)</h3>
                <span className="badge badge-green">{approvedProducts.length}</span>
              </div>
              {approvedProducts.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--gray-400)" }}>No approved products.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {approvedProducts.map((p) => (
                    <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center", paddingBottom: 8, borderBottom: "1px solid var(--gray-100)" }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{p.title}</div>
                        <div style={{ fontSize: 12, color: "var(--gray-500)" }}>
                          Price: ₱{(p.negotiated_price || p.price).toLocaleString("en-PH")}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span className="badge badge-green">Live</span>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleMoveToInventory(p.id)}>
                          Move to Inventory
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

        {/* Messages tab */}
        {tab === "Messages" && (
          <div className="fade-in card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>Seller Conversations</h3>
            {convLoading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : conversations.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--gray-400)" }}>No conversations yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {conversations.map(({ partner, last_message, unread_count }) => (
                  <div key={partner?.id} style={styles.convRow}>
                    <div style={styles.convAvatar}>{partner?.name?.[0]?.toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{partner?.name}</div>
                      <div style={styles.convLast}>{last_message?.content || "No messages yet"}</div>
                    </div>
                    {unread_count > 0 && <span style={styles.unreadBadge}>{unread_count}</span>}
                    <button
                      className="btn btn-sm"
                      style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}
                      onClick={() => openMessage(partner)}
                    >
                      Open Chat
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </div>

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

function StatCardIcon({ type }) {
  const base = { width: 20, height: 20, fill: "none", stroke: "#334155", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  const iconStyle = {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#e2e8f0",
    border: "1px solid #cbd5e1",
  };

  const icons = {
    users: <svg viewBox="0 0 24 24" style={base}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="3" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a3 3 0 0 1 0 5.74" /></svg>,
    box: <svg viewBox="0 0 24 24" style={base}><path d="m21 8-9-5-9 5 9 5 9-5Z" /><path d="m3 8 9 5 9-5" /><path d="M12 13v8" /></svg>,
    hourglass: <svg viewBox="0 0 24 24" style={base}><path d="M6 2h12" /><path d="M6 22h12" /><path d="M8 2c0 4 2 6 4 8 2-2 4-4 4-8" /><path d="M8 22c0-4 2-6 4-8 2 2 4 4 4 8" /></svg>,
    tag: <svg viewBox="0 0 24 24" style={base}><path d="M20.6 13.4 11 3.8A2 2 0 0 0 9.6 3H4v5.6a2 2 0 0 0 .8 1.4l9.6 9.6a2 2 0 0 0 2.8 0l3.4-3.4a2 2 0 0 0 0-2.8Z" /><circle cx="7.5" cy="7.5" r="1.2" /></svg>,
    check: <svg viewBox="0 0 24 24" style={base}><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></svg>,
    cart: <svg viewBox="0 0 24 24" style={base}><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 7H7" /></svg>,
    wallet: <svg viewBox="0 0 24 24" style={base}><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" /><path d="M16 12h5" /><circle cx="16" cy="12" r="1" /></svg>,
  };

  return <span style={iconStyle}>{icons[type] || icons.box}</span>;
}

const styles = {
  adminTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  adminTitleIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#e2e8f0",
    color: "#334155",
    border: "1px solid #cbd5e1",
    flexShrink: 0,
  },
  adminWorkspace: {
    background: "#f1f5f9",
    border: "1px solid #dbe3ec",
    borderRadius: 14,
    padding: 22,
  },
  emptyStateIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#e2e8f0",
    color: "#334155",
    border: "1px solid #cbd5e1",
  },
  tabs: { display: "flex", gap: 4, marginBottom: 24, borderBottom: "2px solid #d4dde7", paddingBottom: 0 },
  tab: { padding: "10px 20px", background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "var(--gray-500)", borderBottom: "2px solid transparent", marginBottom: -2, display: "flex", alignItems: "center", gap: 6 },
  tabActive: { color: "var(--red)", borderBottomColor: "var(--red)" },
  tabBadge: { background: "var(--red)", color: "white", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 },
  miniRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--gray-100)", fontSize: 13 },
  pendingCard: { display: "flex", gap: 20, padding: 20, alignItems: "flex-start" },
  pendingImgs: { display: "flex", gap: 6, flexShrink: 0 },
  pendingImg: { width: 80, height: 80, objectFit: "cover", borderRadius: 8, background: "var(--gray-100)" },
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
  convRow: { display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: "1px solid var(--gray-100)", borderRadius: 10 },
  convAvatar: { width: 34, height: 34, borderRadius: "50%", background: "var(--red)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 },
  convLast: { fontSize: 12, color: "var(--gray-400)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  unreadBadge: { background: "var(--red)", color: "white", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 },
};
