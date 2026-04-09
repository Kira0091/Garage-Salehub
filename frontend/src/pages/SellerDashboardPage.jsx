import { useEffect, useState } from "react";
import { usersAPI } from "../services/api";
import { useToast } from "../components/Toast";

export default function SellerDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    usersAPI.analytics()
      .then((data) => setStats(data.stats))
      .catch((e) => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!stats) return null;

  const cards = [
    { label: "Total Listings", value: stats.total_listings },
    { label: "Pending", value: stats.pending },
    { label: "Approved", value: stats.approved },
    { label: "Sold", value: stats.sold },
    { label: "Total Views", value: stats.total_views },
    { label: "Wishlist Adds", value: stats.wishlist_count },
    { label: "Orders", value: stats.orders_count },
    { label: "Total Revenue", value: `₱${stats.total_revenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}` },
    { label: "Avg Selling Price", value: `₱${stats.avg_selling_price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}` },
    { label: "Rating", value: stats.rating_avg ? `${stats.rating_avg} (${stats.rating_count})` : "No ratings" },
  ];

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Seller Dashboard</h1>
          <p className="page-subtitle">Track your performance and optimize listings</p>
        </div>

        <div style={styles.grid}>
          {cards.map((c) => (
            <div key={c.label} className="card" style={styles.card}>
              <div style={{ fontSize: 12, color: "var(--gray-500)", fontWeight: 600 }}>{c.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>{c.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  grid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 },
  card: { padding: 16 },
};
