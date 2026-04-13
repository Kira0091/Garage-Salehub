import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loyaltyAPI } from "../services/api";
import { useToast } from "../components/Toast";

export default function LoyaltyPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    loyaltyAPI.get()
      .then(setData)
      .catch((err) => toast(err.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  const progress = useMemo(() => {
    const points = data?.total_earned || 0;
    return Math.min(100, Math.round((points / 500) * 100));
  }, [data]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!data) return null;

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 980 }}>
        <h1 className="page-title">My Points</h1>
        <p className="page-subtitle">Use points at checkout: 1 point = PHP 1 discount</p>

        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: "var(--gray-500)" }}>Current Balance</div>
          <div style={{ fontSize: 42, fontWeight: 800 }}>{data.points}</div>
          <div style={{ marginTop: 8, fontSize: 13, color: "var(--gray-500)" }}>Progress to VIP (500 total earned)</div>
          <div style={{ width: "100%", height: 10, background: "var(--gray-200)", borderRadius: 999, marginTop: 8 }}>
            <div style={{ width: `${progress}%`, height: "100%", background: "var(--red)", borderRadius: 999 }} />
          </div>
        </div>

        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ marginBottom: 10 }}>How to earn points</h3>
          <ul style={{ margin: 0, paddingLeft: 18, color: "var(--gray-700)" }}>
            <li>Delivered order: +1 point per PHP 10 spent</li>
            <li>Review submitted: +10 points</li>
            <li>First delivered order: +25 bonus points</li>
            <li>Seller item approved: +5 points</li>
          </ul>
        </div>

        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Point Transactions</h3>
            <Link to="/shop" className="btn btn-primary btn-sm">Redeem at Checkout</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reason</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {data.log.map((entry) => (
                  <tr key={entry.id}>
                    <td>{new Date(entry.created_at).toLocaleString("en-PH")}</td>
                    <td>{entry.reason}</td>
                    <td style={{ color: entry.points >= 0 ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
                      {entry.points >= 0 ? `+${entry.points}` : entry.points}
                    </td>
                  </tr>
                ))}
                {data.log.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: "center", padding: 16 }}>No transactions yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
