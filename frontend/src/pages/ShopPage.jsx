// src/pages/ShopPage.jsx
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { productsAPI } from "../services/api";
import ProductCard from "../components/ProductCard";
import Icon from "../components/Icon";
import { categoryIconName } from "../utils/categoryIcons";

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isNarrow, setIsNarrow] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth < 980 : false)
  );

  const page = parseInt(searchParams.get("page") || "1");
  const status = searchParams.get("status") || "approved";
  const search = searchParams.get("search") || "";
  const category_id = searchParams.get("category_id") || "";
  const min_price = searchParams.get("min_price") || "";
  const max_price = searchParams.get("max_price") || "";
  const condition = searchParams.get("condition") || "";
  const location = searchParams.get("location") || "";
  const sort = searchParams.get("sort") || "newest";
  const [localSearch, setLocalSearch] = useState(search);
  const [localLocation, setLocalLocation] = useState(location);
  const [localMin, setLocalMin] = useState(min_price);
  const [localMax, setLocalMax] = useState(max_price);

  useEffect(() => {
    productsAPI.categories().then(setCategories);
  }, []);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 980);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setLocalSearch(search);
    setLocalLocation(location);
    setLocalMin(min_price);
    setLocalMax(max_price);
  }, [search, location, min_price, max_price]);

  useEffect(() => {
    setLoading(true);
    const params = { status, page, per_page: 12 };
    if (search) params.search = search;
    if (category_id) params.category_id = category_id;
    if (min_price) params.min_price = min_price;
    if (max_price) params.max_price = max_price;
    if (condition) params.condition = condition;
    if (location) params.location = location;
    if (sort) params.sort = sort;
    productsAPI.getAll(params)
      .then((data) => { setProducts(data.products); setTotal(data.total); setPages(data.pages); })
      .finally(() => setLoading(false));
  }, [page, status, search, category_id, min_price, max_price, condition, location, sort]);

  const updateParam = (key, val) => {
    const p = new URLSearchParams(searchParams);
    if (val) p.set(key, val); else p.delete(key);
    p.delete("page");
    setSearchParams(p);
  };

  const applyFilters = () => {
    const p = new URLSearchParams(searchParams);
    if (localSearch) p.set("search", localSearch); else p.delete("search");
    if (localLocation) p.set("location", localLocation); else p.delete("location");
    if (localMin) p.set("min_price", localMin); else p.delete("min_price");
    if (localMax) p.set("max_price", localMax); else p.delete("max_price");
    p.delete("page");
    setSearchParams(p);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    applyFilters();
  };

  return (
    <div className="page">
      <div className="container">
        <div style={{ ...styles.layout, gridTemplateColumns: isNarrow ? "1fr" : "220px 1fr" }}>
          {/* Sidebar */}
          <aside style={{ ...styles.sidebar, position: isNarrow ? "static" : "sticky", top: isNarrow ? "auto" : 160 }}>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={styles.filterTitle}>Categories</h3>
              <div style={styles.catList}>
                <button
                  style={{ ...styles.catBtn, ...(category_id === "" ? styles.catBtnActive : {}) }}
                  onClick={() => updateParam("category_id", "")}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <Icon name="grid" size={14} />
                    All Categories
                  </span>
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    style={{ ...styles.catBtn, ...(category_id === String(c.id) ? styles.catBtnActive : {}) }}
                    onClick={() => updateParam("category_id", c.id)}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Icon name={categoryIconName(c.name)} size={14} color="currentColor" /> {c.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 20, marginTop: 16 }}>
              <h3 style={styles.filterTitle}>Filters</h3>
              <div style={{ display: "grid", gap: 10 }}>
                <select className="input-field" value={condition} onChange={(e) => updateParam("condition", e.target.value)}>
                  <option value="">Any Condition</option>
                  <option>Like New</option>
                  <option>Good</option>
                  <option>Fair</option>
                </select>
                <input className="input-field" placeholder="Location (e.g. Makati)" value={localLocation} onChange={(e) => setLocalLocation(e.target.value)} />
                <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr", gap: 8 }}>
                  <input className="input-field" placeholder="Min Price" value={localMin} onChange={(e) => setLocalMin(e.target.value)} />
                  <input className="input-field" placeholder="Max Price" value={localMax} onChange={(e) => setLocalMax(e.target.value)} />
                </div>
                <select className="input-field" value={sort} onChange={(e) => updateParam("sort", e.target.value)}>
                  <option value="newest">Newest</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="views_desc">Most Viewed</option>
                </select>
                <button className="btn btn-outline" style={{ width: "100%" }} onClick={applyFilters}>Apply Filters</button>
              </div>
            </div>
          </aside>

          {/* Main */}
          <main style={styles.main}>
            {/* Search bar */}
            <form onSubmit={handleSearch} style={{ ...styles.searchRow, flexWrap: isNarrow ? "wrap" : "nowrap" }}>
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
                  onClick={() => { setLocalSearch(""); setLocalLocation(""); setLocalMin(""); setLocalMax(""); setSearchParams({}); }}
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
                <div className="empty-state-icon"><Icon name="message" size={48} color="var(--gray-400)" /></div>
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
  layout: { display: "grid", gap: 24, alignItems: "start" },
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


