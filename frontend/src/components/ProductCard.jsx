// src/components/ProductCard.jsx
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { productsAPI } from "../services/api";

const conditionColor = { "Like New": "var(--green)", "Good": "var(--blue)", "Fair": "var(--yellow)" };

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const price = product.negotiated_price || product.price;
  const hasDiscount = product.negotiated_price && product.negotiated_price < product.price;
  const imgSrc = product.images?.[0]
    ? productsAPI.imageUrl(product.images[0])
    : "https://placehold.co/300x220/f2f2f2/aaa?text=No+Image";

  return (
    <div className="card" style={styles.card}>
      {/* Image */}
      <Link to={`/product/${product.id}`} style={styles.imageWrap}>
        <img src={imgSrc} alt={product.title} style={styles.image} />
        {product.stock === 0 && <div style={styles.soldOut}>SOLD OUT</div>}
        {hasDiscount && (
          <div style={styles.discountBadge}>
            -{Math.round(((product.price - product.negotiated_price) / product.price) * 100)}%
          </div>
        )}
      </Link>

      {/* Info */}
      <div style={styles.info}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ ...styles.condition, color: conditionColor[product.condition] || "var(--gray-500)" }}>
            {product.condition}
          </span>
          {product.category && <span style={styles.cat}>{product.category.icon} {product.category.name}</span>}
        </div>

        <Link to={`/product/${product.id}`} style={styles.title}>{product.title}</Link>

        <div style={styles.priceRow}>
          <span style={styles.price}>₱{price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
          {hasDiscount && (
            <span style={styles.originalPrice}>₱{product.price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
          )}
        </div>

        <div style={styles.seller}>By {product.seller?.name}</div>

        <button
          className="btn btn-primary"
          style={{ width: "100%", marginTop: 10 }}
          disabled={product.stock === 0}
          onClick={() => addToCart(product)}
        >
          {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  card: { display: "flex", flexDirection: "column", transition: "transform 0.2s, box-shadow 0.2s" },
  imageWrap: { position: "relative", display: "block", overflow: "hidden", aspectRatio: "4/3" },
  image: { width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" },
  soldOut: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 20, fontFamily: "Syne, sans-serif" },
  discountBadge: { position: "absolute", top: 10, left: 10, background: "var(--red)", color: "white", padding: "3px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700 },
  info: { padding: "14px", flex: 1, display: "flex", flexDirection: "column" },
  condition: { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" },
  cat: { fontSize: 11, color: "var(--gray-400)", background: "var(--gray-100)", padding: "2px 8px", borderRadius: 20 },
  title: { fontSize: 15, fontWeight: 600, color: "var(--black)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: 8, lineHeight: 1.4 },
  priceRow: { display: "flex", alignItems: "center", gap: 8 },
  price: { fontSize: 18, fontWeight: 800, color: "var(--red)", fontFamily: "Syne, sans-serif" },
  originalPrice: { fontSize: 13, color: "var(--gray-400)", textDecoration: "line-through" },
  seller: { fontSize: 12, color: "var(--gray-400)", marginTop: 4 },
};
