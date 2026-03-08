// src/pages/ShopPage.jsx
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { productsAPI } from "../services/api";
import ProductCard from "../components/ProductCard";

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const page = parseInt(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const category_id = searchParams.get("category_id") || "";
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    productsAPI.categories().then(setCategories);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { status: "approved", page, per_page: 12 };
    if (search) params.search = search;
    if (category_id) params.category_id = category_id;
    productsAPI.getAll(params)
      .then((data) => { setProducts(data.products); setTotal(data.total); setPages(data.pages); })
      .finally(() => setLoading(false));
  }, [page, search, category_id]);

  const updateParam = (key, val) => {
    const p = new URLSearchParams(searchParams);
    if (val) p.set(key, val); else p.delete(key);
    p.delete("page");
    setSearchParams(p);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    updateParam("search", localSearch);
  };

  return (
    <div className="page">
      <div className="container">
        <div style={styles.layout}>
          {/* Sidebar */}
          <aside style={styles.sidebar}>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={styles.filterTitle}>Categories</h3>
              <div style={styles.catList}>
                <button
                  style={{ ...styles.catBtn, ...(category_id === "" ? styles.catBtnActive : {}) }}
                  onClick={() => updateParam("category_id", "")}
                >
                  📦 All Categories
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    style={{ ...styles.catBtn, ...(category_id === String(c.id) ? styles.catBtnActive : {}) }}
                    onClick={() => updateParam("category_id", c.id)}
                  >
                    {c.icon} {c.name}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Main */}
          <main style={styles.main}>
            {/* Search bar */}
            <form onSubmit={handleSearch} style={styles.searchRow}>
              <input
                className="input-field"
                style={{ flex: 1 }}
                placeholder="Search products..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">Search</button>
              {(search || category_id) && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => { setLocalSearch(""); setSearchParams({}); }}
                >
                  Clear
                </button>
              )}
            </form>

            <div style={styles.resultsHeader}>
              <span style={{ fontSize: 14, color: "var(--gray-500)" }}>
                {total} item{total !== 1 ? "s" : ""} found
                {search && ` for "${search}"`}
              </span>
            </div>

            {loading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : products.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <div className="empty-state-title">No products found</div>
                <div className="empty-state-text">Try different keywords or categories</div>
              </div>
            ) : (
              <>
                <div className="products-grid">
                  {products.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>

                {/* Pagination */}
                {pages > 1 && (
                  <div style={styles.pagination}>
                    {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        style={{ ...styles.pageBtn, ...(p === page ? styles.pageBtnActive : {}) }}
                        onClick={() => updateParam("page", p)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

const styles = {
  layout: { display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, alignItems: "start" },
  sidebar: { position: "sticky", top: 160 },
  filterTitle: { fontSize: 16, fontWeight: 700, marginBottom: 14 },
  catList: { display: "flex", flexDirection: "column", gap: 4 },
  catBtn: { textAlign: "left", padding: "8px 12px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--gray-700)", transition: "all 0.15s" },
  catBtnActive: { background: "#fee2e2", color: "var(--red)", fontWeight: 600 },
  main: {},
  searchRow: { display: "flex", gap: 10, marginBottom: 16 },
  resultsHeader: { marginBottom: 20 },
  pagination: { display: "flex", gap: 8, justifyContent: "center", marginTop: 32 },
  pageBtn: { width: 36, height: 36, borderRadius: 8, border: "1.5px solid var(--gray-200)", background: "white", cursor: "pointer", fontSize: 14, fontWeight: 600 },
  pageBtnActive: { background: "var(--red)", color: "white", border: "1.5px solid var(--red)" },
};
