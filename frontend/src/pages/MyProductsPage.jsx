// src/pages/MyProductsPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { productsAPI } from "../services/api";
import { useToast } from "../components/Toast";

const statusBadge = {
  pending: "badge-yellow",
  approved: "badge-green",
  rejected: "badge-red",
  sold: "badge-gray",
};

const statusLabel = {
  pending: "⏳ Pending Review",
  approved: "✅ Approved",
  rejected: "❌ Rejected",
  sold: "🏷️ Sold",
};

export default function MyProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadProducts = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await productsAPI.myProducts();
      setProducts(data);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts(true);
  }, []);

  useEffect(() => {
    const checkRefresh = () => {
      const refreshAt = localStorage.getItem("my_products_refresh");
      if (refreshAt) {
        localStorage.removeItem("my_products_refresh");
        loadProducts();
      }
    };

    window.addEventListener("focus", checkRefresh);
    document.addEventListener("visibilitychange", checkRefresh);
    checkRefresh();
    return () => {
      window.removeEventListener("focus", checkRefresh);
      document.removeEventListener("visibilitychange", checkRefresh);
    };
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this submission?")) return;
    try {
      await productsAPI.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast("Submission deleted", "success");
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const stats = {
    total: products.length,
    pending: products.filter((p) => p.status === "pending").length,
    approved: products.filter((p) => p.status === "approved").length,
    rejected: products.filter((p) => p.status === "rejected").length,
    sold: products.filter((p) => p.status === "sold").length,
  };

  return (
    <div className="page">
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 className="page-title">📦 My Submissions</h1>
            <p className="page-subtitle">Items you've submitted for resale</p>
          </div>
          <Link to="/sell" className="btn btn-primary">+ Submit New Item</Link>
        </div>

        {/* Stats */}
        <div style={styles.statsGrid}>
          {[
            { label: "Total", value: stats.total, color: "var(--black)" },
            { label: "Pending", value: stats.pending, color: "var(--yellow)" },
            { label: "Approved", value: stats.approved, color: "var(--green)" },
            { label: "Rejected", value: stats.rejected, color: "var(--red)" },
            { label: "Sold", value: stats.sold, color: "var(--gray-500)" },
          ].map((s) => (
            <div key={s.label} className="card" style={{ padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: "Syne" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "var(--gray-500)", fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">No submissions yet</div>
            <div className="empty-state-text">Submit your first item for review</div>
            <Link to="/sell" className="btn btn-primary" style={{ marginTop: 16 }}>+ Submit Item</Link>
          </div>
        ) : (
          <div className="card" style={{ overflow: "hidden" }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Asking Price</th>
                    <th>Negotiated Price</th>
                    <th>Condition</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const img = p.images?.[0] ? productsAPI.imageUrl(p.images[0]) : null;
                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {img && <img src={img} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6 }} />}
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</div>
                              {p.category && <div style={{ fontSize: 12, color: "var(--gray-400)" }}>{p.category.name}</div>}
                            </div>
                          </div>
                        </td>
                        <td>₱{p.price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                        <td>{p.negotiated_price ? <span style={{ color: "var(--green)", fontWeight: 600 }}>₱{p.negotiated_price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span> : <span style={{ color: "var(--gray-400)" }}>—</span>}</td>
                        <td>{p.condition}</td>
                        <td>
                          <span className={`badge ${statusBadge[p.status]}`}>{statusLabel[p.status]}</span>
                          {p.status === "rejected" && p.rejection_reason && (
                            <div style={{ fontSize: 11, color: "var(--red)", marginTop: 4 }}>{p.rejection_reason}</div>
                          )}
                        </td>
                        <td style={{ fontSize: 12, color: "var(--gray-500)" }}>{new Date(p.created_at).toLocaleDateString("en-PH")}</td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <Link to={`/product/${p.id}`} className="btn btn-ghost btn-sm">View</Link>
                            {p.status === "pending" && (
                              <button className="btn btn-sm" style={{ background: "#fee2e2", color: "var(--red)", border: "none" }} onClick={() => handleDelete(p.id)}>Delete</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 24 },
};
