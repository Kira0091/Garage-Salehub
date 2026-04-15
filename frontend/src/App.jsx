// src/App.jsx
import { Component, Suspense, lazy, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ToastProvider } from "./components/Toast";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

const HomePage = lazy(() => import("./pages/HomePage"));
const ShopPage = lazy(() => import("./pages/ShopPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const SellPage = lazy(() => import("./pages/SellPage"));
const MyProductsPage = lazy(() => import("./pages/MyProductsPage"));
const ProductEditPage = lazy(() => import("./pages/ProductEditPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const OrderDetailsPage = lazy(() => import("./pages/OrderDetailsPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const AuthPage = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.AuthPage })));
const LoginPage = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.RegisterPage })));
const WishlistPage = lazy(() => import("./pages/WishlistPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const SellerDashboardPage = lazy(() => import("./pages/SellerDashboardPage"));
const LoyaltyPage = lazy(() => import("./pages/LoyaltyPage"));
const ReportProblemPage = lazy(() => import("./pages/ReportProblemPage"));

const isAdmin = (user) => String(user?.role || "").trim().toLowerCase() === "admin";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err) {
    console.error("UI crash:", err);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page">
          <div className="container" style={{ paddingTop: 20 }}>
            <div className="card" style={{ padding: 20 }}>
              <h2 style={{ marginBottom: 8 }}>Something went wrong</h2>
              <p style={{ color: "var(--gray-600)" }}>
                Please refresh the page. If it keeps happening, sign out and sign in again.
              </p>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin(user)) return <Navigate to="/" replace />;
  return children;
}

function HomeEntry() {
  return <HomePage />;
}

function AuthGuard({ children }) {
  const location = useLocation();
  const { user, validateSession } = useAuth();
  const lastCheck = useRef(0);

  useEffect(() => {
    if (!user) return;
    const now = Date.now();
    if (now - lastCheck.current < 15000) return;
    lastCheck.current = now;
    validateSession().catch(() => {});
  }, [location.pathname, user, validateSession]);

  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();
  const adminUser = String(user?.role || "").trim().toLowerCase() === "admin";
  const fromAdminChat =
    location.pathname === "/chat" &&
    adminUser &&
    new URLSearchParams(location.search).get("from") === "admin";

  return (
    <>
      {!fromAdminChat && <Navbar />}
      <Suspense fallback={<div className="loading-center"><div className="spinner" /></div>}>
        <Routes>
          <Route path="/" element={<HomeEntry />} />
          <Route path="/dashboard" element={<Navigate to="/seller-dashboard" replace />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="/sell" element={<ProtectedRoute><SellPage /></ProtectedRoute>} />
          <Route path="/my-products" element={<ProtectedRoute><MyProductsPage /></ProtectedRoute>} />
          <Route path="/my-products/:id/edit" element={<ProtectedRoute><ProductEditPage /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute><OrderDetailsPage /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/wishlist" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/loyalty" element={<ProtectedRoute><LoyaltyPage /></ProtectedRoute>} />
          <Route path="/seller-dashboard" element={<ProtectedRoute><SellerDashboardPage /></ProtectedRoute>} />
          <Route path="/report-problem" element={<ProtectedRoute><ReportProblemPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
      {!fromAdminChat && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <ErrorBoundary>
              <AuthGuard>
                <AppRoutes />
              </AuthGuard>
            </ErrorBoundary>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
