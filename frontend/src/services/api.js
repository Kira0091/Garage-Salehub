// src/services/api.js
const BASE_URL = "http://localhost:5000/api";

const getHeaders = (json = true) => {
  const token = localStorage.getItem("token");
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const withCredentials = (options = {}) => ({
  credentials: "include",
  ...options,
});

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
};

// Auth
export const authAPI = {
  register: (body) =>
    fetch(`${BASE_URL}/auth/register`, withCredentials({ method: "POST", headers: getHeaders(), body: JSON.stringify(body) })).then(handleResponse),
  login: (body) =>
    fetch(`${BASE_URL}/auth/login`, withCredentials({ method: "POST", headers: getHeaders(), body: JSON.stringify(body) })).then(handleResponse),
  me: () =>
    fetch(`${BASE_URL}/auth/me`, withCredentials({ headers: getHeaders() })).then(handleResponse),
  updateMe: (body) =>
    fetch(`${BASE_URL}/auth/me`, withCredentials({ method: "PUT", headers: getHeaders(), body: JSON.stringify(body) })).then(handleResponse),
  logout: () =>
    fetch(`${BASE_URL}/auth/logout`, withCredentials({ method: "POST", headers: getHeaders() })).then(handleResponse),
};

// Products
export const productsAPI = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetch(`${BASE_URL}/products/?${qs}`, withCredentials({ headers: getHeaders() })).then(handleResponse);
  },
  getOne: (id) =>
    fetch(`${BASE_URL}/products/${id}`, withCredentials({ headers: getHeaders() })).then(handleResponse),
  create: (formData) =>
    fetch(`${BASE_URL}/products/`, withCredentials({
      method: "POST",
      headers: getHeaders(false),
      body: formData,
    })).then(handleResponse),
  update: (id, body) =>
    fetch(`${BASE_URL}/products/${id}`, withCredentials({ method: "PUT", headers: getHeaders(), body: JSON.stringify(body) })).then(handleResponse),
  delete: (id) =>
    fetch(`${BASE_URL}/products/${id}`, withCredentials({ method: "DELETE", headers: getHeaders() })).then(handleResponse),
  myProducts: () =>
    fetch(`${BASE_URL}/products/my`, withCredentials({ headers: getHeaders() })).then(handleResponse),
  categories: () =>
    fetch(`${BASE_URL}/products/categories`, withCredentials({ headers: getHeaders() })).then(handleResponse),
  createCategory: (body) =>
    fetch(`${BASE_URL}/products/categories`, withCredentials({ method: "POST", headers: getHeaders(), body: JSON.stringify(body) })).then(handleResponse),
  imageUrl: (filename) => `${BASE_URL}/products/images/${filename}`,
};

// Orders
export const ordersAPI = {
  create: (body) =>
    fetch(`${BASE_URL}/orders/`, withCredentials({ method: "POST", headers: getHeaders(), body: JSON.stringify(body) })).then(handleResponse),
  getAll: () =>
    fetch(`${BASE_URL}/orders/`, withCredentials({ headers: getHeaders() })).then(handleResponse),
  getOne: (id) =>
    fetch(`${BASE_URL}/orders/${id}`, withCredentials({ headers: getHeaders() })).then(handleResponse),
  pay: (id, body) =>
    fetch(`${BASE_URL}/orders/${id}/pay`, withCredentials({ method: "POST", headers: getHeaders(), body: JSON.stringify(body) })).then(handleResponse),
  updateStatus: (id, body) =>
    fetch(`${BASE_URL}/orders/${id}/status`, withCredentials({ method: "PUT", headers: getHeaders(), body: JSON.stringify(body) })).then(handleResponse),
  cancel: (id) =>
    fetch(`${BASE_URL}/orders/${id}/cancel`, withCredentials({ method: "POST", headers: getHeaders() })).then(handleResponse),
};

