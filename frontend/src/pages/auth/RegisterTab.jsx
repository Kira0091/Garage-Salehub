import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { alertError, alertSuccess } from "../../utils/alerts";
import ConfirmPassword from "./ConfirmPassword";
import PasswordInput from "./PasswordInput";
import PhoneNumberInput from "./PhoneNumberInput";
import TermsModal from "./TermsModal";
import PhilippineAddressField from "../../components/PhilippineAddressField";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emptyAvailability = { status: "idle", message: "" };

const getPasswordStrength = (value) => {
  let score = 0;
  if (!value) return { score: 0, label: "Very weak", color: "#ef4444" };
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[a-z]/.test(value) && /\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  if (score <= 1) return { score, label: "Weak", color: "#ef4444" };
  if (score === 2) return { score, label: "Medium", color: "#f59e0b" };
  if (score === 3) return { score, label: "Good", color: "#22c55e" };
  return { score, label: "Strong", color: "#16a34a" };
};

export default function RegisterTab({ onGoogleSignIn, googlePrefill }) {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [isNarrow, setIsNarrow] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 980 : false));
  const [loading, setLoading] = useState(false);
  const [openTerms, setOpenTerms] = useState(false);
  const [termsUnlocked, setTermsUnlocked] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: { countryCode: "+63", nationalNumber: "", fullNumber: "" },
    password: "",
    confirmPassword: "",
    address: "",
    acceptTerms: false,
  });

  const [emailAvailability, setEmailAvailability] = useState(emptyAvailability);
  const [mobileAvailability, setMobileAvailability] = useState(emptyAvailability);
  const [touched, setTouched] = useState({ email: false, mobile: false });

  const strength = useMemo(() => getPasswordStrength(form.password), [form.password]);
  const passwordsMismatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 980);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!googlePrefill) return;
    setForm((prev) => ({
      ...prev,
      name: googlePrefill.name || prev.name,
      email: googlePrefill.email || prev.email,
    }));
    setTouched((prev) => ({ ...prev, email: true }));
  }, [googlePrefill]);

  const checkEmailAvailability = useCallback(async (email) => {
    await new Promise((r) => setTimeout(r, 350));
    return { available: true };
  }, []);

  const checkMobileAvailability = useCallback(async (mobile) => {
    await new Promise((r) => setTimeout(r, 350));
    return { available: true };
  }, []);

  useEffect(() => {
    if (!form.email) {
      setEmailAvailability(emptyAvailability);
      return;
    }
    if (!EMAIL_RE.test(form.email)) {
      setEmailAvailability({ status: "invalid", message: "Use a valid email format." });
      return;
    }
    setEmailAvailability({ status: "checking", message: "Checking email..." });
    const t = setTimeout(async () => {
      try {
        const out = await checkEmailAvailability(form.email);
        setEmailAvailability(out.available
          ? { status: "available", message: "Email is available." }
          : { status: "taken", message: "Email is already registered." });
      } catch {
        setEmailAvailability({ status: "error", message: "Could not verify email." });
      }
    }, 450);
    return () => clearTimeout(t);
  }, [checkEmailAvailability, form.email]);

  useEffect(() => {
    if (!form.mobile.fullNumber) {
      setMobileAvailability(emptyAvailability);
      return;
    }
    if (form.mobile.nationalNumber.length < 8) {
      setMobileAvailability({ status: "invalid", message: "Enter a valid mobile number." });
      return;
    }
    setMobileAvailability({ status: "checking", message: "Checking mobile..." });
    const t = setTimeout(async () => {
      try {
        const out = await checkMobileAvailability(form.mobile.fullNumber);
        setMobileAvailability(out.available
          ? { status: "available", message: "Mobile is available." }
          : { status: "taken", message: "Mobile is already registered." });
      } catch {
        setMobileAvailability({ status: "error", message: "Could not verify mobile." });
      }
    }, 450);
    return () => clearTimeout(t);
  }, [checkMobileAvailability, form.mobile.fullNumber, form.mobile.nationalNumber.length]);

  const submitRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!termsUnlocked) throw new Error("Please read the Terms & Privacy Policy first.");
      if (!form.acceptTerms) throw new Error("Please check Terms & Privacy Policy agreement.");
      if (passwordsMismatch) throw new Error("Password and Confirm Password do not match.");
      if (emailAvailability.status === "taken") throw new Error("Email is already registered.");
      if (mobileAvailability.status === "taken") throw new Error("Mobile is already registered.");

      const user = await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.mobile.fullNumber,
        address: form.address.trim(),
      });

      await alertSuccess("Account created", `Welcome, ${user?.name || "User"}!`);
      navigate(String(user?.role || "").toLowerCase() === "admin" ? "/admin" : "/");
    } catch (err) {
      await alertError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={submitRegister} style={{ display: "grid", gap: 10 }}>
        <div style={{ ...styles.grid, gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr" }}>
          <div className="input-group">
            <label>Full Name *</label>
            <input
              className="input-field"
              placeholder="Juan Dela Cruz"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>

          <div className="input-group">
            <label>Email *</label>
            <input
              className="input-field"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              onBlur={() => setTouched((p) => ({ ...p, email: true }))}
              required
            />
            {(touched.email || form.email) && <Availability {...emailAvailability} />}
          </div>

          <PhoneNumberInput
            value={form.mobile}
            onChange={(next) => setForm((p) => ({ ...p, mobile: next }))}
            hint="Country code + mobile number will be saved together."
          />

          <PasswordInput
            id="register-password"
            label="Password"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            placeholder="At least 8 chars, mixed types"
            required
          />

          <div style={{ gridColumn: isNarrow ? "auto" : "1 / -1" }}>
            <ConfirmPassword
              value={form.confirmPassword}
              password={form.password}
              onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
            />
          </div>

          <div style={{ gridColumn: isNarrow ? "auto" : "1 / -1" }}>
            <PhilippineAddressField
              label="Address (Philippines)"
              value={form.address}
              onChange={(nextAddress) => setForm((p) => ({ ...p, address: nextAddress }))}
              hint="Select Region, Municipality/City, Barangay, then enter house/building and street."
            />
          </div>
        </div>

        <div style={styles.strengthWrap}>
          <div style={styles.strengthTrack}>
            <div
              style={{
                ...styles.strengthBar,
                width: `${Math.max(8, (strength.score / 4) * 100)}%`,
                background: strength.color,
              }}
            />
          </div>
          <span style={{ ...styles.strengthText, color: strength.color }}>{strength.label}</span>
        </div>

        <div style={styles.termsRow}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpenTerms(true)}>
            Read Terms & Privacy
          </button>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              disabled={!termsUnlocked}
              checked={form.acceptTerms}
              onChange={(e) => setForm((p) => ({ ...p, acceptTerms: e.target.checked }))}
            />
            <span>I agree to Terms & Privacy Policy.</span>
          </label>
        </div>

        <div style={styles.trustNearSubmit}>
          <span style={{ fontSize: 14 }}>🔒</span>
          <span>Secure connection. Registration data is encrypted.</span>
        </div>

        <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <div style={styles.divider}>or</div>
      <button type="button" className="btn btn-ghost btn-lg" style={{ width: "100%" }} onClick={onGoogleSignIn}>
        <span style={styles.googleMark}>G</span>
        Sign up with Google
      </button>

      <TermsModal
        open={openTerms}
        onClose={() => setOpenTerms(false)}
        onUnlocked={() => setTermsUnlocked(true)}
      />
    </>
  );
}

function Availability({ status, message }) {
  if (!message) return null;
  const colorMap = {
    checking: "var(--gray-500)",
    available: "var(--green)",
    taken: "var(--red)",
    invalid: "var(--yellow)",
    error: "var(--red)",
  };
  return <small style={{ marginTop: 4, display: "block", color: colorMap[status] || "var(--gray-500)" }}>{message}</small>;
}

const styles = {
  grid: { display: "grid", gap: 10 },
  strengthWrap: { display: "flex", alignItems: "center", gap: 8 },
  strengthTrack: { flex: 1, height: 6, borderRadius: 999, background: "var(--gray-200)", overflow: "hidden" },
  strengthBar: { height: "100%", borderRadius: 999, transition: "width 0.2s ease" },
  strengthText: { fontSize: 12, fontWeight: 700, minWidth: 56, textAlign: "right" },
  termsRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  checkboxLabel: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--gray-700)" },
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
  divider: { textAlign: "center", margin: "10px 0", color: "var(--gray-400)", fontSize: 12 },
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
