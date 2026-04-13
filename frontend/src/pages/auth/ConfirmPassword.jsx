import PasswordInput from "./PasswordInput";

export default function ConfirmPassword({ value, onChange, password, required = true }) {
  const mismatch = value.length > 0 && value !== password;
  return (
    <PasswordInput
      id="confirm-password"
      label="Confirm Password"
      value={value}
      onChange={onChange}
      placeholder="Re-enter password"
      required={required}
      error={mismatch ? "Passwords do not match." : ""}
    />
  );
}

