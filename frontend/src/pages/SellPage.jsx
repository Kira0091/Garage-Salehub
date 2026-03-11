import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { productsAPI } from "../services/api";
import { useToast } from "../components/Toast";

export default function SellPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [categories, setCategories] = useState([]);
  const [sending, setSending] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    condition: "Good",
    price: "",
    quantity: "1",
    category_id: "",
  });
  const [files, setFiles] = useState([]);

  useEffect(() => {
    productsAPI.categories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const onFiles = (e) => {
    const selected = Array.from(e.target.files || []).slice(0, 8);
    setFiles(selected);
    setPreviews(
      selected.map((f) => ({
        name: f.name,
        url: URL.createObjectURL(f),
      }))
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.price || !form.category_id || files.length === 0) {
      toast("Please complete title, price, category, and at least one image.", "error");
      return;
    }

    setSending(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      fd.append("description", form.description.trim());
      fd.append("condition", form.condition);
      fd.append("price", form.price);
      fd.append("quantity", form.quantity || "1");
      fd.append("category_id", form.category_id);
      files.forEach((f) => fd.append("images", f));

      await productsAPI.create(fd);
      localStorage.setItem("my_products_refresh", String(Date.now()));
      toast("Item submitted for review.", "success");
      navigate("/my-products");
    } catch (err) {
      toast(err.message || "Submission failed", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 900 }}>
        <div className="page-header">
          <h1 className="page-title">Submit an Item</h1>
          <p className="page-subtitle">This is separate from Messages. Submit here, then track status in My Submissions.</p>
        </div>

        <form className="card" style={{ padding: 20 }} onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="input-group" style={{ gridColumn: "1 / -1" }}>
              <label>Item Name *</label>
              <input className="input-field" value={form.title} onChange={(e) => setField("title", e.target.value)} />
            </div>

            <div className="input-group">
              <label>Condition *</label>
              <select className="input-field" value={form.condition} onChange={(e) => setField("condition", e.target.value)}>
                <option>Like New</option>
                <option>Good</option>
                <option>Fair</option>
              </select>
            </div>

            <div className="input-group">
              <label>Asking Price (PHP) *</label>
              <input className="input-field" type="number" min="1" value={form.price} onChange={(e) => setField("price", e.target.value)} />
            </div>

            <div className="input-group">
              <label>Quantity *</label>
              <input className="input-field" type="number" min="1" value={form.quantity} onChange={(e) => setField("quantity", e.target.value)} />
            </div>

            <div className="input-group">
              <label>Category *</label>
              <select className="input-field" value={form.category_id} onChange={(e) => setField("category_id", e.target.value)}>
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group" style={{ gridColumn: "1 / -1" }}>
              <label>Description</label>
              <textarea
                className="input-field"
                rows={4}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Describe brand, model, condition details, and inclusions"
              />
            </div>

            <div className="input-group" style={{ gridColumn: "1 / -1" }}>
              <label>Images * (up to 8)</label>
              <input className="input-field" type="file" accept="image/*" multiple onChange={onFiles} />
            </div>
          </div>

          {previews.length > 0 && (
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {previews.map((p) => (
                <img key={p.url} src={p.url} alt={p.name} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8 }} />
              ))}
            </div>
          )}

          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate("/chat")}>
              Open Messages
            </button>
            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending ? "Submitting..." : "Submit Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