// Chat (seller <-> admin only)
export const chatAPI = {
  send: (body) =>
    fetch(`${BASE_URL}/chat/`, withCredentials({ method: "POST", headers: getHeaders(), body: JSON.stringify(body) })).then(handleResponse),

  sendWithFiles: (formData) =>
    fetch(`${BASE_URL}/chat/`, withCredentials({
      method: "POST",
      headers: getHeaders(false),
      body: formData,
    })).then(handleResponse),

  conversations: () =>
    fetch(`${BASE_URL}/chat/conversations`, withCredentials({ headers: getHeaders() })).then(handleResponse),

  messages: (partnerId) =>
    fetch(`${BASE_URL}/chat/${partnerId}`, withCredentials({ headers: getHeaders() })).then(handleResponse),

  getAdminId: () =>
    fetch(`${BASE_URL}/chat/admin-id`, withCredentials({ headers: getHeaders() })).then(handleResponse),

  attachmentUrl: (filename) => `${BASE_URL}/chat/attachments/${filename}`,
};

// Wishlist
export const wishlistAPI = {
  getAll: () =>
    fetch(`${BASE_URL}/wishlist/`, withCredentials({ headers: getHeaders() })).then(handleResponse),
  add: (body) =>
    fetch(`${BASE_URL}/wishlist/`, withCredentials({ method: "POST", headers: getHeaders(), body: JSON.stringify(body) })).then(handleResponse),
  remove: (productId) =>
    fetch(`${BASE_URL}/wishlist/${productId}`, withCredentials({ method: "DELETE", headers: getHeaders() })).then(handleResponse),
};

// Notifications
export const notificationsAPI = {
  getAll: () =>
    fetch(`${BASE_URL}/notifications/`, withCredentials({ headers: getHeaders() })).then(handleResponse),
  markRead: (id) =>
    fetch(`${BASE_URL}/notifications/${id}/read`, withCredentials({ method: "PUT", headers: getHeaders() })).then(handleResponse),
  markAllRead: () =>
    fetch(`${BASE_URL}/notifications/read-all`, withCredentials({ method: "PUT", headers: getHeaders() })).then(handleResponse),
};

// Reviews
export const reviewsAPI = {
  create: (body) =>
    fetch(`${BASE_URL}/reviews/`, withCredentials({ method: "POST", headers: getHeaders(), body: JSON.stringify(body) })).then(handleResponse),
  seller: (sellerId) =>
    fetch(`${BASE_URL}/reviews/seller/${sellerId}`).then(handleResponse),
  mine: () =>
    fetch(`${BASE_URL}/reviews/me`, withCredentials({ headers: getHeaders() })).then(handleResponse),
};

// User analytics
export const usersAPI = {
  analytics: () =>
    fetch(`${BASE_URL}/users/me/analytics`, withCredentials({ headers: getHeaders() })).then(handleResponse),
};

// Admin
export const adminAPI = {
  dashboard: () =>
    fetch(`${BASE_URL}/admin/dashboard`, withCredentials({ headers: getHeaders() })).then(handleResponse),
  pendingProducts: () =>
    fetch(`${BASE_URL}/admin/products/pending`, withCredentials({ headers: getHeaders() })).then(handleResponse),
  inventoryProducts: () =>
    fetch(`${BASE_URL}/admin/products/inventory`, withCredentials({ headers: getHeaders() })).then(handleResponse),
  approveProduct: (id, body = {}) =>
    fetch(`${BASE_URL}/admin/products/${id}/approve`, withCredentials({ method: "POST", headers: getHeaders(), body: JSON.stringify(body) })).then(handleResponse),
  releaseProduct: (id) =>
    fetch(`${BASE_URL}/admin/products/${id}/release`, withCredentials({ method: "POST", headers: getHeaders() })).then(handleResponse),
  moveToInventory: (id) =>
    fetch(`${BASE_URL}/admin/products/${id}/to-inventory`, withCredentials({ method: "POST", headers: getHeaders() })).then(handleResponse),
  rejectProduct: (id, body = {}) =>
    fetch(`${BASE_URL}/admin/products/${id}/reject`, withCredentials({ method: "POST", headers: getHeaders(), body: JSON.stringify(body) })).then(handleResponse),
  getUsers: () =>
    fetch(`${BASE_URL}/admin/users`, withCredentials({ headers: getHeaders() })).then(handleResponse),
  getAllOrders: () =>
    fetch(`${BASE_URL}/orders/`, withCredentials({ headers: getHeaders() })).then(handleResponse),
};
