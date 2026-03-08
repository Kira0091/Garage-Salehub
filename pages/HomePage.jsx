// src/pages/HomePage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { productsAPI } from "../services/api";
import ProductCard from "../components/ProductCard";

export default function HomePage() {
  const [latest, setLatest] = useState([]);
  const [bestSelling, setBestSelling] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      productsAPI.getAll({ status: "approved", per_page: 8 }),
      productsAPI.categories(),
    ]).then(([prod, cats]) => {
      setLatest(prod.products.slice(0, 8));
      setBestSelling(prod.products.slice(0, 5));
      setCategories(cats);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero Banner */}
      <div style={styles.hero}>
        <div className="container" style={styles.heroInner}>
          <div style={styles.heroContent}>
            <div style={styles.heroTag}>Second-Hand Marketplace</div>
            <h1 style={styles.heroTitle}>Find Amazing Deals on Pre-loved Items</h1>
            <p style={styles.heroSub}>Browse hundreds of quality second-hand household items at unbeatable prices</p>
            <div style={styles.heroActions}>
              <Link to="/shop" className="btn btn-primary btn-lg">Shop Now</Link>
              <Link to="/sell" className="btn btn-lg" style={{ background: "white", color: "var(--red)" }}>Sell an Item</Link>
            </div>
          </div>
          <div style={styles.heroImage}>
            <div style={styles.heroCard}>
              <div style={{ fontSize: 64 }}>🛋️</div>
              <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 18, marginTop: 8 }}>Quality Guaranteed</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>Admin-reviewed items only</div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust badges */}
      <div style={styles.trustBar}>
        <div className="container">
          <div style={styles.trustGrid}>
            {[
              { icon: "🚚", title: "Free Shipping", sub: "On orders ₱500+" },
              { icon: "🔄", title: "Easy Returns", sub: "Within 7 days" },
              { icon: "🔒", title: "Secure Payment", sub: "Simulated checkout" },
              { icon: "✅", title: "Quality Checked", sub: "Admin-reviewed" },
              { icon: "💬", title: "Chat Support", sub: "Direct messaging" },
            ].map((b) => (
              <div key={b.title} style={styles.trustItem}>
                <span style={styles.trustIcon}>{b.icon}</span>
                <div>
                  <div style={styles.trustTitle}>{b.title}</div>
                  <div style={styles.trustSub}>{b.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Latest Products */}
      <div style={{ padding: "48px 0" }}>
        <div className="container">
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Latest Products</h2>
            <Link to="/shop" style={styles.viewAll}>View All Products →</Link>
          </div>
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : latest.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <div className="empty-state-title">No products yet</div>
              <div className="empty-state-text">Be the first to sell something!</div>
              <Link to="/sell" className="btn btn-primary" style={{ marginTop: 16 }}>Sell an Item</Link>
            </div>
          ) : (
            <div className="products-grid">
              {latest.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>

      {/* Mid banners */}
      <div style={{ padding: "0 0 48px" }}>
        <div className="container">
          <div style={styles.bannerGrid}>
            <div style={{ ...styles.banner, background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}>
              <div style={styles.bannerContent}>
                <div style={styles.bannerTag}>Trending</div>
                <h3 style={{ ...styles.bannerTitle, color: "white" }}>Electronics &amp; Gadgets</h3>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginBottom: 16 }}>From ₱200.00</p>
                <Link to="/shop?category=Electronics" className="btn btn-primary btn-sm">Shop Now</Link>
              </div>
              <div style={styles.bannerEmoji}>📱</div>
            </div>
            <div style={{ ...styles.banner, background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)" }}>
              <div style={styles.bannerContent}>
                <div style={{ ...styles.bannerTag, background: "var(--green)", color: "white" }}>New Arrivals</div>
                <h3 style={{ ...styles.bannerTitle, color: "var(--black)" }}>Furniture &amp; Home</h3>
                <p style={{ color: "var(--gray-500)", fontSize: 13, marginBottom: 16 }}>From ₱500.00</p>
                <Link to="/shop?category=Furniture" className="btn btn-sm" style={{ background: "var(--green)", color: "white" }}>Shop Now</Link>
              </div>
              <div style={styles.bannerEmoji}>🛋️</div>
            </div>
          </div>
        </div>
      </div>

      {/* Shop by Category */}
      <div style={{ background: "var(--gray-50)", padding: "48px 0" }}>
        <div className="container">
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Shop by Category</h2>
            <Link to="/shop" style={styles.viewAll}>View All →</Link>
          </div>
          <div style={styles.catGrid}>
            {categories.map((c) => (
              <Link key={c.id} to={`/shop?category_id=${c.id}`} style={styles.catItem}>
                <div style={styles.catIcon}>{c.icon}</div>
                <div style={styles.catName}>{c.name}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div style={{ padding: "60px 0" }}>
        <div className="container">
          <h2 style={{ ...styles.sectionTitle, textAlign: "center", marginBottom: 40 }}>How GarageSaleHub Works</h2>
          <div style={styles.stepsGrid}>
            {[
              { n: "01", icon: "📸", title: "Submit Your Item", desc: "Upload photos and details of your unused household item for review" },
              { n: "02", icon: "⏳", title: "Admin Review", desc: "Our team evaluates your submission for quality and authenticity" },
              { n: "03", icon: "✅", title: "Get Approved", desc: "Approved items are listed on the platform and sold through our system" },
              { n: "04", icon: "💰", title: "Earn Money", desc: "Buyers purchase your item and you receive compensation" },
            ].map((s) => (
              <div key={s.n} style={styles.step}>
                <div style={styles.stepNum}>{s.n}</div>
                <div style={styles.stepIcon}>{s.icon}</div>
                <h4 style={styles.stepTitle}>{s.title}</h4>
                <p style={styles.stepDesc}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  hero: { background: "linear-gradient(135deg, var(--black) 0%, #2d0000 100%)", padding: "60px 0", overflow: "hidden" },
  heroInner: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" },
  heroContent: {},
  heroTag: { display: "inline-block", background: "var(--red)", color: "white", padding: "4px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 16 },
  heroTitle: { fontSize: 48, color: "white", lineHeight: 1.1, marginBottom: 16 },
  heroSub: { fontSize: 16, color: "rgba(255,255,255,0.6)", marginBottom: 32, lineHeight: 1.6 },
  heroActions: { display: "flex", gap: 16 },
  heroImage: { display: "flex", justifyContent: "center" },
  heroCard: { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 20, padding: 40, textAlign: "center", color: "white", backdropFilter: "blur(10px)" },
  trustBar: { background: "white", borderBottom: "1px solid var(--gray-200)", padding: "20px 0" },
  trustGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 },
  trustItem: { display: "flex", alignItems: "center", gap: 10, padding: "0 12px", borderRight: "1px solid var(--gray-200)" },
  trustIcon: { fontSize: 24, flexShrink: 0 },
  trustTitle: { fontSize: 13, fontWeight: 700 },
  trustSub: { fontSize: 11, color: "var(--gray-400)" },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  sectionTitle: { fontSize: 24 },
  viewAll: { fontSize: 13, color: "var(--red)", fontWeight: 600, textDecoration: "none" },
  bannerGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  banner: { borderRadius: "var(--radius-lg)", padding: 32, display: "flex", justifyContent: "space-between", alignItems: "center", overflow: "hidden" },
  bannerContent: {},
  bannerTag: { display: "inline-block", background: "var(--red)", color: "white", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, marginBottom: 10 },
  bannerTitle: { fontSize: 22, fontFamily: "Syne, sans-serif", fontWeight: 800, marginBottom: 4 },
  bannerEmoji: { fontSize: 72, opacity: 0.4 },
  catGrid: { display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 16 },
  catItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 16, background: "white", borderRadius: "var(--radius)", border: "1px solid var(--gray-200)", textDecoration: "none", transition: "all 0.2s", cursor: "pointer" },
  catIcon: { fontSize: 32 },
  catName: { fontSize: 12, fontWeight: 600, color: "var(--black)", textAlign: "center" },
  stepsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 },
  step: { textAlign: "center", padding: 24 },
  stepNum: { fontSize: 12, fontWeight: 800, color: "var(--red)", letterSpacing: 2, marginBottom: 12 },
  stepIcon: { fontSize: 40, marginBottom: 12 },
  stepTitle: { fontSize: 16, fontWeight: 700, marginBottom: 8 },
  stepDesc: { fontSize: 14, color: "var(--gray-500)", lineHeight: 1.6 },
};
