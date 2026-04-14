import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ordersAPI, productsAPI, reviewsAPI, wishlistAPI } from "../services/api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { alertError, alertSuccess } from "../utils/alerts";

const conditionColors = { "Like New": "var(--green)", "Good": "var(--blue)", "Fair": "var(--yellow)" };
const submissionStatusLabel = {
  pending_verification: "Under review",
  approved: "Approved",
  rejected: "Rejected",
  sold: "Sold",
  inventory: "In Negotiation",
  pending: "Pending Review",
};
const submissionStatusClass = {
  pending_verification: "badge-yellow",
  approved: "badge-green",
  rejected: "badge-red",
  sold: "badge-gray",
  inventory: "badge-blue",
  pending: "badge-yellow",
};

export default function ProductDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [ratingInfo, setRatingInfo] = useState({ avg: null, count: 0 });
  const [orderId, setOrderId] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    productsAPI.getOne(id)
      .then(setProduct)
      .catch(() => navigate("/shop"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    if (!product?.seller?.id) return;
    reviewsAPI.seller(product.seller.id)
      .then((data) => {
        setReviews(data.reviews || []);
        setRatingInfo({ avg: data.avg_rating, count: data.count });
      })
      .catch(() => {});
  }, [product?.seller?.id]);

  useEffect(() => {
    productsAPI.comments(id)
      .then((data) => setComments(data || []))
      .catch(() => setComments([]));
  }, [id]);

  useEffect(() => {
    if (!user) return;
    ordersAPI.getAll()
      .then((orders) => {
        const delivered = orders.find((order) =>
          order.status === "delivered" && order.items.some((item) => item.product?.id === Number(id))
        );
        setOrderId(delivered ? delivered.id : null);
      })
      .catch(() => {});
  }, [user, id]);

  const handleAddToCart = () => {
    addToCart(product, qty);
    alertSuccess("Added to cart", `${qty} item(s) added.`);
  };

  const handleReviewSubmit = async () => {
    if (!orderId) {
      await alertError("You can review only after delivery.");
      return;
    }
    try {
      await reviewsAPI.create({
        order_id: orderId,
        product_id: product.id,
        rating: reviewRating,
        comment: reviewComment,
      });
      await alertSuccess("Review submitted", "Thanks for your feedback.");
      setReviewComment("");
      const data = await reviewsAPI.seller(product.seller.id);
      setReviews(data.reviews || []);
      setRatingInfo({ avg: data.avg_rating, count: data.count });
    } catch (error) {
      await alertError(error.message || "Review submission failed");
    }
  };

  const handleCommentSubmit = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!commentText.trim()) {
      await alertError("Please write a comment first.");
      return;
    }
    try {
      const created = await productsAPI.addComment(product.id, { text: commentText.trim() });
      setComments((prev) => [created, ...prev]);
      setCommentText("");
      await alertSuccess("Comment posted", "Your comment is now visible.");
    } catch (error) {
      await alertError(error.message || "Failed to post comment");
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!product) return null;

  const price = product.negotiated_price || product.price;
  const hasDiscount = product.negotiated_price && product.negotiated_price < product.price;
  const imgs = product.images?.length
    ? product.images.map((img) => productsAPI.imageUrl(img))
    : ["https://placehold.co/500x400/f2f2f2/aaa?text=No+Image"];
  const isOwnProduct = Boolean(user?.id && product?.seller?.id && Number(user.id) === Number(product.seller.id));
  const fromSubmissions = String(searchParams.get("from") || "").toLowerCase() === "submissions";
  const isSubmissionOwnView = isOwnProduct && fromSubmissions;
  const submissionStatus = product.status === "sold" || product.status === "inventory"
    ? product.status
    : (product.verification_status || product.status);

  return (
    <div className="page">
      <div className="container">
        <div style={styles.layout}>
          <div style={styles.imgSection}>
            <div style={styles.mainImg}>
              <img src={imgs[activeImg]} alt={product.title} style={styles.mainImgEl} />
              {product.stock === 0 && <div style={styles.soldOverlay}>SOLD OUT</div>}
            </div>
            {imgs.length > 1 && (
              <div style={styles.thumbs}>
                {imgs.map((img, i) => (
                  <img
                    key={img + i}
                    src={img}
                    alt=""
                    style={{ ...styles.thumb, ...(i === activeImg ? styles.thumbActive : {}) }}
                    onClick={() => setActiveImg(i)}
                  />
                ))}
              </div>
            )}
          </div>

          <div style={styles.infoSection}>
            {product.category && (
              <div style={styles.breadcrumb}>{product.category.icon} {product.category.name}</div>
            )}
            <h1 style={styles.title}>{product.title}</h1>

            <div style={styles.metaRow}>
              <span style={{ ...styles.condition, color: conditionColors[product.condition] || "var(--gray-500)" }}>
                {product.condition}
              </span>
              <span style={styles.sellerInfo}>
                Sold by <strong>{product.seller?.name}</strong>
                {ratingInfo.avg && <span style={styles.rating}>* {ratingInfo.avg} ({ratingInfo.count})</span>}
              </span>
            </div>

            <div style={styles.priceBlock}>
              <span style={styles.price}>PHP {price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
              {hasDiscount && (
                <>
                  <span style={styles.origPrice}>PHP {product.price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                  <span className="badge badge-red">
                    -{Math.round(((product.price - product.negotiated_price) / product.price) * 100)}% OFF
                  </span>
                </>
              )}
            </div>

            {!isSubmissionOwnView && (
              <div style={styles.stockInfo}>
                {product.stock > 0 ? (
                  <span className="badge badge-green">In Stock ({product.stock} available)</span>
                ) : (
                  <span className="badge badge-red">Out of Stock</span>
                )}
              </div>
            )}

            {isSubmissionOwnView && (
              <div style={{ marginBottom: 14 }}>
                <span className={`badge ${submissionStatusClass[submissionStatus] || "badge-blue"}`}>
                  Submission Status: {submissionStatusLabel[submissionStatus] || submissionStatus}
                </span>
                {submissionStatus === "rejected" && product.rejection_reason && (
                  <div style={{ marginTop: 6, fontSize: 12, color: "var(--red)" }}>
                    Rejection reason: {product.rejection_reason}
                  </div>
                )}
              </div>
            )}

            {product.location && (
              <div style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 12 }}>
                Location: {product.location}
              </div>
            )}
            {product.location_meta?.latitude != null && product.location_meta?.longitude != null && (
              <div style={{ marginBottom: 16 }}>
                <iframe
                  title="Product location"
                  width="100%"
                  height="180"
                  style={{ border: "1px solid var(--gray-200)", borderRadius: 8 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${product.location_meta.latitude},${product.location_meta.longitude}&z=14&output=embed`}
                />
              </div>
            )}

            {product.description && (
              <div style={styles.desc}>
                <h4 style={styles.descTitle}>Description</h4>
                <p style={styles.descText}>{product.description}</p>
              </div>
            )}

            {product.stock > 0 && !isOwnProduct && (
              <div style={styles.qtyRow}>
                <label style={{ fontSize: 14, fontWeight: 600 }}>Quantity:</label>
                <div style={styles.qtyControl}>
                  <button style={styles.qtyBtn} onClick={() => setQty(Math.max(1, qty - 1))}>-</button>
                  <span style={styles.qtyNum}>{qty}</span>
                  <button style={styles.qtyBtn} onClick={() => setQty(Math.min(product.stock, qty + 1))}>+</button>
                </div>
              </div>
            )}

            <div style={styles.actions}>
              {isOwnProduct ? (
                <button className="btn btn-ghost btn-lg" style={{ flex: 1 }} disabled>
                  This is your listing
                </button>
              ) : (
                <button
                  className="btn btn-primary btn-lg"
                  style={{ flex: 1 }}
                  disabled={product.stock === 0}
                  onClick={handleAddToCart}
                >
                  Add to Cart
                </button>
              )}
              {user && !isSubmissionOwnView && (
                <button
                  className="btn btn-ghost btn-lg"
                  onClick={async () => {
                    try {
                      await wishlistAPI.add({ product_id: product.id });
                      await alertSuccess("Saved", "Item added to wishlist.");
                    } catch (error) {
                      await alertError(error.message || "Wishlist update failed");
                    }
                  }}
                >
                  Save
                </button>
              )}
            </div>
          </div>
        </div>

        {!isSubmissionOwnView && (
          <>
            <div className="card" style={{ padding: 20, marginTop: 30 }}>
              <h3 style={{ marginBottom: 12 }}>Reviews</h3>
              {user && orderId && (
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr auto", gap: 10, alignItems: "center", marginBottom: 16 }}>
                  <select className="input-field" value={reviewRating} onChange={(e) => setReviewRating(parseInt(e.target.value, 10))}>
                    {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} Stars</option>)}
                  </select>
                  <input
                    className="input-field"
                    placeholder="Write a short review"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                  />
                  <button className="btn btn-primary" onClick={handleReviewSubmit}>Submit</button>
                </div>
              )}
              {user && !orderId && (
                <div style={{ fontSize: 12, color: "var(--gray-500)", marginBottom: 12 }}>
                  You can review this item only after your order is delivered.
                </div>
              )}
              {reviews.length === 0 ? (
                <div style={{ color: "var(--gray-500)", fontSize: 13 }}>No reviews yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {reviews.map((review) => (
                    <div key={review.id} style={{ borderBottom: "1px solid var(--gray-100)", paddingBottom: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{review.buyer_name || "Buyer"} * {review.rating} stars</div>
                      <div style={{ fontSize: 13, color: "var(--gray-600)", marginTop: 4 }}>{review.comment}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card" style={{ padding: 20, marginTop: 20 }}>
              <h3 style={{ marginBottom: 12 }}>Comments</h3>
              {user && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 16 }}>
                  <input
                    className="input-field"
                    placeholder="Write a comment about this product"
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                  />
                  <button className="btn btn-primary" onClick={handleCommentSubmit}>Post</button>
                </div>
              )}
              {comments.length === 0 ? (
                <div style={{ color: "var(--gray-500)", fontSize: 13 }}>No comments yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {comments.map((comment) => (
                    <div key={comment.id} style={{ borderBottom: "1px solid var(--gray-100)", paddingBottom: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{comment.username}</div>
                      <div style={{ fontSize: 13, color: "var(--gray-600)", marginTop: 4 }}>{comment.text}</div>
                      <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 6 }}>
                        {new Date(comment.created_at).toLocaleString("en-PH")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
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
  rating: { marginLeft: 8, color: "var(--green)", fontWeight: 700, fontSize: 12 },
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
};
