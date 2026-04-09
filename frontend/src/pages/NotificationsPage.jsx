import { useEffect, useState } from "react";
import { notificationsAPI } from "../services/api";
import { useToast } from "../components/Toast";
import { Link } from "react-router-dom";

export default function NotificationsPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    notificationsAPI.getAll()
      .then((data) => {
        setNotes(data);
        const unread = data.filter((n) => !n.is_read).length;
        localStorage.setItem("notif_unread", String(unread));
      })
      .catch((e) => toast(e.message, "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotes((prev) => {
        const next = prev.map((n) => (n.id === id ? { ...n, is_read: true } : n));
        const unread = next.filter((n) => !n.is_read).length;
        localStorage.setItem("notif_unread", String(unread));
        return next;
      });
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const markAll = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotes((prev) => prev.map((n) => ({ ...n, is_read: true })));
      localStorage.setItem("notif_unread", "0");
    } catch (e) {
      toast(e.message, "error");
    }
  };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 900 }}>
        <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="page-title">Notifications</h1>
            <p className="page-subtitle">Your latest updates and alerts</p>
          </div>
          {notes.length > 0 && (
            <button className="btn btn-ghost" onClick={markAll}>Mark all as read</button>
          )}
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : notes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <div className="empty-state-title">No notifications</div>
            <div className="empty-state-text">You're all caught up.</div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {notes.map((n) => (
              <div key={n.id} style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--gray-100)",
                background: n.is_read ? "white" : "#fff5f5",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{n.title}</div>
                  <div style={{ fontSize: 13, color: "var(--gray-600)", marginTop: 4 }}>{n.body}</div>
                  <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 6 }}>
                    {new Date(n.created_at).toLocaleString("en-PH")}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {n.link && <Link to={n.link} className="btn btn-sm btn-ghost">View</Link>}
                  {!n.is_read && <button className="btn btn-sm btn-outline" onClick={() => markRead(n.id)}>Mark read</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
