// src/components/Footer.jsx
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer style={styles.footer}>
      <div className="container">
        <div style={styles.grid}>
          <div>
            <div style={styles.logoRow}>
              <div style={styles.logoIcon}>G</div>
              <span style={styles.logoText}>GarageSale<strong>Hub</strong></span>
            </div>
            <p style={styles.desc}>
              The digital marketplace for second-hand household items. 
              Buy and sell with trust and transparency.
            </p>
          </div>
          <div>
            <h4 style={styles.colTitle}>Quick Links</h4>
            <Link to="/" style={styles.link}>Home</Link>
            <Link to="/shop" style={styles.link}>Shop</Link>
            <Link to="/sell" style={styles.link}>Sell an Item</Link>
            <Link to="/orders" style={styles.link}>My Orders</Link>
          </div>
          <div>
            <h4 style={styles.colTitle}>Support</h4>
            <a href="#" style={styles.link}>How It Works</a>
            <a href="#" style={styles.link}>Seller Guidelines</a>
            <a href="#" style={styles.link}>Buyer Protection</a>
            <a href="#" style={styles.link}>FAQ</a>
          </div>
          <div>
            <h4 style={styles.colTitle}>Features</h4>
            <p style={styles.feature}>✅ Free Shipping on ₱500+</p>
            <p style={styles.feature}>🔄 Easy Returns</p>
            <p style={styles.feature}>🔒 Secure Payments</p>
            <p style={styles.feature}>💬 Direct Chat</p>
          </div>
        </div>
        <div style={styles.bottom}>
          <p style={styles.copy}>© 2026 GarageSaleHub. All rights reserved. Presented by Group 11.</p>
          <div style={styles.badges}>
            <span style={styles.payBadge}>COD</span>
            <span style={styles.payBadge}>GCash</span>
            <span style={styles.payBadge}>Card</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

const styles = {
  footer: { background: "var(--black)", color: "white", marginTop: 60, padding: "48px 0 24px" },
  grid: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 40 },
  logoRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
  logoIcon: { width: 36, height: 36, background: "var(--red)", color: "white", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontFamily: "Syne, sans-serif", fontWeight: 800 },
  logoText: { fontSize: 18, fontFamily: "Syne, sans-serif", color: "white" },
  desc: { fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, maxWidth: 260 },
  colTitle: { fontSize: 14, fontWeight: 700, marginBottom: 16, color: "rgba(255,255,255,0.9)" },
  link: { display: "block", fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 10, textDecoration: "none", transition: "color 0.15s" },
  feature: { fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 8 },
  bottom: { borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" },
  copy: { fontSize: 12, color: "rgba(255,255,255,0.3)" },
  badges: { display: "flex", gap: 8 },
  payBadge: { fontSize: 11, color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.2)", padding: "3px 10px", borderRadius: 4 },
};
