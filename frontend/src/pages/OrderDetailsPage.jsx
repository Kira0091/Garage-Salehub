import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ordersAPI } from "../services/api";
import { alertError, alertSuccess, confirmAction } from "../utils/alerts";

export default function OrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [receiving, setReceiving] = useState(false);

  useEffect(() => {
    ordersAPI.getOne(id)
      .then(setOrder)
      .catch(() => navigate("/orders"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const firstProduct = useMemo(() => order?.items?.[0]?.product, [order]);

  const handleReceived = async () => {
    const confirmed = await confirmAction({
      title: "Confirm order received?",
      text: "This will mark your order as delivered.",
      confirmText: "Order Received",
      confirmButtonColor: "#16a34a",
    });
    if (!confirmed) return;
    setReceiving(true);
    try {
      const updated = await ordersAPI.markReceived(order.id);
      setOrder(updated);
      await alertSuccess("Order updated", "Order marked as received.");
    } catch (error) {
      await alertError(error.message || "Failed to update order");
    } finally {
      setReceiving(false);
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!order) return null;

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 900 }}>
        <div className="page-header">
          <h1 className="page-title">Order Details</h1>
          <p className="page-subtitle">Order #{order.id}</p>
        </div>

        <div className="card" style={{ padding: 18, marginBottom: 14 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div><strong>Status:</strong> {order.status}</div>
            <div><strong>Payment:</strong> {order.payment_status}</div>
            <div><strong>Tracking:</strong> {order.tracking_number || "-"}</div>
            <div><strong>Delivery Address:</strong> {order.delivery_address || "-"}</div>
            <div><strong>Created:</strong> {new Date(order.created_at).toLocaleString("en-PH")}</div>
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ marginBottom: 10 }}>Items</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {order.items.map((item) => (
              <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "center", borderBottom: "1px solid var(--gray-100)", paddingBottom: 10 }}>
                <Link to={`/product/${item.product.id}`} style={{ fontWeight: 700, color: "var(--black)" }}>
                  {item.product.title}
                </Link>
                <div style={{ fontSize: 13, color: "var(--gray-500)" }}>x{item.quantity}</div>
                <div style={{ fontWeight: 700 }}>PHP {Number(item.subtotal).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontWeight: 800 }}>Order Total: PHP {Number(order.total_amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</div>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn btn-ghost" to="/orders">Back to Orders</Link>
          {order.status === "shipped" && (
            <button className="btn btn-primary" onClick={handleReceived} disabled={receiving}>
              {receiving ? "Updating..." : "Order Received"}
            </button>
          )}
          {firstProduct?.id && (
            <Link className="btn btn-outline" to={`/product/${firstProduct.id}`}>
              Buy Again
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
