import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { alertError, alertSuccess } from "../../utils/alerts";
import PasswordInput from "./PasswordInput";
import RegisterTab from "./RegisterTab";

export default function AuthPage({ initialTab = "login" }) {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const [tab, setTab] = useState(initialTab === "register" ? "register" : "login");
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });
  const [otpMode, setOtpMode] = useState(false);
  const [otp, setOtp] = useState({ identifier: "", code: "" });
  const [registerGooglePrefill, setRegisterGooglePrefill] = useState(null);

  useEffect(() => {
    setTab(initialTab === "register" ? "register" : "login");
  }, [initialTab]);

  useEffect(() => {
    if (tab !== "login") {
      setOtpMode(false);
      setOtp({ identifier: "", code: "" });
      setOtpCountdown(0);
    }
  }, [tab]);

  useEffect(() => {
    if (otpCountdown <= 0) return;
    const t = setTimeout(() => setOtpCountdown((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [otpCountdown]);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    if (!googleClientId) return;
    if (window.google?.accounts?.id) {
      setGoogleReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleReady(true);
    document.body.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [googleClientId]);

  const decodeGoogleCredential = (credential) => {
    try {
      const parts = String(credential || "").split(".");
      if (parts.length < 2) return null;
      const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const pad = payload.length % 4 ? "=".repeat(4 - (payload.length % 4)) : "";
      const json = atob(payload + pad);
      return JSON.parse(json);
    } catch {
      return null;
    }
  };

  const handleGoogleSignIn = (mode = "login") => {
    if (!googleClientId) {
      alertError("Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID in frontend env.");
      return;
    }
    if (!googleReady || !window.google?.accounts?.id) {
      alertError("Google sign-in is still loading. Please try again.");
      return;
    }
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async (response) => {
        try {
          if (mode === "register") {
            const payload = decodeGoogleCredential(response.credential);
            const prefill = {
              name: String(payload?.name || "").trim(),
              email: String(payload?.email || "").trim().toLowerCase(),
            };
            if (!prefill.email) throw new Error("Google did not return an email.");
            setRegisterGooglePrefill(prefill);
            setTab("register");
            await alertSuccess("Google details loaded", "Please complete the remaining fields, then click Create Account.");
            return;
          }

          const user = await loginWithGoogle(response.credential);
          await alertSuccess("Login successful", `Welcome, ${user?.name || "User"}!`);
          navigate(String(user?.role || "").toLowerCase() === "admin" ? "/admin" : "/");
        } catch (error) {
          await alertError(error.message || "Google sign-in failed");
        }
      },
    });
    window.google.accounts.id.prompt();
  };

  const requestOtp = async (identifier) => {
    await new Promise((r) => setTimeout(r, 500));
    return { ok: true };
  };

  const verifyOtp = async (identifier, code) => {
    await new Promise((r) => setTimeout(r, 500));
    if (String(code).trim().length < 4) throw new Error("Invalid OTP code");
    return { user: { role: "user", name: "User" } };
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const identifier = loginForm.identifier.trim();
      if (!identifier || !loginForm.password) throw new Error("Enter email/mobile and password.");
      const user = await login(identifier, loginForm.password);
      const first = String(user?.name || "User").trim().split(" ")[0] || "User";
      await alertSuccess("Login successful", `Welcome back, ${first}!`);
      navigate(String(user?.role || "").toLowerCase() === "admin" ? "/admin" : "/");
    } catch (e2) {
      await alertError(e2.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    const identifier = otp.identifier.trim();
    if (!identifier) {
      await alertError("Enter your email/mobile first.");
      return;
    }
    setOtpLoading(true);
    try {
      await requestOtp(identifier);
      setOtpCountdown(60);
      await alertSuccess("OTP sent", "Please check your email/SMS for your code.");
    } catch (e) {
      await alertError(e.message || "Could not send OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpLogin = async () => {
    setOtpLoading(true);
    try {
      const out = await verifyOtp(otp.identifier.trim(), otp.code.trim());
      await alertSuccess("Login successful", `Welcome back, ${out?.user?.name || "User"}!`);
      navigate(String(out?.user?.role || "").toLowerCase() === "admin" ? "/admin" : "/");
    } catch (e) {
      await alertError(e.message || "OTP verification failed");
    } finally {
      setOtpLoading(false);
    }
  };

  const heading = tab === "login" ? "Welcome back" : "Create your account";
  const sub = tab === "login"
    ? (otpMode ? "Enter OTP to continue" : "Sign in with password")
    : "Start buying and selling in minutes";

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* ── Fixed header: tabs + title ── */}
        <div style={styles.cardHeader}>
          <div style={styles.tabRow}>
            <button
              type="button"
              style={{ ...styles.tabBtn, ...(tab === "login" ? styles.tabBtnActive : {}) }}
              onClick={() => setTab("login")}
            >
              Login
            </button>
            <button
              type="button"
              style={{ ...styles.tabBtn, ...(tab === "register" ? styles.tabBtnActive : {}) }}
              onClick={() => setTab("register")}
            >
              Register
            </button>
          </div>

          <h2 style={styles.title}>{heading}</h2>
          <p style={styles.sub}>{sub}</p>
        </div>

        {/* ── Scrollable body ── */}
        <div style={styles.scrollBody}>
          {tab === "login" ? (
            <>
              {!otpMode ? (
                <form onSubmit={handlePasswordLogin} style={styles.form}>
                  <div className="input-group">
                    <label>Email or Mobile</label>
                    <input
                      className="input-field"
                      placeholder="you@example.com or +639XXXXXXXXX"
                      value={loginForm.identifier}
                      onChange={(e) => setLoginForm((p) => ({ ...p, identifier: e.target.value }))}
                      required
                    />
                    <small style={styles.hintText}>Use your registered email or full mobile number.</small>
                  </div>

                  <PasswordInput
                    id="login-password"
                    label="Password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                    required
                  />

                  <div style={styles.linkRow}>
                    <button type="button" style={styles.linkBtn} onClick={() => alertError("TODO: POST /api/password/forgot")}>
                      Forgot password?
                    </button>
                    <button
                      type="button"
                      style={styles.linkBtn}
                      onClick={() => {
                        setOtpMode(true);
                        setOtp((p) => ({ ...p, identifier: loginForm.identifier }));
                      }}
                    >
                      Use OTP login
                    </button>
                  </div>

                  <TrustLine />
                  <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </button>
                </form>
              ) : (
                <div style={styles.form}>
                  <div className="input-group">
                    <label>Email or Mobile</label>
                    <input
                      className="input-field"
                      placeholder="you@example.com or +639XXXXXXXXX"
                      value={otp.identifier}
                      onChange={(e) => setOtp((p) => ({ ...p, identifier: e.target.value }))}
                    />
                  </div>

                  <div className="input-group">
                    <label>OTP Code</label>
                    <input
                      className="input-field"
                      placeholder="6-digit code"
                      value={otp.code}
                      onChange={(e) => setOtp((p) => ({ ...p, code: e.target.value.replace(/[^\d]/g, "").slice(0, 6) }))}
                      inputMode="numeric"
                    />
                  </div>

                  <div style={styles.otpRow}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ flex: 1 }}
                      disabled={otpLoading || otpCountdown > 0}
                      onClick={handleSendOtp}
                    >
                      {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : "Send OTP"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      disabled={otpLoading}
                      onClick={handleOtpLogin}
                    >
                      {otpLoading ? "Verifying..." : "Login with OTP"}
                    </button>
                  </div>

                  <div style={styles.linkRow}>
                    <button type="button" style={styles.linkBtn} onClick={() => setOtpMode(false)}>
                      Back to password login
                    </button>
                    <button type="button" style={styles.linkBtn} onClick={() => alertError("TODO: POST /api/password/forgot")}>
                      Forgot password?
                    </button>
                  </div>

                  <TrustLine />
                </div>
              )}

              <div style={styles.divider}>or</div>
              <button className="btn btn-ghost btn-lg" type="button" style={{ width: "100%" }} onClick={() => handleGoogleSignIn("login")}>
                <span style={styles.googleMark}>G</span>
                Continue with Google
              </button>
            </>
          ) : (
            <RegisterTab
              onGoogleSignIn={() => handleGoogleSignIn("register")}
              googlePrefill={registerGooglePrefill}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TrustLine() {
  return (
    <div style={styles.trustNearSubmit}>
      <span style={{ fontSize: 14 }}>🔒</span>
      <span>Secure connection. Credentials are encrypted.</span>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "calc(100vh - 140px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 14px",           // ← slightly more vertical breathing room
  },
  card: {
    width: "100%",
    maxWidth: 980,
    margin: "0 auto",
    background: "white",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-lg)",
    border: "1px solid var(--gray-200)",
    padding: 0,                      // ← padding moved inside cardHeader / scrollBody
    maxHeight: "calc(100vh - 100px)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  // Sticky header inside card (tabs + title)
  cardHeader: {
    padding: "16px 16px 0",
    flexShrink: 0,
  },
  // Everything below the title scrolls
  scrollBody: {
    flex: 1,
    overflowY: "auto",
    padding: "10px 16px 16px",
  },
  tabRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 },
  tabBtn: {
    border: "1.5px solid var(--gray-200)",
    background: "white",
    color: "var(--gray-600)",
    borderRadius: 10,
    padding: "8px 10px",
    fontWeight: 700,
    cursor: "pointer",
  },
  tabBtnActive: { borderColor: "var(--red)", color: "var(--red)", background: "#fff1f2" },
  title: { margin: 0, textAlign: "center", fontSize: 24 },
  sub: { margin: "2px 0 8px", textAlign: "center", color: "var(--gray-500)", fontSize: 14 },
  form: { display: "grid", gap: 10 },
  hintText: { fontSize: 11, color: "var(--gray-500)", marginTop: 4, display: "block" },
  linkRow: { display: "flex", justifyContent: "space-between", gap: 8 },
  linkBtn: {
    background: "none",
    border: "none",
    color: "var(--red)",
    fontWeight: 600,
    fontSize: 12,
    cursor: "pointer",
    padding: 0,
  },
  otpRow: { display: "flex", gap: 8 },
  trustNearSubmit: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    fontSize: 12,
    color: "var(--green)",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 8,
    padding: "7px 10px",
  },
  divider: { textAlign: "center", margin: "8px 0", color: "var(--gray-400)", fontSize: 12 },
  googleMark: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    border: "1px solid var(--gray-300)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 800,
    marginRight: 6,
  },
};
