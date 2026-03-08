import { useAuth } from "../context/AuthContext";

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="container" style={{ padding: "32px 16px" }}>
        <h1 style={{ marginBottom: 8 }}>Profile</h1>
        <p style={{ color: "var(--gray-500)" }}>No user session found.</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: "32px 16px" }}>
      <h1 style={{ marginBottom: 16 }}>My Profile</h1>
      <div style={{ background: "white", border: "1px solid var(--gray-200)", borderRadius: 12, padding: 20, maxWidth: 560 }}>
        <div style={{ marginBottom: 10 }}><strong>Name:</strong> {user.name}</div>
        <div style={{ marginBottom: 10 }}><strong>Email:</strong> {user.email}</div>
        <div style={{ marginBottom: 10 }}><strong>Role:</strong> {user.role}</div>
        <div style={{ color: "var(--gray-500)", fontSize: 14 }}>Profile editing is not implemented yet.</div>
      </div>
    </div>
  );
}