import { useEffect, useState } from "react";
import { wishlistAPI } from "../services/api";
import ProductCard from "../components/ProductCard";
import { useToast } from "../components/Toast";
import Icon from "../components/Icon";

export default function WishlistPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    wishlistAPI.getAll()
      .then(setItems)
      .catch((e) => toast(e.message, "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Wishlist</h1>
          <p className="page-subtitle">Saved items and price drop alerts</p>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Icon name="heart" size={26} color="var(--gray-400)" />
            </div>
            <div className="empty-state-title">No saved items</div>
            <div className="empty-state-text">Tap the Save button on a product to add it here.</div>
          </div>
        ) : (
          <div className="products-grid">
            {items.map((w) => w.product && <ProductCard key={w.id} product={w.product} />)}
          </div>
        )}
      </div>
    </div>
  );
}
