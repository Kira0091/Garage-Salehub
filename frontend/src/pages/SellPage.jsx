// src/pages/SellPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { productsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

export default function SellPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [form, setForm] = useState({
    title: "", description: "", condition: "Good",
    price: "", quantity: "1", category_id: "",
  });
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (!user) navigate("/login");
    productsAPI.categories().then(setCategories);
  }, [user]);

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files).slice(0, 5);
    setFiles(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.price) return toast("Title and price are required", "error");
    if (files.length === 0) return toast("Please upload at least one photo", "error");
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      files.forEach((f) => fd.append("images", f));
      await productsAPI.create(fd);
      toast("Item submitted! Pending admin review.", "success");
      navigate("/my-products");
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 780 }}>
        <div className="page-header">
          <h1 className="page-title">📦 Submit an Item for Sale</h1>
          <p className="page-subtitle">Fill in the details and upload photos. Your item will be reviewed by an admin before listing.</p>
        </div>

        {/* Guidelines */}
        <div style={styles.guidelines}>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>📸 Photo Guidelines</h4>
          <div style={styles.guideGrid}>
            {["Multiple angles required", "Good lighting", "Clear background", "Include a handwritten timestamp/verification code next to the item"].map((g) => (
              <div key={g} style={styles.guideItem}>✅ {g}</div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Image upload */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Item Photos *</h3>
            <label style={styles.uploadZone}>
              <input type="file" multiple accept="image/*" onChange={handleFiles} style={{ display: "none" }} />
              {previews.length === 0 ? (
                <div style={styles.uploadPlaceholder}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Click to upload photos</div>
                  <div style={{ fontSize: 12, color: "var(--gray-400)" }}>Up to 5 photos • JPG, PNG, WebP</div>
                </div>
              ) : (
                <div style={styles.previewGrid}>
                  {previews.map((p, i) => (
                    <img key={i} src={p} alt="" style={styles.previewImg} />
                  ))}
                </div>
              )}
            </label>
          </div>

          {/* Details */}
          <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Item Details</h3>
            <div className="input-group">
              <label>Title *</label>
              <input className="input-field" placeholder="e.g. Samsung TV 40 inch" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="input-group">
              <label>Description</label>
              <textarea className="input-field" rows={4} placeholder="Describe the item — condition details, included accessories, reason for selling..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <div className="input-group">
                <label>Condition *</label>
                <select className="input-field" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                  <option>Like New</option>
                  <option>Good</option>
                  <option>Fair</option>
                </select>
              </div>
              <div className="input-group">
                <label>Asking Price (₱) *</label>
                <input className="input-field" type="number" min="1" placeholder="e.g. 1500" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              </div>
              <div className="input-group">
                <label>Quantity</label>
                <input className="input-field" type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
            </div>
            <div className="input-group">
              <label>Category</label>
              <select className="input-field" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Select a category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 10, padding: 16, fontSize: 13, color: "var(--red)" }}>
            ⚠️ By submitting this item, you agree to transfer ownership to GarageSaleHub upon admin approval. Our team may negotiate the final price.
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? "Submitting..." : "Submit for Review →"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  guidelines: { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 16, marginBottom: 24 },
  guideGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  guideItem: { fontSize: 13, color: "var(--green)" },
  uploadZone: { display: "block", border: "2px dashed var(--gray-300)", borderRadius: 12, cursor: "pointer", minHeight: 160, transition: "border-color 0.15s" },
  uploadPlaceholder: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, color: "var(--gray-400)" },
  previewGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, padding: 16 },
  previewImg: { width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8 },
};
