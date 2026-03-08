// src/components/Navbar.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/shop?search=${encodeURIComponent(search.trim())}`);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
    setUserMenuOpen(false);
  };

  return (
    <header style={styles.header}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div className="container" style={styles.topBarInner}>
          <span style={styles.topBarText}>🎉 Tell a friend about GarageSaleHub &amp; get 10% off your next order</span>
          <div style={styles.topBarRight}>
            {user ? (
              <span style={styles.topBarText}>Hi, {user.name.split(" ")[0]}!</span>
            ) : (
              <span style={styles.topBarText}>Sign in for exclusive deals</span>
            )}
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <div style={styles.mainNav}>
        <div className="container" style={styles.mainNavInner}>
          {/* Logo */}
          <Link to="/" style={styles.logo}>
            <div style={styles.logoIcon}>G</div>
            <span style={styles.logoText}>GarageSale<strong>Hub</strong></span>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} style={styles.searchForm}>
            <input
              style={styles.searchInput}
              placeholder="Search for second-hand items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" style={styles.searchBtn}>🔍</button>
          </form>

          {/* Actions */}
          <div style={styles.actions}>
            {!user ? (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
              </>
            ) : (
              <div style={{ position: "relative" }}>
                <button
                  style={styles.userBtn}
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <div style={styles.avatar}>{user.name[0].toUpperCase()}</div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{user.name.split(" ")[0]}</span>
                  <span>▾</span>
                </button>
                {userMenuOpen && (
                  <div style={styles.dropdown}>
                    <Link to="/profile" style={styles.dropdownItem} onClick={() => setUserMenuOpen(false)}>👤 My Profile</Link>
                    <Link to="/my-products" style={styles.dropdownItem} onClick={() => setUserMenuOpen(false)}>📦 My Submissions</Link>
                    <Link to="/orders" style={styles.dropdownItem} onClick={() => setUserMenuOpen(false)}>🛍️ My Orders</Link>
                    <Link to="/chat" style={styles.dropdownItem} onClick={() => setUserMenuOpen(false)}>💬 Messages</Link>
                    {user.role === "admin" && (
                      <Link to="/admin" style={{ ...styles.dropdownItem, color: "var(--red)" }} onClick={() => setUserMenuOpen(false)}>⚙️ Admin Panel</Link>
                    )}
                    <div style={styles.dropdownDivider} />
                    <button style={{ ...styles.dropdownItem, width: "100%", textAlign: "left", background: "none", border: "none" }} onClick={handleLogout}>
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>
            )}

            <Link to="/cart" style={styles.cartBtn}>
              🛒
              {count > 0 && <span style={styles.cartBadge}>{count}</span>}
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation links */}
      <nav style={styles.navLinks}>
        <div className="container" style={styles.navLinksInner}>
          <Link to="/" style={styles.navLink}>Home</Link>
          <Link to="/shop" style={styles.navLink}>Shop</Link>
          <Link to="/shop?status=approved" style={styles.navLink}>Today's Deals</Link>
          <Link to="/sell" style={{ ...styles.navLink, color: "var(--red)", fontWeight: 700 }}>+ Sell an Item</Link>
          <Link to="/chat" style={styles.navLink}>Messages</Link>
        </div>
      </nav>
    </header>
  );
}

const styles = {
  header: { background: "white", borderBottom: "1px solid var(--gray-200)", position: "sticky", top: 0, zIndex: 100, boxShadow: "var(--shadow-sm)" },
  topBar: { background: "var(--red)", padding: "6px 0" },
  topBarInner: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  topBarText: { fontSize: 12, color: "white" },
  topBarRight: { display: "flex", alignItems: "center", gap: 16 },
  mainNav: { padding: "12px 0" },
  mainNavInner: { display: "flex", alignItems: "center", gap: 20 },
  logo: { display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 },
  logoIcon: { width: 36, height: 36, background: "var(--red)", color: "white", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontFamily: "Syne, sans-serif", fontWeight: 800 },
  logoText: { fontSize: 18, fontFamily: "Syne, sans-serif", color: "var(--black)", whiteSpace: "nowrap" },
  searchForm: { flex: 1, display: "flex", maxWidth: 560 },
  searchInput: { flex: 1, padding: "9px 16px", border: "1.5px solid var(--gray-200)", borderRight: "none", borderRadius: "var(--radius) 0 0 var(--radius)", fontSize: 14, outline: "none" },
  searchBtn: { padding: "9px 16px", background: "var(--red)", color: "white", border: "none", borderRadius: "0 var(--radius) var(--radius) 0", cursor: "pointer", fontSize: 16 },
  actions: { display: "flex", alignItems: "center", gap: 10, flexShrink: 0 },
  userBtn: { display: "flex", alignItems: "center", gap: 8, background: "none", border: "1.5px solid var(--gray-200)", borderRadius: "var(--radius)", padding: "6px 12px", cursor: "pointer" },
  avatar: { width: 28, height: 28, background: "var(--red)", color: "white", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 },
  dropdown: { position: "absolute", right: 0, top: "calc(100% + 8px)", background: "white", border: "1px solid var(--gray-200)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-lg)", minWidth: 200, zIndex: 200, overflow: "hidden" },
  dropdownItem: { display: "block", padding: "10px 16px", fontSize: 14, color: "var(--black)", transition: "background 0.15s" },
  dropdownDivider: { borderTop: "1px solid var(--gray-200)", margin: "4px 0" },
  cartBtn: { position: "relative", fontSize: 22, padding: "4px 8px", textDecoration: "none" },
  cartBadge: { position: "absolute", top: -4, right: -4, background: "var(--red)", color: "white", borderRadius: "50%", fontSize: 11, width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 },
  navLinks: { background: "var(--black)", padding: "0" },
  navLinksInner: { display: "flex", alignItems: "center", gap: 4 },
  navLink: { color: "rgba(255,255,255,0.85)", padding: "11px 16px", fontSize: 14, fontWeight: 500, display: "block", transition: "color 0.15s", textDecoration: "none" },
};
