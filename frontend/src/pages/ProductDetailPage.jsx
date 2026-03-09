// src/pages/ProductDetailPage.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { productsAPI } from "../services/api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

export default function ProductDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    productsAPI.getOne(id)
      .then(setProduct)
      .catch(() => navigate("/shop"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = () => {
    addToCart(product, qty);
    toast("Added to cart!", "success");
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!product) return null;

  const price = product.negotiated_price || product.price;
  const hasDiscount = product.negotiated_price && product.negotiated_price < product.price;
  const imgs = product.images.length > 0
    ? product.images.map((img) => productsAPI.imageUrl(img))
    : ["https://placehold.co/500x400/f2f2f2/aaa?text=No+Image"];

  const conditionColors = { "Like New": "var(--green)", "Good": "var(--blue)", "Fair": "var(--yellow)" };

  return (
    <div className="page">
      <div className="container">
        <div style={styles.layout}>
          {/* Images */}
          <div style={styles.imgSection}>
            <div style={styles.mainImg}>
              <img src={imgs[activeImg]} alt={product.title} style={styles.mainImgEl} />
              {product.stock === 0 && <div style={styles.soldOverlay}>SOLD OUT</div>}
            </div>
            {imgs.length > 1 && (
              <div style={styles.thumbs}>
                {imgs.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt=""
                    style={{ ...styles.thumb, ...(i === activeImg ? styles.thumbActive : {}) }}
                    onClick={() => setActiveImg(i)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div style={styles.infoSection}>
            {product.category && (
              <div style={styles.breadcrumb}>{product.category.icon} {product.category.name}</div>
            )}
            <h1 style={styles.title}>{product.title}</h1>

            <div style={styles.metaRow}>
              <span style={{ ...styles.condition, color: conditionColors[product.condition] || "var(--gray-500)" }}>
                ● {product.condition}
              </span>
              <span style={styles.sellerInfo}>Sold by <strong>{product.seller.name}</strong></span>
            </div>

            <div style={styles.priceBlock}>
              <span style={styles.price}>₱{price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
              {hasDiscount && (
                <>
                  <span style={styles.origPrice}>₱{product.price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                  <span className="badge badge-red">
                    -{Math.round(((product.price - product.negotiated_price) / product.price) * 100)}% OFF
                  </span>
                </>
              )}
            </div>

            <div style={styles.stockInfo}>
              {product.stock > 0 ? (
                <span className="badge badge-green">✓ In Stock ({product.stock} available)</span>
              ) : (
                <span className="badge badge-red">✗ Out of Stock</span>
              )}
            </div>

            {product.description && (
              <div style={styles.desc}>
                <h4 style={styles.descTitle}>Description</h4>
                <p style={styles.descText}>{product.description}</p>
              </div>
            )}

            {product.stock > 0 && (
              <div style={styles.qtyRow}>
                <label style={{ fontSize: 14, fontWeight: 600 }}>Quantity:</label>
                <div style={styles.qtyControl}>
                  <button style={styles.qtyBtn} onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                  <span style={styles.qtyNum}>{qty}</span>
                  <button style={styles.qtyBtn} onClick={() => setQty(Math.min(product.stock, qty + 1))}>+</button>
                </div>
              </div>
            )}

            <div style={styles.actions}>
              <button
                className="btn btn-primary btn-lg"
                style={{ flex: 1 }}
                disabled={product.stock === 0}
                onClick={handleAddToCart}
              >
                🛒 Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  layout: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" },
  imgSection: {},
  mainImg: { position: "relative", borderRadius: "var(--radius-lg)", overflow: "hidden", aspectRatio: "4/3", marginBottom: 12, background: "var(--gray-100)" },
  mainImgEl: { width: "100%", height: "100%", objectFit: "cover" },
  soldOverlay: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800 },
  thumbs: { display: "flex", gap: 8, flexWrap: "wrap" },
  thumb: { width: 72, height: 72, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: "2px solid transparent", transition: "border-color 0.15s" },
  thumbActive: { border: "2px solid var(--red)" },
  infoSection: {},
  breadcrumb: { fontSize: 13, color: "var(--gray-400)", marginBottom: 8 },
  title: { fontSize: 28, marginBottom: 12 },
  metaRow: { display: "flex", alignItems: "center", gap: 16, marginBottom: 20 },
  condition: { fontSize: 14, fontWeight: 700 },
  sellerInfo: { fontSize: 13, color: "var(--gray-500)" },
  priceBlock: { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 },
  price: { fontSize: 36, fontWeight: 800, color: "var(--red)", fontFamily: "Syne, sans-serif" },
  origPrice: { fontSize: 18, color: "var(--gray-400)", textDecoration: "line-through" },
  stockInfo: { marginBottom: 20 },
  desc: { marginBottom: 24 },
  descTitle: { fontSize: 15, fontWeight: 700, marginBottom: 8 },
  descText: { fontSize: 14, color: "var(--gray-600)", lineHeight: 1.7 },
  qtyRow: { display: "flex", alignItems: "center", gap: 16, marginBottom: 20 },
  qtyControl: { display: "flex", alignItems: "center", gap: 0, border: "1.5px solid var(--gray-200)", borderRadius: 8, overflow: "hidden" },
  qtyBtn: { width: 36, height: 36, background: "var(--gray-50)", border: "none", cursor: "pointer", fontSize: 18, fontWeight: 600 },
  qtyNum: { width: 40, textAlign: "center", fontSize: 15, fontWeight: 600 },
  actions: { display: "flex", gap: 12, marginBottom: 20 },
  chatBox: { background: "var(--gray-50)", borderRadius: "var(--radius)", padding: 16, border: "1px solid var(--gray-200)" },
};
