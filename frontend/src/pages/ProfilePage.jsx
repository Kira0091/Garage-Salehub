import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authAPI, ordersAPI } from "../services/api";
import { alertError, alertSuccess } from "../utils/alerts";
import Icon from "../components/Icon";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (!user) return;
    setName(String(user.name || ""));
    setPhone(String(user.phone || ""));
    setAddress(String(user.address || ""));
    setEmail(String(user.email || ""));
  }, [user]);

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

  const displayName = String(user?.name || user?.full_name || user?.username || "User").trim() || "User";
  const avatarUrl = user?.avatar ? authAPI.avatarUrl(user.avatar) : "";

  if (!user) {
    return (
      <div className="container" style={{ padding: "32px 16px" }}>
        <h1 style={{ marginBottom: 8 }}>Profile</h1>
        <p style={{ color: "var(--gray-500)" }}>No user session found.</p>
      </div>
    );
  }

  const saveAccountInfo = async () => {
    try {
      setSaving(true);
      await authAPI.updateMe({ name, phone });
      await refreshUser();
      await alertSuccess("Profile updated", "Username and phone number updated.");
    } catch (err) {
      await alertError(err.message || "Unable to update profile");
    } finally {
      setSaving(false);
    }
  };

  const useAddress = async () => {
    if (!address.trim()) {
      await alertError("Address required", "Please enter your address first.");
      return;
    }
    try {
      setSaving(true);
      await authAPI.updateMe({ address });
      await refreshUser();
      await alertSuccess("Address set", "This address will be used for checkout.");
    } catch (err) {
      await alertError(err.message || "Unable to update address");
    } finally {
      setSaving(false);
    }
  };

  const changeEmail = async () => {
    if (!email.trim()) {
      await alertError("Email required", "Please enter your email.");
      return;
    }
    try {
      setSaving(true);
      await authAPI.updateMe({ email });
      await refreshUser();
      await alertSuccess("Email updated", "Your Gmail/email was changed.");
    } catch (err) {
      await alertError(err.message || "Unable to update email");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword) {
      await alertError("Missing fields", "Enter current and new password.");
      return;
    }
    try {
      setSaving(true);
      await authAPI.updateMe({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      await alertSuccess("Password updated", "Your password was changed successfully.");
    } catch (err) {
      await alertError(err.message || "Unable to change password");
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile) {
      await alertError("No image selected", "Choose a profile picture first.");
      return;
    }
    try {
      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append("avatar", avatarFile);
      await authAPI.updateMe(formData);
      setAvatarFile(null);
      await refreshUser();
      await alertSuccess("Profile picture updated", "Your new profile picture is now active.");
    } catch (err) {
      await alertError(err.message || "Unable to upload profile picture");
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 980 }}>
        <div className="page-header">
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">{displayName}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, marginBottom: 16 }}>
          <div className="card" style={{ padding: 18 }}>
            <h3 style={{ marginTop: 0, marginBottom: 14 }}>Customer Configuration</h3>
            <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 14, alignItems: "start", marginBottom: 16 }}>
              <div style={{ width: 88, height: 88, borderRadius: "50%", overflow: "hidden", background: "var(--gray-200)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "var(--gray-700)" }}>
                {avatarUrl ? <img src={avatarUrl} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  style={{ marginBottom: 8 }}
                />
                <div>
                  <button className="btn btn-outline" onClick={uploadAvatar} disabled={uploadingAvatar}>
                    {uploadingAvatar ? "Uploading..." : "Change Profile Picture"}
                  </button>
                </div>
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: 10 }}>
              <label>Username</label>
              <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="input-group" style={{ marginBottom: 12 }}>
              <label>Phone Number</label>
              <input className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+63..." />
            </div>
            <button className="btn btn-primary" onClick={saveAccountInfo} disabled={saving}>
              {saving ? "Saving..." : "Save Username & Phone"}
            </button>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <h3 style={{ marginTop: 0, marginBottom: 14 }}>Security</h3>
            <div className="input-group" style={{ marginBottom: 10 }}>
              <label>Change Gmail / Email</label>
              <input className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button className="btn btn-outline" onClick={changeEmail} disabled={saving} style={{ marginBottom: 16 }}>
              Update Email
            </button>

            <div className="input-group" style={{ marginBottom: 10 }}>
              <label>Current Password</label>
              <input className="input-field" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="input-group" style={{ marginBottom: 12 }}>
              <label>New Password</label>
              <input className="input-field" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={changePassword} disabled={saving}>
              Change Password
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <h3 style={{ marginTop: 0, marginBottom: 14 }}>Address</h3>
          <div className="input-group" style={{ marginBottom: 12 }}>
            <label>Add or Edit Address</label>
            <textarea
              className="input-field"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House #, Street, Barangay, City, Province"
            />
          </div>
          <button className="btn btn-primary" onClick={useAddress} disabled={saving}>
            Use This Address
          </button>
          <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12, color: "var(--gray-500)" }}>
            This will automatically reflect in checkout delivery address.
          </p>
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
              <PurchaseShortcut to="/orders?tab=to_received" icon="truck" label="To Receive" count={counts.toReceived} />
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
