const COUNTRY_OPTIONS = [
  { code: "+63", label: "🇵🇭 Philippines" },
  { code: "+1", label: "🇺🇸 United States" },
  { code: "+44", label: "🇬🇧 United Kingdom" },
  { code: "+61", label: "🇦🇺 Australia" },
  { code: "+81", label: "🇯🇵 Japan" },
];

export default function PhoneNumberInput({
  id = "mobile",
  label = "Mobile Number",
  value,
  onChange,
  required = true,
  hint,
  error,
}) {
  const code = value?.countryCode || "+63";
  const national = value?.nationalNumber || "";

  const setCode = (nextCode) => {
    onChange({
      countryCode: nextCode,
      nationalNumber: national,
      fullNumber: `${nextCode}${national}`.replace(/\s+/g, ""),
    });
  };

  const setNational = (nextNational) => {
    const cleaned = nextNational.replace(/[^\d]/g, "");
    onChange({
      countryCode: code,
      nationalNumber: cleaned,
      fullNumber: `${code}${cleaned}`.replace(/\s+/g, ""),
    });
  };

  return (
    <div className="input-group">
      <label htmlFor={id}>{label}{required ? " *" : ""}</label>
      <div style={styles.row}>
        <select
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="input-field"
          style={styles.codeSelect}
        >
          {COUNTRY_OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
        <input
          id={id}
          className="input-field"
          style={{ ...styles.nationalInput, ...(error ? styles.inputError : {}) }}
          placeholder="e.g. 9859991650"
          value={national}
          onChange={(e) => setNational(e.target.value)}
          required={required}
          inputMode="numeric"
        />
      </div>
      {hint ? <small style={styles.hint}>{hint}</small> : null}
      {error ? <small style={styles.error}>{error}</small> : null}
    </div>
  );
}

const styles = {
  row: { display: "grid", gridTemplateColumns: "160px 1fr", gap: 8 },
  codeSelect: { padding: "10px 10px" },
  nationalInput: { width: "100%" },
  hint: { color: "var(--gray-500)", fontSize: 11, marginTop: 4, display: "block" },
  error: { color: "var(--red)", fontSize: 11, marginTop: 4, display: "block" },
  inputError: { borderColor: "var(--red)" },
};

