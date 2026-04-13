import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { productsAPI, usersAPI } from "../services/api";
import { useToast } from "../components/Toast";
import ProductCard from "../components/ProductCard";

export default function SellerDashboardPage() {
  const [data, setData] = useState(null);
  const [recommendation, setRecommendation] = useState({ because_of: null, products: [] });
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    usersAPI.sellerDashboard()
      .then(setData)
      .catch((err) => toast(err.message, "error"))
      .finally(() => setLoading(false));
    productsAPI.recommendations()
      .then(setRecommendation)
      .catch(() => setRecommendation({ because_of: null, products: [] }));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!data) return null;

  const cards = [
    { label: "Total", value: data.total_products },
    { label: "Approved", value: data.approved },
    { label: "Rejected", value: data.rejected },
    { label: "Pending", value: data.pending },
    { label: "Views", value: data.total_views },
    { label: "Earnings (PHP)", value: data.simulated_earnings.toLocaleString("en-PH", { minimumFractionDigits: 2 }) },
  ];

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Seller Dashboard</h1>
          <p className="page-subtitle">Track listings, visibility, and simulated earnings.</p>
          <div style={{ marginTop: 12 }}>
            <Link to="/report-problem" className="btn btn-outline">Report a problem</Link>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
          {cards.map((card) => (
            <div key={card.label} className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 12, color: "var(--gray-500)", fontWeight: 600 }}>{card.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{card.value}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ overflow: "hidden" }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Views</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.title}</td>
                    <td>PHP {(product.negotiated_price || product.price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                    <td><span className={`badge ${product.status === "approved" ? "badge-green" : product.status === "rejected" ? "badge-red" : "badge-yellow"}`}>{product.status}</span></td>
                    <td>{product.view_count || 0}</td>
                    <td>{new Date(product.created_at).toLocaleDateString("en-PH")}</td>
                  </tr>
                ))}
                {data.recent_products.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: 20 }}>No products yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <div className="page-header" style={{ marginBottom: 12 }}>
            <h2 className="page-title" style={{ fontSize: 20 }}>Recommended For You</h2>
            <p className="page-subtitle">
              {recommendation.because_of?.product_title
                ? `Because you commented on ${recommendation.because_of.product_title}`
                : "Based on your activity"}
            </p>
          </div>
          {recommendation.products.length === 0 ? (
            <div className="card" style={{ padding: 16, fontSize: 13, color: "var(--gray-500)" }}>
              No recommendations yet.
            </div>
          ) : (
            <div className="products-grid">
              {recommendation.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
