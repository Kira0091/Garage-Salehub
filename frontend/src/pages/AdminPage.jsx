// src/pages/AdminPage.jsx
import { useState, useEffect } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { adminAPI, ordersAPI, productsAPI, chatAPI, vouchersAPI, reportsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { alertError, alertInfo, alertSuccess, confirmAction } from "../utils/alerts";
import Icon from "../components/Icon";

const TABS = ["Dashboard", "Pending Verifications", "All Products", "Vouchers", "Orders", "Users", "Messages", "Reports"];

export default function AdminPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const initialTab = TABS.find(
    (t) => t.toLowerCase() === String(searchParams.get("tab") || "").trim().toLowerCase()
  ) || "Dashboard";
  const [tab, setTab] = useState(initialTab);
  const [dashboard, setDashboard] = useState(null);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [inventoryProducts, setInventoryProducts] = useState([]);
  const [approvedProducts, setApprovedProducts] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [conversations, setConversations] = useState([]);
  const [convLoading, setConvLoading] = useState(false);
  const [vouchers, setVouchers] = useState([]);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherForm, setVoucherForm] = useState({
    code: "",
    type: "percent",
    value: "",
    min_order: "",
    max_uses: "",
    expires_at: "",
  });
  const [voucherMessage, setVoucherMessage] = useState("");
  const [reports, setReports] = useState([]);
  const admin = String(user?.role || "").trim().toLowerCase() === "admin";

  if (authLoading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!admin) return <Navigate to="/" replace />;

  useEffect(() => {
    Promise.all([
      adminAPI.dashboard(),
      adminAPI.pendingVerifications(),
    ]).then(([dash, pending]) => {
      setDashboard(dash);
      setPendingVerifications(pending);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "Orders") adminAPI.getAllOrders().then(setAllOrders);
    if (tab === "Users") adminAPI.getUsers().then(setUsers);
    if (tab === "All Products") {
      adminAPI.inventoryProducts().then(setInventoryProducts);
      productsAPI.getAll({ status: "approved", per_page: 100 }).then((d) => setApprovedProducts(d.products || []));
    }
    if (tab === "Vouchers") {
      setVoucherLoading(true);
      vouchersAPI.list()
        .then(setVouchers)
        .finally(() => setVoucherLoading(false));
    }
    if (tab === "Messages") {
      setConvLoading(true);
      chatAPI.conversations()
        .then(setConversations)
        .finally(() => setConvLoading(false));
    }
    if (tab === "Reports") {
      reportsAPI.mine().then(setReports).catch(() => setReports([]));
    }
  }, [tab]);

  const handleApprove = async (product) => {
    const confirmed = await confirmAction({
      title: "Approve this product?",
      text: `${product.title} will move to approved listings.`,
      confirmText: "Approve",
      confirmButtonColor: "#16a34a",
    });
    if (!confirmed) return;
    try {
      await adminAPI.verifyProduct(product.id, { action: "approve" });
      setPendingVerifications((prev) => prev.filter((p) => p.id !== product.id));
      setDashboard((d) => ({ ...d, stats: { ...d.stats, pending_products: d.stats.pending_products - 1, approved_products: d.stats.approved_products + 1 } }));
      await alertSuccess("Product approved", `${product.title} is now approved.`);
    } catch (e) {
      await alertError(e.message || "Approve failed");
    }
  };

  const handleReject = async (id) => {
    const product = pendingVerifications.find((p) => p.id === id);
    const confirmed = await confirmAction({
      title: "Reject this product?",
      text: product ? `${product.title} will be marked rejected.` : "This item will be marked rejected.",
      confirmText: "Reject",
    });
    if (!confirmed) return;
    try {
      await adminAPI.verifyProduct(id, { action: "reject", reason: rejectReason || "Item did not meet verification requirements" });
      setPendingVerifications((prev) => prev.filter((p) => p.id !== id));
      setDashboard((d) => ({ ...d, stats: { ...d.stats, pending_products: d.stats.pending_products - 1 } }));
      await alertInfo("Product rejected", "The seller has been notified.");
      setRejectModal(null);
      setRejectReason("");
    } catch (e) {
      await alertError(e.message || "Reject failed");
    }
  };

  const handleRelease = async (id) => {
    const product = inventoryProducts.find((p) => p.id === id);
    const confirmed = await confirmAction({
      title: "Release product to marketplace?",
      text: product ? `${product.title} will become visible in Shop.` : "This item will become visible in Shop.",
      confirmText: "Release",
      confirmButtonColor: "#16a34a",
    });
    if (!confirmed) return;
    try {
      const released = await adminAPI.releaseProduct(id);
      setInventoryProducts((prev) => prev.filter((p) => p.id !== id));
      setApprovedProducts((prev) => [released, ...prev]);
      await alertSuccess("Released", "Product is now live in marketplace.");
      setDashboard((d) => ({ ...d, stats: { ...d.stats, inventory_products: d.stats.inventory_products - 1, approved_products: d.stats.approved_products + 1 } }));
    } catch (e) {
      await alertError(e.message || "Release failed");
    }
  };

  const handleMoveToInventory = async (id) => {
    const product = approvedProducts.find((p) => p.id === id);
    const confirmed = await confirmAction({
      title: "Move product back to inventory?",
      text: product ? `${product.title} will be removed from live listings.` : "This item will be removed from live listings.",
      confirmText: "Move",
    });
    if (!confirmed) return;
    try {
      const moved = await adminAPI.moveToInventory(id);
      setApprovedProducts((prev) => prev.filter((p) => p.id !== id));
      setInventoryProducts((prev) => [moved, ...prev]);
      await alertInfo("Moved to inventory", "Product is no longer live in Shop.");
      setDashboard((d) => ({ ...d, stats: { ...d.stats, inventory_products: d.stats.inventory_products + 1, approved_products: d.stats.approved_products - 1 } }));
    } catch (e) {
      await alertError(e.message || "Move failed");
    }
  };

  const handleOrderStatus = async (id, status) => {
    const confirmed = await confirmAction({
      title: "Update order status?",
      text: `Set this order status to "${status}"?`,
      confirmText: "Update",
      confirmButtonColor: "#2563eb",
    });
    if (!confirmed) return;
    try {
      const updated = await ordersAPI.updateStatus(id, { status });
      setAllOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      await alertSuccess("Order updated", `Status changed to ${status}.`);
    } catch (e) {
      await alertError(e.message || "Status update failed");
    }
  };

  const openMessage = (partner) => {
    if (!partner?.id) return;
    const name = encodeURIComponent(partner.name || "User");
    navigate(`/chat?partner=${partner.id}&name=${name}&role=user&from=admin`);
  };

  const createVoucher = async () => {
    try {
      const created = await vouchersAPI.create({
        code: voucherForm.code.trim().toUpperCase(),
        type: voucherForm.type,
        value: Number(voucherForm.value || 0),
        min_order: Number(voucherForm.min_order || 0),
        max_uses: Number(voucherForm.max_uses || 1),
        expires_at: voucherForm.expires_at || null,
      });
      setVouchers((prev) => [created, ...prev]);
      setVoucherForm({ code: "", type: "percent", value: "", min_order: "", max_uses: "", expires_at: "" });
      setVoucherMessage("Voucher created successfully.");
    } catch (e) {
      setVoucherMessage(e.message || "Failed to create voucher.");
    }
  };

  const deactivateVoucher = async (id) => {
    try {
      const updated = await vouchersAPI.deactivate(id);
      setVouchers((prev) => prev.map((voucher) => (voucher.id === id ? updated : voucher)));
      setVoucherMessage("Voucher deactivated.");
    } catch (e) {
      setVoucherMessage(e.message || "Failed to deactivate voucher.");
    }
  };

  const updateReportStatus = async (reportId, status) => {
    try {
      const updated = await reportsAPI.updateStatus(reportId, { status });
      setReports((prev) => prev.map((report) => (report.id === reportId ? updated : report)));
      await alertSuccess("Report updated", `Status set to ${status}.`);
    } catch (error) {
      await alertError(error.message || "Failed to update report status");
    }
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
              {t === "Pending Verifications" && dashboard?.stats?.pending_products > 0 && (
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
                { label: "Revenue (Paid)", value: `PHP ${dashboard.stats.total_revenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`, icon: "wallet", color: "var(--red)" },
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
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--red)" }}>PHP {o.total_amount.toLocaleString("en-PH", { maximumFractionDigits: 0 })}</span>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 16, marginBottom: 16 }}>Items Awaiting Review</h3>
                {dashboard.pending_products.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--gray-400)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    All caught up! <Icon name="check-circle" size={14} color="var(--green)" />
                  </p>
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

        {/* Pending Verifications */}
        {tab === "Pending Verifications" && (
          <div className="fade-in">
            {pendingVerifications.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <span style={styles.emptyStateIconBadge} aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
                    </svg>
                  </span>
                </div>
                <div className="empty-state-title">No pending verifications</div>
                <div className="empty-state-text">All verification submissions have been reviewed</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {pendingVerifications.map((p) => {
                  const verificationPhotos = p.verification_media?.photos || [];
                  const verificationVideo = p.verification_media?.video;
                  return (
                    <div key={p.id} className="card" style={styles.pendingCard}>
                      <div style={styles.pendingImgs}>
                        {(
                          verificationPhotos.length > 0
                            ? verificationPhotos.map((media) => ({
                                ...media,
                                url: productsAPI.verificationMediaUrl(media.filename),
                              }))
                            : p.images.slice(0, 3).map((filename) => ({
                                filename,
                                url: productsAPI.imageUrl(filename),
                              }))
                        ).slice(0, 3).map((media, i) => (
                          <img key={i} src={media.url} alt="" style={styles.pendingImg} />
                        ))}
                      </div>
                      <div style={styles.pendingInfo}>
                        <h3 style={{ fontSize: 16 }}>{p.title}</h3>
                        <p style={{ fontSize: 13, color: "var(--gray-500)", margin: "6px 0" }}>{p.description}</p>
                        <div style={{ display: "flex", gap: 12, fontSize: 13, flexWrap: "wrap" }}>
                          <span><strong>Asking Price:</strong> PHP {p.price.toLocaleString("en-PH")}</span>
                          <span><strong>Condition:</strong> {p.condition}</span>
                          <span><strong>Qty:</strong> {p.quantity}</span>
                          <span><strong>Seller:</strong> {p.seller.name}</span>
                          {p.category && <span><strong>Category:</strong> {p.category.name}</span>}
                        </div>
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 6 }}>
                            Verification media: {verificationPhotos.length} photo(s){verificationVideo ? ", 1 video" : ", no video"}
                          </div>
                          {verificationPhotos.length > 0 && (
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                              {verificationPhotos.map((media) => (
                                <img
                                  key={media.id || media.filename}
                                  src={productsAPI.verificationMediaUrl(media.filename)}
                                  alt="Verification"
                                  style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid var(--gray-200)" }}
                                />
                              ))}
                            </div>
                          )}
                          {verificationVideo?.filename && (
                            <video controls src={productsAPI.verificationMediaUrl(verificationVideo.filename)} style={{ width: 260, maxWidth: "100%", borderRadius: 8, border: "1px solid var(--gray-200)" }} />
                          )}
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
                          <Icon name="check-circle" size={14} color="currentColor" /> Approve
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ background: "#fee2e2", color: "var(--red)", border: "none" }}
                          onClick={() => setRejectModal(p)}
                        >
                          <Icon name="x-circle" size={14} color="currentColor" /> Reject
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
                      <td style={{ fontWeight: 700 }}>PHP {o.total_amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
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
                          Final Price: PHP {(p.negotiated_price || p.price).toLocaleString("en-PH")}
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
                          Price: PHP {(p.negotiated_price || p.price).toLocaleString("en-PH")}
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

        {/* Vouchers tab */}
        {tab === "Vouchers" && (
          <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
            <div className="card" style={{ padding: 16 }}>
              <h3 style={{ marginBottom: 10 }}>Create Voucher</h3>
              <div className="input-group" style={{ marginBottom: 10 }}>
                <label>Code</label>
                <input className="input-field" value={voucherForm.code} onChange={(e) => setVoucherForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
              </div>
              <div className="input-group" style={{ marginBottom: 10 }}>
                <label>Type</label>
                <select className="input-field" value={voucherForm.type} onChange={(e) => setVoucherForm((f) => ({ ...f, type: e.target.value }))}>
                  <option value="percent">percent</option>
                  <option value="fixed">fixed</option>
                </select>
              </div>
              <div className="input-group" style={{ marginBottom: 10 }}>
                <label>Value</label>
                <input className="input-field" type="number" value={voucherForm.value} onChange={(e) => setVoucherForm((f) => ({ ...f, value: e.target.value }))} />
              </div>
              <div className="input-group" style={{ marginBottom: 10 }}>
                <label>Min Order</label>
                <input className="input-field" type="number" value={voucherForm.min_order} onChange={(e) => setVoucherForm((f) => ({ ...f, min_order: e.target.value }))} />
              </div>
              <div className="input-group" style={{ marginBottom: 10 }}>
                <label>Max Uses</label>
                <input className="input-field" type="number" value={voucherForm.max_uses} onChange={(e) => setVoucherForm((f) => ({ ...f, max_uses: e.target.value }))} />
              </div>
              <div className="input-group" style={{ marginBottom: 12 }}>
                <label>Expiry Date</label>
                <input className="input-field" type="date" value={voucherForm.expires_at} onChange={(e) => setVoucherForm((f) => ({ ...f, expires_at: e.target.value }))} />
              </div>
              <button className="btn btn-primary" style={{ width: "100%" }} onClick={createVoucher}>Create</button>
              {voucherMessage && <div style={{ marginTop: 8, fontSize: 12, color: voucherMessage.includes("success") ? "var(--green)" : "var(--red)" }}>{voucherMessage}</div>}
            </div>

            <div className="card" style={{ overflow: "hidden" }}>
              {voucherLoading ? (
                <div className="loading-center"><div className="spinner" /></div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Type</th>
                        <th>Value</th>
                        <th>Min Order</th>
                        <th>Uses</th>
                        <th>Expires</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vouchers.map((voucher) => (
                        <tr key={voucher.id}>
                          <td>{voucher.code}</td>
                          <td>{voucher.type}</td>
                          <td>{voucher.type === "percent" ? `${voucher.value}%` : `PHP ${voucher.value}`}</td>
                          <td>PHP {Number(voucher.min_order || 0).toLocaleString("en-PH")}</td>
                          <td>{voucher.used_count}/{voucher.max_uses}</td>
                          <td>{voucher.expires_at ? new Date(voucher.expires_at).toLocaleDateString("en-PH") : "-"}</td>
                          <td><span className={`badge ${voucher.status === "active" ? "badge-green" : voucher.status === "expired" ? "badge-yellow" : "badge-red"}`}>{voucher.status}</span></td>
                          <td>
                            <button className="btn btn-sm" style={{ background: "#fee2e2", color: "var(--red)", border: "none" }} onClick={() => deactivateVoucher(voucher.id)}>
                              Deactivate
                            </button>
                          </td>
                        </tr>
                      ))}
                      {vouchers.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", padding: 16 }}>No vouchers yet.</td></tr>}
                    </tbody>
                  </table>
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

        {tab === "Reports" && (
          <div className="fade-in card" style={{ overflow: "hidden" }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>User</th>
                    <th>Type</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td>#{report.id}</td>
                      <td>{report.user_name || "User"}</td>
                      <td>{report.type}</td>
                      <td style={{ maxWidth: 260 }}>
                        <div style={{ fontWeight: 700 }}>{report.title}</div>
                        {report.description && <div style={{ fontSize: 12, color: "var(--gray-500)" }}>{report.description}</div>}
                        {report.screenshot && (
                          <a href={reportsAPI.screenshotUrl(report.screenshot)} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                            View screenshot
                          </a>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${report.status === "resolved" ? "badge-green" : "badge-yellow"}`}>
                          {report.status}
                        </span>
                      </td>
                      <td>{new Date(report.created_at).toLocaleString("en-PH")}</td>
                      <td>
                        <select
                          className="input-field"
                          style={{ padding: "4px 8px", fontSize: 12 }}
                          value={report.status}
                          onChange={(e) => updateReportStatus(report.id, e.target.value)}
                        >
                          <option value="pending">pending</option>
                          <option value="resolved">resolved</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: 16 }}>No reports yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
              <button className="btn btn-ghost btn-sm" onClick={() => setRejectModal(null)} aria-label="Close reject modal">
                <Icon name="x-circle" size={16} color="currentColor" />
              </button>
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
