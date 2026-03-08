// src/pages/AuthPages.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

export function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast(`Welcome back, ${user.name.split(" ")[0]}!`, "success");
      navigate(user.role === "admin" ? "/admin" : "/");
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.authPage}>
      <div style={styles.authCard}>
        <div style={styles.authLogo}>
          <div style={styles.logoIcon}>G</div>
          <span style={styles.logoText}>GarageSale<strong>Hub</strong></span>
        </div>
        <h2 style={styles.authTitle}>Welcome back</h2>
        <p style={styles.authSub}>Sign in to your account</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="input-group">
            <label>Email</label>
            <input className="input-field" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input className="input-field" type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p style={styles.authSwitch}>
          Don't have an account? <Link to="/register" style={{ color: "var(--red)", fontWeight: 600 }}>Register</Link>
        </p>
        <div style={styles.demoHint}>
          <strong>Demo:</strong> admin@garagesalehub.com / admin123<br />
          user@garagesalehub.com / user123
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", address: "" });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast("Account created! Welcome to GarageSaleHub!", "success");
      navigate("/");
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.authPage}>
      <div style={{ ...styles.authCard, maxWidth: 520 }}>
        <div style={styles.authLogo}>
          <div style={styles.logoIcon}>G</div>
          <span style={styles.logoText}>GarageSale<strong>Hub</strong></span>
        </div>
        <h2 style={styles.authTitle}>Create Account</h2>
        <p style={styles.authSub}>Join the digital marketplace revolution</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="input-group">
            <label>Full Name *</label>
            <input className="input-field" placeholder="Juan Dela Cruz" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="input-group">
            <label>Email *</label>
            <input className="input-field" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="input-group">
            <label>Password *</label>
            <input className="input-field" type="password" placeholder="Min. 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          <div className="input-group">
            <label>Phone Number</label>
            <input className="input-field" placeholder="09XXXXXXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="input-group">
            <label>Address</label>
            <input className="input-field" placeholder="Street, Barangay, City" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>
        <p style={styles.authSwitch}>
          Already have an account? <Link to="/login" style={{ color: "var(--red)", fontWeight: 600 }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  authPage: { minHeight: "calc(100vh - 140px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" },
  authCard: { background: "white", borderRadius: "var(--radius-lg)", padding: 40, width: "100%", maxWidth: 440, boxShadow: "var(--shadow-lg)", border: "1px solid var(--gray-200)" },
  authLogo: { display: "flex", alignItems: "center", gap: 10, marginBottom: 24, justifyContent: "center" },
  logoIcon: { width: 40, height: 40, background: "var(--red)", color: "white", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontFamily: "Syne, sans-serif", fontWeight: 800 },
  logoText: { fontSize: 20, fontFamily: "Syne, sans-serif", color: "var(--black)" },
  authTitle: { fontSize: 24, fontWeight: 800, textAlign: "center", marginBottom: 4 },
  authSub: { fontSize: 14, color: "var(--gray-500)", textAlign: "center", marginBottom: 28 },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  authSwitch: { textAlign: "center", fontSize: 14, color: "var(--gray-500)", marginTop: 20 },
  demoHint: { background: "var(--gray-50)", borderRadius: 8, padding: 12, fontSize: 12, color: "var(--gray-500)", marginTop: 16, textAlign: "center" },
};
