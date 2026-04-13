import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { productsAPI } from "../services/api";
import { alertError, alertSuccess, confirmAction } from "../utils/alerts";
import VerificationMediaUploader from "../components/VerificationMediaUploader";

export default function ProductEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [verificationProgress, setVerificationProgress] = useState(null);
  const [verificationPhotos, setVerificationPhotos] = useState([]);
  const [verificationVideo, setVerificationVideo] = useState(null);
  const [existingVerificationMedia, setExistingVerificationMedia] = useState(null);
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

  useEffect(() => {
    let mounted = true;
    Promise.all([productsAPI.getOne(id), productsAPI.categories(), productsAPI.getVerificationStatus(id)])
      .then(([product, cats, verification]) => {
        if (!mounted) return;
        setCategories(cats);
        setExistingVerificationMedia(verification.media || null);
        setForm({
          title: product.title || "",
          description: product.description || "",
          condition: product.condition || "Good",
          price: String(product.price || ""),
          quantity: String(product.quantity || 1),
          category_id: String(product.category?.id || ""),
          location: product.location || "",
          latitude: product.location_meta?.latitude != null ? String(product.location_meta.latitude) : "",
          longitude: product.location_meta?.longitude != null ? String(product.location_meta.longitude) : "",
          address: product.location_meta?.address || "",
          city: product.location_meta?.city || "",
          country: product.location_meta?.country || "",
        });
      })
      .catch(async (err) => {
        await alertError(err.message || "Unable to load product details.");
        navigate("/my-products");
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id, navigate]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.price || !form.category_id) {
      await alertError("Please complete title, price, and category.", "Missing required fields");
      return;
    }
    if (verificationPhotos.length < 3 || !verificationVideo) {
      await alertError("Please upload at least 3 verification photos and 1 verification video.", "Verification media required");
      return;
    }

    const confirmed = await confirmAction({
      title: "Save and re-submit for verification?",
      text: "This item will go back under review until admin approves it again.",
      confirmText: "Save Changes",
      confirmButtonColor: "#2563eb",
    });
    if (!confirmed) return;

    setSaving(true);
    setVerificationProgress(null);
    try {
      await productsAPI.update(id, {
        title: form.title.trim(),
        description: form.description.trim(),
        condition: form.condition,
        price: Number(form.price),
        quantity: Number(form.quantity || 1),
        category_id: Number(form.category_id),
        location: form.location.trim(),
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        address: form.address.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
      });

      const verificationFd = new FormData();
      verificationPhotos.forEach((file) => verificationFd.append("verification_photos", file));
      verificationFd.append("verification_video", verificationVideo);
      await productsAPI.uploadVerificationMedia(id, verificationFd, setVerificationProgress);

      localStorage.setItem("my_products_refresh", String(Date.now()));
      await alertSuccess("Updated", "Product details were updated and re-submitted for verification.");
      navigate("/my-products");
    } catch (err) {
      await alertError(err.message || "Update failed");
    } finally {
      setSaving(false);
      setVerificationProgress(null);
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 900 }}>
        <div className="page-header">
          <h1 className="page-title">Edit Product</h1>
          <p className="page-subtitle">Update details and upload fresh verification media.</p>
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
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Location</label>
              <input className="input-field" value={form.location} onChange={(e) => setField("location", e.target.value)} />
            </div>

            <div className="input-group">
              <label>Latitude</label>
              <input className="input-field" type="number" step="any" value={form.latitude} onChange={(e) => setField("latitude", e.target.value)} />
            </div>

            <div className="input-group">
              <label>Longitude</label>
              <input className="input-field" type="number" step="any" value={form.longitude} onChange={(e) => setField("longitude", e.target.value)} />
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
              />
            </div>

            <VerificationMediaUploader
              photos={verificationPhotos}
              setPhotos={setVerificationPhotos}
              videoFile={verificationVideo}
              setVideoFile={setVerificationVideo}
              uploadProgress={verificationProgress}
              existingMedia={existingVerificationMedia}
            />
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <Link to="/my-products" className="btn btn-ghost">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save & Re-submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
