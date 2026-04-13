import { useMemo, useState } from "react";

export default function PasswordInput({
  label = "Password",
  value,
  onChange,
  placeholder = "Enter password",
  required = false,
  hint,
  error,
  id,
}) {
  const [show, setShow] = useState(false);
  const inputType = useMemo(() => (show ? "text" : "password"), [show]);

  return (
    <div className="input-group">
      <label htmlFor={id}>{label}{required ? " *" : ""}</label>
      <div style={styles.wrap}>
        <input
          id={id}
          className="input-field"
          style={{ ...styles.input, ...(error ? styles.inputError : {}) }}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
        />
        <button
          type="button"
          aria-label={show ? "Hide password" : "Show password"}
          onClick={() => setShow((s) => !s)}
          style={styles.eyeBtn}
        >
          {show ? "🙈" : "👁"}
        </button>
      </div>
      {hint ? <small style={styles.hint}>{hint}</small> : null}
      {error ? <small style={styles.error}>{error}</small> : null}
    </div>
  );
}

const styles = {
  wrap: { position: "relative" },
  input: { paddingRight: 42 },
  eyeBtn: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: "translateY(-50%)",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 16,
    lineHeight: 1,
  },
  hint: { color: "var(--gray-500)", fontSize: 11, marginTop: 4, display: "block" },
  error: { color: "var(--red)", fontSize: 11, marginTop: 4, display: "block" },
  inputError: { borderColor: "var(--red)" },
};

