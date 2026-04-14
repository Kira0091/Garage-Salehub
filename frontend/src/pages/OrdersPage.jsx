import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ordersAPI } from "../services/api";
import { alertError, alertInfo, alertSuccess, confirmAction } from "../utils/alerts";
import Icon from "../components/Icon";

const TABS = [
  { key: "all", label: "All" },
  { key: "to_pay", label: "To Pay" },
  { key: "to_shipped", label: "To Shipped" },
  { key: "to_received", label: "To Received" },
  { key: "history", label: "Purchase History" },
];

const statusColors = {
  pending: "badge-yellow",
  processing: "badge-blue",
  shipped: "badge-blue",
  delivered: "badge-green",
  cancelled: "badge-red",
};

function belongsToTab(order, tab) {
  if (tab === "all") return true;
  if (tab === "to_pay") return order.payment_status === "pending" && order.status === "pending";
  if (tab === "to_shipped") return order.status === "processing";
  if (tab === "to_received") return order.status === "shipped";
  if (tab === "history") return ["delivered", "cancelled"].includes(order.status);
  return true;
}

function statusLabel(status) {
  if (status === "pending") return "to pay";
  if (status === "processing") return "to shipped";
  if (status === "shipped") return "to received";
  if (status === "delivered") return "completed";
  return status;
}

export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingOrderId, setWorkingOrderId] = useState(null);
  const tab = searchParams.get("tab") || "all";

  useEffect(() => {
    ordersAPI.getAll().then(setOrders).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => orders.filter((order) => belongsToTab(order, tab)), [orders, tab]);

  const setTab = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value === "all") next.delete("tab");
    else next.set("tab", value);
    setSearchParams(next);
  };

  const handleCancel = async (orderId) => {
    const confirmed = await confirmAction({
      title: "Cancel this order?",
      text: "This action cannot be undone.",
      confirmText: "Cancel Order",
    });
    if (!confirmed) return;
    setWorkingOrderId(orderId);
    try {
      const updated = await ordersAPI.cancel(orderId);
      setOrders((prev) => prev.map((order) => (order.id === orderId ? updated : order)));
      await alertInfo("Order cancelled", `Order #${orderId} has been cancelled.`);
    } catch (error) {
      await alertError(error.message || "Failed to cancel order");
    } finally {
      setWorkingOrderId(null);
    }
  };

  const handleOrderReceived = async (orderId) => {
    const confirmed = await confirmAction({
      title: "Confirm order received?",
      text: "This will move the order to completed history.",
      confirmText: "Order Received",
      confirmButtonColor: "#16a34a",
    });
    if (!confirmed) return;
    setWorkingOrderId(orderId);
    try {
      const updated = await ordersAPI.markReceived(orderId);
      setOrders((prev) => prev.map((order) => (order.id === orderId ? updated : order)));
      await alertSuccess("Order updated", `Order #${orderId} is marked as received.`);
    } catch (error) {
      await alertError(error.message || "Failed to mark order received");
    } finally {
      setWorkingOrderId(null);
    }
  };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 980 }}>
        <div className="page-header">
          <h1 className="page-title">My Purchases</h1>
          <p className="page-subtitle">{filtered.length} order{filtered.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="card" style={{ padding: 10, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TABS.map((item) => (
              <button
                key={item.key}
                className="btn btn-sm"
                onClick={() => setTab(item.key)}
                style={tab === item.key ? { background: "var(--red)", color: "white", border: "none" } : {}}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Icon name="cart" size={48} color="var(--gray-400)" /></div>
            <div className="empty-state-title">No orders in this section</div>
            <Link to="/shop" className="btn btn-primary" style={{ marginTop: 12 }}>Shop Now</Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map((order) => {
              const firstItem = order.items?.[0];
              const firstProductId = firstItem?.product?.id;
              return (
                <div key={order.id} className="card" style={{ padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontWeight: 800 }}>Order #{order.id}</div>
                    <span className={`badge ${statusColors[order.status] || "badge-blue"}`}>{statusLabel(order.status)}</span>
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    {order.items.map((item) => (
                      <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center", borderBottom: "1px solid var(--gray-100)", paddingBottom: 8 }}>
                        <Link to={`/product/${item.product.id}`} style={{ color: "var(--black)", fontWeight: 600 }}>
                          {item.product.title}
                        </Link>
                        <span style={{ fontSize: 13, color: "var(--gray-500)" }}>x{item.quantity}</span>
                        <span style={{ fontWeight: 700 }}>PHP {Number(item.subtotal).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ fontSize: 13, color: "var(--gray-500)" }}>{new Date(order.created_at).toLocaleString("en-PH")}</div>
                    <div style={{ fontWeight: 800, color: "var(--red)" }}>Total: PHP {Number(order.total_amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</div>
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Link className="btn btn-ghost btn-sm" to={`/orders/${order.id}`}>Order Details</Link>
                    {order.status === "shipped" && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleOrderReceived(order.id)}
                        disabled={workingOrderId === order.id}
                      >
                        {workingOrderId === order.id ? "Updating..." : "Order Received"}
                      </button>
                    )}
                    {["pending", "processing"].includes(order.status) && (
                      <button
                        className="btn btn-sm"
                        style={{ background: "#fee2e2", color: "var(--red)", border: "none" }}
                        onClick={() => handleCancel(order.id)}
                        disabled={workingOrderId === order.id}
                      >
                        Cancel Order
                      </button>
                    )}
                    {firstProductId && (
                      <Link className="btn btn-outline btn-sm" to={`/product/${firstProductId}`}>
                        Buy Again
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
