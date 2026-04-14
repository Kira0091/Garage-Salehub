import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ordersAPI } from "../services/api";
import Icon from "../components/Icon";

export default function ProfilePage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const displayName = String(user?.name || user?.full_name || user?.username || "User").trim() || "User";

  useEffect(() => {
    if (!user) return;
    ordersAPI.getAll()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoadingOrders(false));
  }, [user]);

  const counts = useMemo(() => {
    const toPay = orders.filter((order) => order.payment_status === "pending" && order.status === "pending").length;
    const toShipped = orders.filter((order) => order.status === "processing").length;
    const toReceived = orders.filter((order) => order.status === "shipped").length;
    const history = orders.filter((order) => ["delivered", "cancelled"].includes(order.status)).length;
    return { toPay, toShipped, toReceived, history };
  }, [orders]);

  if (!user) {
    return (
      <div className="container" style={{ padding: "32px 16px" }}>
        <h1 style={{ marginBottom: 8 }}>Profile</h1>
        <p style={{ color: "var(--gray-500)" }}>No user session found.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 980 }}>
        <div className="page-header">
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">{displayName}</p>
        </div>

        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}><strong>Name:</strong> {displayName}</div>
          <div style={{ marginBottom: 8 }}><strong>Email:</strong> {user.email}</div>
          <div><strong>Role:</strong> {user.role}</div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>My Purchases</h3>
            <Link to="/orders?tab=history" style={{ color: "var(--gray-600)", fontWeight: 600 }}>
              View Purchase History
            </Link>
          </div>

          {loadingOrders ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <PurchaseShortcut to="/orders?tab=to_pay" icon="wallet" label="To Pay" count={counts.toPay} />
              <PurchaseShortcut to="/orders?tab=to_shipped" icon="box" label="To Shipped" count={counts.toShipped} />
              <PurchaseShortcut to="/orders?tab=to_received" icon="truck" label="To Received" count={counts.toReceived} />
              <PurchaseShortcut to="/orders?tab=history" icon="check-circle" label="History" count={counts.history} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PurchaseShortcut({ to, icon, label, count }) {
  return (
    <Link to={to} style={{ border: "1px solid var(--gray-200)", borderRadius: 10, padding: 14, textDecoration: "none", color: "var(--black)", display: "grid", gap: 8, justifyItems: "center" }}>
      <span style={{ display: "inline-flex" }}><Icon name={icon} size={22} color="var(--gray-700)" /></span>
      <span style={{ fontWeight: 700 }}>{label}</span>
      <span className={`badge ${count > 0 ? "badge-red" : "badge-blue"}`}>{count}</span>
    </Link>
  );
}
