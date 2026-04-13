// src/components/Navbar.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { notificationsAPI } from "../services/api";
import { alertError, alertSuccess, confirmAction } from "../utils/alerts";
import Icon from "./Icon";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const displayName = String(user?.name || user?.full_name || user?.username || "User").trim() || "User";
  const firstName = displayName.split(" ")[0] || "User";
  const avatarInitial = displayName.charAt(0).toUpperCase() || "U";

  useEffect(() => {
    const readCount = () => {
      const n = parseInt(localStorage.getItem("notif_unread") || "0", 10);
      setNotifCount(Number.isFinite(n) ? n : 0);
    };
    readCount();
    window.addEventListener("storage", readCount);
    return () => window.removeEventListener("storage", readCount);
  }, []);

  useEffect(() => {
    if (!user) return;
    let timer = null;
    const poll = async () => {
      try {
        const data = await notificationsAPI.getAll();
        const unread = data.filter((n) => !n.is_read).length;
        localStorage.setItem("notif_unread", String(unread));
        setNotifCount(unread);
      } catch {}
    };
    poll();
    timer = setInterval(poll, 15000);
    return () => clearInterval(timer);
  }, [user]);

  const isAdminDashboard =
    location.pathname === "/admin" && String(user?.role || "").trim().toLowerCase() === "admin";
  // We use React Router's useLocation() to detect auth routes and avoid redundant auth CTAs.
  const isAuthRoute = ["/auth", "/login", "/register"].includes(location.pathname);
  const hideBottomNav = isAdminDashboard;
  const logoTarget = isAdminDashboard ? "/admin" : "/";

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/shop?search=${encodeURIComponent(search.trim())}`);
  };

  const handleLogout = async () => {
    const confirmed = await confirmAction({
      title: "Log out now?",
      text: "You will need to sign in again to continue.",
      confirmText: "Log out",
    });
    if (!confirmed) return;
    try {
      await logout();
      await alertSuccess("Logged out", "You have been signed out.");
      navigate("/");
      setUserMenuOpen(false);
    } catch (e) {
      await alertError(e?.message || "Logout failed");
    }
  };

  return (
    <header style={styles.header}>
      <div style={styles.mainNav}>
        <div className="container" style={styles.mainNavInner}>
          <Link to={logoTarget} style={styles.logo}>
            <div style={styles.logoIcon}>G</div>
            <span style={styles.logoText}>GarageSale<strong>Hub</strong></span>
          </Link>

          {!isAdminDashboard && (
            <form onSubmit={handleSearch} style={styles.searchForm}>
              <input
                style={styles.searchInput}
                placeholder="Search for second-hand items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" style={styles.searchBtn}>Search</button>
            </form>
          )}

          <div style={styles.actions}>
            {!user ? (
              <>
                {!isAuthRoute && <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>}
                {!isAuthRoute && <Link to="/register" className="btn btn-primary btn-sm">Register</Link>}
              </>
            ) : (
              <div style={{ position: "relative" }}>
                <button className="navbar-user-btn" style={styles.userBtn} onClick={() => setUserMenuOpen(!userMenuOpen)}>
                  <div style={styles.avatar}>{avatarInitial}</div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{firstName}</span>
                  <span>v</span>
                </button>
                {userMenuOpen && (
                  <div className="navbar-dropdown" style={styles.dropdown}>
                    {String(user.role || "").toLowerCase() !== "admin" && (
                      <>
                        <Link className="navbar-dropdown-item" to="/profile" style={styles.dropdownItem} onClick={() => setUserMenuOpen(false)}>My Profile</Link>
                        <Link className="navbar-dropdown-item" to="/my-products" style={styles.dropdownItem} onClick={() => setUserMenuOpen(false)}>My Submissions</Link>
                        <Link className="navbar-dropdown-item" to="/seller-dashboard" style={styles.dropdownItem} onClick={() => setUserMenuOpen(false)}>Seller Dashboard</Link>
                        <Link className="navbar-dropdown-item" to="/orders" style={styles.dropdownItem} onClick={() => setUserMenuOpen(false)}>My Orders</Link>
                        <Link className="navbar-dropdown-item" to="/chat" style={styles.dropdownItem} onClick={() => setUserMenuOpen(false)}>Messages</Link>
                        <Link className="navbar-dropdown-item" to="/wishlist" style={styles.dropdownItem} onClick={() => setUserMenuOpen(false)}>Wishlist</Link>
                        <Link className="navbar-dropdown-item" to="/notifications" style={styles.dropdownItem} onClick={() => setUserMenuOpen(false)}>Notifications</Link>
                      </>
                    )}
                    <div style={styles.dropdownDivider} />
                    <button
                      className="navbar-dropdown-item"
                      style={{ ...styles.dropdownItem, width: "100%", textAlign: "left", background: "none", border: "none" }}
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}

            {!isAdminDashboard && (
              <Link to="/cart" style={styles.cartBtn}>
                Cart
                {count > 0 && <span style={styles.cartBadge}>{count}</span>}
              </Link>
            )}
            {user && !isAdminDashboard && (
              <Link to="/notifications" style={styles.iconBtn} aria-label="Notifications">
                <Icon name="bell" size={16} />
                {notifCount > 0 && <span style={styles.cartBadge}>{notifCount}</span>}
              </Link>
            )}
          </div>
        </div>
      </div>

      {!hideBottomNav && (
        <nav style={styles.navLinks}>
          <div className="container" style={styles.navLinksInner}>
            <Link to="/" style={styles.navLink}>Home</Link>
            <Link to="/shop" style={styles.navLink}>Shop</Link>
            <Link to="/shop?status=approved" style={styles.navLink}>Today's Deals</Link>
            <Link to="/wishlist" style={styles.navLink}>Wishlist</Link>
            <Link to="/sell" style={{ ...styles.navLink, color: "var(--red)", fontWeight: 700 }}>+ Sell an Item</Link>
            <Link to="/chat" style={styles.navLink}>Messages</Link>
          </div>
        </nav>
      )}
    </header>
  );
}

const styles = {
  header: { background: "white", borderBottom: "1px solid var(--gray-200)", position: "sticky", top: 0, zIndex: 100, boxShadow: "var(--shadow-sm)" },
  mainNav: { padding: "12px 0" },
  mainNavInner: { display: "flex", alignItems: "center", gap: 20 },
  logo: { display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 },
  logoIcon: { width: 36, height: 36, background: "var(--red)", color: "white", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontFamily: "Syne, sans-serif", fontWeight: 800 },
  logoText: { fontSize: 18, fontFamily: "Syne, sans-serif", color: "var(--black)", whiteSpace: "nowrap" },
  searchForm: { flex: 1, display: "flex", maxWidth: 560 },
  searchInput: { flex: 1, padding: "9px 16px", border: "1.5px solid var(--gray-200)", borderRight: "none", borderRadius: "var(--radius) 0 0 var(--radius)", fontSize: 14, outline: "none" },
  searchBtn: { padding: "9px 16px", background: "var(--red)", color: "white", border: "none", borderRadius: "0 var(--radius) var(--radius) 0", cursor: "pointer", fontSize: 14 },
  actions: { display: "flex", alignItems: "center", gap: 10, flexShrink: 0 },
  userBtn: { display: "flex", alignItems: "center", gap: 8, background: "none", border: "1.5px solid var(--gray-200)", borderRadius: "var(--radius)", padding: "6px 12px", cursor: "pointer" },
  avatar: { width: 28, height: 28, background: "var(--red)", color: "white", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 },
  dropdown: { position: "absolute", right: 0, top: "calc(100% + 8px)", background: "white", border: "1px solid var(--gray-200)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-lg)", minWidth: 200, zIndex: 200, overflow: "hidden" },
  dropdownItem: { display: "block", padding: "10px 16px", fontSize: 14, color: "var(--black)", transition: "background 0.15s" },
  dropdownDivider: { borderTop: "1px solid var(--gray-200)", margin: "4px 0" },
  cartBtn: { position: "relative", fontSize: 14, padding: "6px 10px", textDecoration: "none", border: "1px solid var(--gray-200)", borderRadius: "var(--radius)", color: "var(--black)" },
  cartBadge: { position: "absolute", top: -6, right: -6, background: "var(--red)", color: "white", borderRadius: "50%", fontSize: 11, width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 },
  iconBtn: { position: "relative", fontSize: 16, padding: "6px 10px", textDecoration: "none", border: "1px solid var(--gray-200)", borderRadius: "var(--radius)", color: "var(--black)" },
  navLinks: { background: "var(--black)", padding: "0" },
  navLinksInner: { display: "flex", alignItems: "center", gap: 4 },
  navLink: { color: "rgba(255,255,255,0.85)", padding: "11px 16px", fontSize: 14, fontWeight: 500, display: "block", transition: "color 0.15s", textDecoration: "none" },
};
