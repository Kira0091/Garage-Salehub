import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { chatAPI, productsAPI } from "../services/api";
import { alertError, alertSuccess, confirmAction } from "../utils/alerts";

export default function SellPage() {
  const navigate = useNavigate();

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
    location: "",
    latitude: "",
    longitude: "",
    address: "",
    city: "",
    country: "",
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
      await alertError("Please complete title, price, category, and at least one image.", "Missing required fields");
      return;
    }

    const confirmed = await confirmAction({
      title: "Submit this item to admin chat?",
      text: "Your item details will be sent to Messages so you can negotiate first.",
      confirmText: "Submit item",
      confirmButtonColor: "#e11d48",
    });
    if (!confirmed) {
      return;
    }

    setSending(true);
    try {
      const fd = new FormData();
      const itemData = {
        title: form.title.trim(),
        description: form.description.trim(),
        condition: form.condition,
        price: parseFloat(form.price || 0),
        quantity: parseInt(form.quantity || "1", 10),
        category_id: form.category_id || null,
        location: form.location || "",
        latitude: form.latitude || "",
        longitude: form.longitude || "",
        address: form.address || "",
        city: form.city || "",
        country: form.country || "",
      };
      fd.append("message_type", "item_submission");
      fd.append("item_data", JSON.stringify(itemData));
      fd.append("content", `New item submitted for negotiation: ${itemData.title} (asking PHP ${itemData.price.toLocaleString("en-PH")})`);
      files.forEach((f) => fd.append("files", f));
      await chatAPI.sendWithFiles(fd);

      localStorage.setItem("my_products_refresh", String(Date.now()));
      await alertSuccess("Item sent to Messages", "Your submission was sent to admin chat. Continue negotiation there.");
      navigate("/chat");
    } catch (err) {
      await alertError(err.message || "Submission failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 900 }}>
        <div className="page-header">
          <h1 className="page-title">Submit an Item</h1>
          <p className="page-subtitle">Submit here using the standard form. Details will be sent to Messages for admin negotiation.</p>
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

            <div className="input-group">
              <label>Location</label>
              <input className="input-field" placeholder="e.g. Makati City" value={form.location} onChange={(e) => setField("location", e.target.value)} />
            </div>

            <div className="input-group">
              <label>Latitude</label>
              <input className="input-field" type="number" step="any" placeholder="14.5995" value={form.latitude} onChange={(e) => setField("latitude", e.target.value)} />
            </div>

            <div className="input-group">
              <label>Longitude</label>
              <input className="input-field" type="number" step="any" placeholder="120.9842" value={form.longitude} onChange={(e) => setField("longitude", e.target.value)} />
            </div>

            <div className="input-group">
              <label>Address</label>
              <input className="input-field" value={form.address} onChange={(e) => setField("address", e.target.value)} />
            </div>

            <div className="input-group">
              <label>City</label>
              <input className="input-field" value={form.city} onChange={(e) => setField("city", e.target.value)} />
            </div>

            <div className="input-group">
              <label>Country</label>
              <input className="input-field" value={form.country} onChange={(e) => setField("country", e.target.value)} />
            </div>

            <div className="input-group" style={{ gridColumn: "1 / -1" }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  if (!navigator.geolocation) return;
                  navigator.geolocation.getCurrentPosition((pos) => {
                    setField("latitude", String(pos.coords.latitude));
                    setField("longitude", String(pos.coords.longitude));
                  });
                }}
              >
                Use my current location
              </button>
            </div>

            {form.latitude && form.longitude && (
              <div className="input-group" style={{ gridColumn: "1 / -1" }}>
                <label>Map Preview</label>
                <iframe
                  title="Location preview"
                  width="100%"
                  height="200"
                  style={{ border: "1px solid var(--gray-200)", borderRadius: 8 }}
                  src={`https://maps.google.com/maps?q=${form.latitude},${form.longitude}&z=14&output=embed`}
                />
              </div>
            )}

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
              <div style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 6 }}>
                These are your public listing photos shown to buyers in Shop and Product pages.
              </div>
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
              {sending ? "Submitting..." : "Submit to Messages"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
