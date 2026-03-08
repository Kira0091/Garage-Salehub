// src/pages/CheckoutPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { ordersAPI } from "../services/api";
import { useToast } from "../components/Toast";

const PAYMENT_METHODS = [
  { id: "cod", label: "Cash on Delivery", icon: "💵" },
  { id: "gcash", label: "GCash (Simulated)", icon: "📱" },
  { id: "card", label: "Credit/Debit Card (Simulated)", icon: "💳" },
  { id: "bank", label: "Bank Transfer (Simulated)", icon: "🏦" },
];

export default function CheckoutPage() {
  const { cart, total, clearCart } = useCart();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1=address, 2=payment, 3=confirm, 4=done
  const [address, setAddress] = useState(user?.address || "");
  const [payMethod, setPayMethod] = useState("cod");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [cardNum, setCardNum] = useState("");
  const [gcashNum, setGcashNum] = useState("");

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      const newOrder = await ordersAPI.create({
        items: cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        delivery_address: address,
        payment_method: payMethod,
      });

      // Simulate payment if not COD
      if (payMethod !== "cod") {
        await ordersAPI.pay(newOrder.id, { payment_method: payMethod });
        toast("Payment processed successfully! (Simulated)", "success");
      }

      setOrder(newOrder);
      setStep(4);
      clearCart();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  if (step === 4 && order) {
    return (
      <div className="page">
        <div className="container" style={{ maxWidth: 560 }}>
          <div className="card" style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h2 style={{ marginBottom: 8 }}>Order Placed!</h2>
            <p style={{ color: "var(--gray-500)", marginBottom: 20 }}>Your order has been successfully placed.</p>
            <div style={styles.orderInfo}>
              <div style={styles.orderRow}><span>Order ID</span><strong>#{order.id}</strong></div>
              <div style={styles.orderRow}><span>Tracking</span><strong>{order.tracking_number}</strong></div>
              <div style={styles.orderRow}><span>Payment</span><strong style={{ textTransform: "capitalize" }}>{payMethod === "cod" ? "Cash on Delivery" : `${payMethod.toUpperCase()} (Simulated)`}</strong></div>
              <div style={styles.orderRow}><span>Total</span><strong style={{ color: "var(--red)" }}>₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong></div>
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: 24 }} onClick={() => navigate("/orders")}>
              View My Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  const steps = ["Delivery", "Payment", "Confirm"];

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 900 }}>
        <h1 className="page-title" style={{ marginBottom: 28 }}>Checkout</h1>

        {/* Stepper */}
        <div style={styles.stepper}>
          {steps.map((s, i) => (
            <div key={s} style={styles.stepItem}>
              <div style={{ ...styles.stepCircle, ...(step > i + 1 ? styles.stepDone : step === i + 1 ? styles.stepActive : {}) }}>
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 13, fontWeight: step === i + 1 ? 700 : 400, color: step === i + 1 ? "var(--black)" : "var(--gray-400)" }}>{s}</span>
              {i < steps.length - 1 && <div style={styles.stepLine} />}
            </div>
          ))}
        </div>

        <div style={styles.layout}>
          <div>
            {/* Step 1: Address */}
            {step === 1 && (
              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ marginBottom: 20 }}>Delivery Address</h3>
                <div className="input-group" style={{ marginBottom: 16 }}>
                  <label>Full Name</label>
                  <input className="input-field" value={user?.name} readOnly />
                </div>
                <div className="input-group" style={{ marginBottom: 20 }}>
                  <label>Delivery Address *</label>
                  <textarea
                    className="input-field"
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House #, Street, Barangay, City, Province"
                  />
                </div>
                <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={() => { if (!address.trim()) return toast("Address required", "error"); setStep(2); }}>
                  Continue to Payment →
                </button>
              </div>
            )}

            {/* Step 2: Payment */}
            {step === 2 && (
              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ marginBottom: 20 }}>Payment Method</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                  {PAYMENT_METHODS.map((m) => (
                    <label key={m.id} style={{ ...styles.payOption, ...(payMethod === m.id ? styles.payOptionActive : {}) }}>
                      <input type="radio" value={m.id} checked={payMethod === m.id} onChange={() => setPayMethod(m.id)} style={{ display: "none" }} />
                      <span style={{ fontSize: 24 }}>{m.icon}</span>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{m.label}</span>
                      {payMethod === m.id && <span style={{ color: "var(--red)" }}>✓</span>}
                    </label>
                  ))}
                </div>

                {payMethod === "card" && (
                  <div style={{ background: "var(--gray-50)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                    <div className="input-group" style={{ marginBottom: 10 }}>
                      <label>Card Number (Simulated)</label>
                      <input className="input-field" placeholder="1234 5678 9012 3456" value={cardNum} onChange={(e) => setCardNum(e.target.value)} maxLength={19} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div className="input-group"><label>Expiry</label><input className="input-field" placeholder="MM/YY" /></div>
                      <div className="input-group"><label>CVV</label><input className="input-field" placeholder="123" type="password" /></div>
                    </div>
                  </div>
                )}

                {payMethod === "gcash" && (
                  <div style={{ background: "var(--gray-50)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                    <div className="input-group">
                      <label>GCash Number (Simulated)</label>
                      <input className="input-field" placeholder="09XX XXX XXXX" value={gcashNum} onChange={(e) => setGcashNum(e.target.value)} />
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
                  <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={() => setStep(3)}>Review Order →</button>
                </div>
              </div>
            )}

            {/* Step 3: Confirm */}
            {step === 3 && (
              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ marginBottom: 20 }}>Confirm Order</h3>
                <div style={styles.confirmRow}><span>Delivery to:</span><strong>{address}</strong></div>
                <div style={styles.confirmRow}><span>Payment:</span><strong>{PAYMENT_METHODS.find((m) => m.id === payMethod)?.label}</strong></div>
                {payMethod !== "cod" && (
                  <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: "var(--yellow)" }}>
                    ⚠️ This is a <strong>simulated payment</strong>. No real money will be charged.
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
                  <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={handlePlaceOrder} disabled={loading}>
                    {loading ? "Processing..." : "Place Order ✓"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order summary sidebar */}
          <div className="card" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 16, marginBottom: 16 }}>Your Items</h4>
            {cart.map(({ product, quantity }) => {
              const price = product.negotiated_price || product.price;
              return (
                <div key={product.id} style={styles.summaryItem}>
                  <span style={{ flex: 1, fontSize: 13, color: "var(--gray-700)" }}>{product.title} × {quantity}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>₱{(price * quantity).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                </div>
              );
            })}
            <div style={{ borderTop: "1px solid var(--gray-200)", paddingTop: 14, marginTop: 8, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700 }}>Total</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "var(--red)", fontFamily: "Syne" }}>₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  stepper: { display: "flex", alignItems: "center", marginBottom: 32 },
  stepItem: { display: "flex", alignItems: "center", gap: 8, flex: 1 },
  stepCircle: { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, background: "var(--gray-200)", color: "var(--gray-500)", flexShrink: 0 },
  stepActive: { background: "var(--red)", color: "white" },
  stepDone: { background: "var(--green)", color: "white" },
  stepLine: { flex: 1, height: 2, background: "var(--gray-200)" },
  layout: { display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" },
  payOption: { display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", border: "2px solid var(--gray-200)", borderRadius: 10, cursor: "pointer", transition: "all 0.15s" },
  payOptionActive: { border: "2px solid var(--red)", background: "#fff5f5" },
  confirmRow: { display: "flex", gap: 12, marginBottom: 12, fontSize: 14 },
  summaryItem: { display: "flex", justifyContent: "space-between", marginBottom: 10 },
  orderInfo: { background: "var(--gray-50)", borderRadius: 10, padding: 16, textAlign: "left" },
  orderRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--gray-200)", fontSize: 14 },
};
