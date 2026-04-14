// src/pages/CheckoutPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { loyaltyAPI, ordersAPI, usersAPI, vouchersAPI } from "../services/api";
import { alertError, alertInfo, alertSuccess, confirmAction } from "../utils/alerts";
import Icon from "../components/Icon";
import PhilippineAddressField from "../components/PhilippineAddressField";

const PAYMENT_METHODS = [
  { id: "cod", label: "Cash on Delivery", icon: "cash" },
  { id: "gcash", label: "GCash (Simulated)", icon: "phone" },
  { id: "card", label: "Credit/Debit Card (Simulated)", icon: "credit-card" },
  { id: "bank", label: "Bank Transfer (Simulated)", icon: "bank" },
];

export default function CheckoutPage() {
  const { cart, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [address, setAddress] = useState(user?.address || "");
  const [payMethod, setPayMethod] = useState("cod");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [cardNum, setCardNum] = useState("");
  const [gcashNum, setGcashNum] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherData, setVoucherData] = useState(null);
  const [voucherError, setVoucherError] = useState("");
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsInput, setPointsInput] = useState(0);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressFormKey, setAddressFormKey] = useState(0);
  const [addressDraft, setAddressDraft] = useState({
    label: "Checkout Address",
    region_code: "",
    region_name: "",
    municipality_code: "",
    municipality_name: "",
    barangay_code: "",
    barangay_name: "",
    postal_code: "",
    street_line: "",
    full_address: "",
  });

  const subtotal = total;
  const voucherDiscount = Math.min(voucherData?.discount || 0, subtotal);
  const maxPointsApplicable = Math.max(0, Math.floor(subtotal - voucherDiscount));
  const pointsToUse = usePoints ? Math.max(0, Math.min(Number(pointsInput || 0), loyaltyPoints, maxPointsApplicable)) : 0;
  const pointsDiscount = pointsToUse;
  const finalTotal = Math.max(0, subtotal - voucherDiscount - pointsDiscount);

  useEffect(() => {
    loyaltyAPI.get().then((data) => {
      const p = data.points || 0;
      setLoyaltyPoints(p);
      setPointsInput(p);
    }).catch(() => {});
  }, []);

  const loadAddresses = async () => {
    try {
      const data = await usersAPI.addresses();
      const list = Array.isArray(data) ? data : [];
      setAddresses(list);
      const defaultAddress = list.find((item) => item.is_default);
      if (defaultAddress) {
        setSelectedAddressId(String(defaultAddress.id));
        setAddress(defaultAddress.full_address || "");
      } else if (list[0]) {
        setSelectedAddressId(String(list[0].id));
        setAddress(list[0].full_address || "");
      }
    } catch {
      setAddresses([]);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadAddresses();
  }, [user]);

  useEffect(() => {
    if (!user?.address) return;
    setAddress((prev) => (prev && prev.trim() ? prev : user.address));
  }, [user?.address]);

  const handleSelectAddress = (id) => {
    setSelectedAddressId(id);
    const found = addresses.find((item) => String(item.id) === String(id));
    if (found) setAddress(found.full_address || "");
  };

  const openAddAddressModal = () => {
    setAddressDraft({
      label: "Checkout Address",
      region_code: "",
      region_name: "",
      municipality_code: "",
      municipality_name: "",
      barangay_code: "",
      barangay_name: "",
      postal_code: "",
      street_line: "",
      full_address: "",
    });
    setAddressFormKey((k) => k + 1);
    setAddressModalOpen(true);
  };

  const saveCheckoutAddress = async () => {
    if (!addressDraft.full_address || !addressDraft.region_code || !addressDraft.municipality_code || !addressDraft.barangay_code || !addressDraft.street_line) {
      await alertError("Incomplete address", "Please complete the address fields.");
      return;
    }
    try {
      setSavingAddress(true);
      const created = await usersAPI.createAddress({ ...addressDraft });
      await loadAddresses();
      setSelectedAddressId(String(created.id));
      setAddress(created.full_address || "");
      setAddressModalOpen(false);
      await alertSuccess("Address added", "New address is ready for this checkout.");
    } catch (error) {
      await alertError(error.message || "Unable to save address");
    } finally {
      setSavingAddress(false);
    }
  };

  const applyVoucher = async () => {
    const code = voucherCode.trim().toUpperCase();
    if (!code) {
      setVoucherError("Enter a voucher code.");
      setVoucherData(null);
      return;
    }
    try {
      const data = await vouchersAPI.validate({ code, order_total: subtotal });
      setVoucherData(data);
      setVoucherError("");
    } catch (err) {
      setVoucherData(null);
      setVoucherError(err.message || "Invalid voucher");
    }
  };

  const handlePlaceOrder = async () => {
    const confirmed = await confirmAction({
      title: "Place this order?",
      text: "Please confirm your delivery details and payment method.",
      confirmText: "Place order",
      confirmButtonColor: "#16a34a",
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      const newOrder = await ordersAPI.create({
        items: cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        delivery_address: address,
        payment_method: payMethod,
        voucher_code: voucherData?.code || null,
        points_used: pointsToUse || 0,
      });

      if (payMethod !== "cod") {
        await ordersAPI.pay(newOrder.id, { payment_method: payMethod });
        await alertInfo("Payment processed", "Simulated payment completed successfully.");
      }

      setOrder(newOrder);
      setStep(4);
      clearCart();
      await alertSuccess("Order placed", "Your order has been placed successfully.");
    } catch (e) {
      await alertError(e.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  if (step === 4 && order) {
    return (
      <div className="page">
        <div className="container" style={{ maxWidth: 560 }}>
          <div className="card" style={{ padding: 40, textAlign: "center" }}>
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}><Icon name="check-circle" size={64} color="var(--green)" /></div>
            <h2 style={{ marginBottom: 8 }}>Order Placed!</h2>
            <p style={{ color: "var(--gray-500)", marginBottom: 20 }}>Your order has been successfully placed.</p>
            <div style={styles.orderInfo}>
              <div style={styles.orderRow}><span>Order ID</span><strong>#{order.id}</strong></div>
              <div style={styles.orderRow}><span>Tracking</span><strong>{order.tracking_number}</strong></div>
              <div style={styles.orderRow}><span>Payment</span><strong style={{ textTransform: "capitalize" }}>{payMethod === "cod" ? "Cash on Delivery" : `${payMethod.toUpperCase()} (Simulated)`}</strong></div>
              {order.voucher_code && <div style={styles.orderRow}><span>Voucher</span><strong>{order.voucher_code}</strong></div>}
              {Number(order.discount_amount || 0) > 0 && <div style={styles.orderRow}><span>Total Discount</span><strong style={{ color: "var(--green)" }}>- PHP {Number(order.discount_amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong></div>}
              <div style={styles.orderRow}><span>Final Total</span><strong style={{ color: "var(--red)" }}>PHP {Number(order.total_amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong></div>
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

        <div style={styles.stepper}>
          {steps.map((s, i) => (
            <div key={s} style={styles.stepItem}>
              <div style={{ ...styles.stepCircle, ...(step > i + 1 ? styles.stepDone : step === i + 1 ? styles.stepActive : {}) }}>
                {step > i + 1 ? <Icon name="check-circle" size={16} color="white" /> : i + 1}
              </div>
              <span style={{ fontSize: 13, fontWeight: step === i + 1 ? 700 : 400, color: step === i + 1 ? "var(--black)" : "var(--gray-400)" }}>{s}</span>
              {i < steps.length - 1 && <div style={styles.stepLine} />}
            </div>
          ))}
        </div>

        <div style={styles.layout}>
          <div>
            {step === 1 && (
              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ marginBottom: 20 }}>Delivery Address</h3>
                <div className="input-group" style={{ marginBottom: 16 }}>
                  <label>Full Name</label>
                  <input className="input-field" value={user?.name} readOnly />
                </div>
                <div className="input-group" style={{ marginBottom: 20 }}>
                  <label>Delivery Address *</label>
                  {addresses.length > 0 ? (
                    <>
                      <select
                        className="input-field"
                        value={selectedAddressId}
                        onChange={(e) => handleSelectAddress(e.target.value)}
                        style={{ marginBottom: 8 }}
                      >
                        <option value="">Select saved address</option>
                        {addresses.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label || "Address"}{item.is_default ? " (Default)" : ""} - {item.full_address}
                          </option>
                        ))}
                      </select>
                      <textarea className="input-field" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
                    </>
                  ) : (
                    <textarea
                      className="input-field"
                      rows={3}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="House #, Street, Barangay, City, Province"
                    />
                  )}
                </div>
                <button className="btn btn-outline" style={{ width: "100%", marginBottom: 10 }} onClick={openAddAddressModal}>
                  + Add New Address
                </button>
                <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={async () => { if (!address.trim()) return alertError("Address required", "Missing delivery address"); setStep(2); }}>
                  Continue to Payment
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ marginBottom: 20 }}>Payment Method</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                  {PAYMENT_METHODS.map((m) => (
                    <label key={m.id} style={{ ...styles.payOption, ...(payMethod === m.id ? styles.payOptionActive : {}) }}>
                      <input type="radio" value={m.id} checked={payMethod === m.id} onChange={() => setPayMethod(m.id)} style={{ display: "none" }} />
                      <span style={{ display: "inline-flex", alignItems: "center" }}><Icon name={m.icon} size={22} color="var(--gray-700)" /></span>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{m.label}</span>
                      {payMethod === m.id && <span style={{ color: "var(--red)", display: "inline-flex" }}><Icon name="check-circle" size={16} color="var(--red)" /></span>}
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
                  <button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
                  <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={() => setStep(3)}>Review Order</button>
                </div>

                <div style={{ marginTop: 18, borderTop: "1px solid var(--gray-200)", paddingTop: 14 }}>
                  <h4 style={{ marginBottom: 10 }}>Voucher</h4>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input className="input-field" placeholder="Enter voucher code" value={voucherCode} onChange={(e) => setVoucherCode(e.target.value.toUpperCase())} />
                    <button className="btn btn-outline" onClick={applyVoucher}>Apply</button>
                  </div>
                  {voucherData && <div style={{ color: "var(--green)", fontSize: 12, marginTop: 6 }}>Voucher applied: - PHP {voucherDiscount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</div>}
                  {voucherError && <div style={{ color: "var(--red)", fontSize: 12, marginTop: 6 }}>{voucherError}</div>}

                  <h4 style={{ margin: "14px 0 8px" }}>Loyalty Points</h4>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} />
                    Use my points (You have {loyaltyPoints} = PHP {loyaltyPoints} off)
                  </label>
                  {usePoints && (
                    <div style={{ marginTop: 8 }}>
                      <input
                        className="input-field"
                        type="number"
                        min="0"
                        max={Math.min(loyaltyPoints, maxPointsApplicable)}
                        value={pointsInput}
                        onChange={(e) => setPointsInput(e.target.value)}
                      />
                      <div style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 4 }}>
                        Max usable now: {Math.min(loyaltyPoints, maxPointsApplicable)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ marginBottom: 20 }}>Confirm Order</h3>
                <div style={styles.confirmRow}><span>Delivery to:</span><strong>{address}</strong></div>
                <div style={styles.confirmRow}><span>Payment:</span><strong>{PAYMENT_METHODS.find((m) => m.id === payMethod)?.label}</strong></div>
                <div style={styles.confirmRow}><span>Subtotal:</span><strong>PHP {subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong></div>
                <div style={styles.confirmRow}><span>Voucher Discount:</span><strong style={{ color: "var(--green)" }}>- PHP {voucherDiscount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong></div>
                <div style={styles.confirmRow}><span>Points Discount:</span><strong style={{ color: "var(--green)" }}>- PHP {pointsDiscount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong></div>
                <div style={styles.confirmRow}><span>Final Total:</span><strong style={{ color: "var(--red)" }}>PHP {finalTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong></div>
                {payMethod !== "cod" && (
                  <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: "var(--yellow)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="alert" size={14} color="var(--yellow)" /> This is a <strong>simulated payment</strong>. No real money will be charged.</span>
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button className="btn btn-ghost" onClick={() => setStep(2)}>Back</button>
                  <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={handlePlaceOrder} disabled={loading}>
                    {loading ? "Processing..." : "Place Order"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h4 style={{ fontSize: 16, marginBottom: 16 }}>Your Items</h4>
            {cart.map(({ product, quantity }) => {
              const price = product.negotiated_price || product.price;
              return (
                <div key={product.id} style={styles.summaryItem}>
                  <span style={{ flex: 1, fontSize: 13, color: "var(--gray-700)" }}>{product.title} x {quantity}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>PHP {(price * quantity).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                </div>
              );
            })}
            <div style={{ borderTop: "1px solid var(--gray-200)", paddingTop: 14, marginTop: 8, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700 }}>Final Total</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "var(--red)", fontFamily: "Syne" }}>PHP {finalTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {addressModalOpen && (
        <div className="modal-overlay" onClick={() => setAddressModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Add New Address</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setAddressModalOpen(false)}>Close</button>
            </div>
            <div className="modal-body">
              <div className="input-group" style={{ marginBottom: 10 }}>
                <label>Address Label</label>
                <input
                  className="input-field"
                  value={addressDraft.label}
                  onChange={(e) => setAddressDraft((p) => ({ ...p, label: e.target.value }))}
                  placeholder="Home / Work / Other"
                />
              </div>
              <PhilippineAddressField
                key={addressFormKey}
                label="Address Template (Philippines)"
                required
                initialData={addressDraft}
                onDataChange={(next) => setAddressDraft((p) => ({ ...p, ...next }))}
                onChange={(full) => setAddressDraft((p) => ({ ...p, full_address: full }))}
              />
              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button className="btn btn-ghost" onClick={() => setAddressModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveCheckoutAddress} disabled={savingAddress}>
                  {savingAddress ? "Saving..." : "Save Address"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
