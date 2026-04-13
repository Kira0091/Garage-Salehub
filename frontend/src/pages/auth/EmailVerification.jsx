import { useEffect, useState } from "react";
import { alertError, alertSuccess } from "../../utils/alerts";

export default function EmailVerification({
  email,
  verificationToken,
  onBack,
  onVerified,
}) {
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const verifyCode = async () => {
    setLoading(true);
    try {
      // TODO: Implement backend endpoint
      // POST /api/auth/verification/verify
      // body: { verification_token, code }
      // Note: token+code allows verification from any device.
      await new Promise((r) => setTimeout(r, 500));
      if (code.trim().length !== 6) throw new Error("Enter a valid 6-digit code.");
      await alertSuccess("Email verified", "Your account is now active.");
      onVerified();
    } catch (e) {
      await alertError(e.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    try {
      // TODO: Implement backend endpoint
      // POST /api/auth/verification/resend
      // body: { verification_token }
      await new Promise((r) => setTimeout(r, 500));
      setCountdown(60);
      await alertSuccess("Code resent", `A new verification code was sent to ${email}.`);
    } catch (e) {
      await alertError(e.message || "Failed to resend code");
    }
  };

  return (
    <div style={styles.wrap}>
      <h3 style={styles.title}>Verify your email</h3>
      <p style={styles.sub}>
        We sent a 6-digit verification code to <strong>{email}</strong>.
      </p>
      <div className="input-group" style={{ marginBottom: 10 }}>
        <label>Verification Code</label>
        <input
          className="input-field"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
          placeholder="Enter 6-digit code"
          inputMode="numeric"
        />
      </div>
      <div style={styles.row}>
        <button type="button" className="btn btn-primary" disabled={loading} onClick={verifyCode}>
          {loading ? "Verifying..." : "Verify Email"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onBack}>Edit Email</button>
      </div>
      <div style={{ marginTop: 10 }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={countdown > 0}
          onClick={resendCode}
        >
          {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
        </button>
      </div>
      <small style={styles.tokenHint}>Reference: {verificationToken || "pending-token"}</small>
    </div>
  );
}

const styles = {
  wrap: { border: "1px solid var(--gray-200)", borderRadius: 10, padding: 14, background: "var(--gray-50)" },
  title: { margin: 0, marginBottom: 4, fontSize: 20 },
  sub: { margin: 0, marginBottom: 10, color: "var(--gray-600)", fontSize: 13 },
  row: { display: "flex", gap: 8, flexWrap: "wrap" },
  tokenHint: { marginTop: 10, display: "block", color: "var(--gray-500)", fontSize: 11 },
};

