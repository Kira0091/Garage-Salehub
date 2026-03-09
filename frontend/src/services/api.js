// src/services/api.js
const BASE_URL = "http://localhost:5000/api";

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
};

// Auth
export const authAPI = {
  register: (body) =>
    fetch(`${BASE_URL}/auth/register`, { method: "POST", headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),
  login: (body) =>
    fetch(`${BASE_URL}/auth/login`, { method: "POST", headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),
  me: () =>
    fetch(`${BASE_URL}/auth/me`, { headers: getHeaders() }).then(handleResponse),
  updateMe: (body) =>
    fetch(`${BASE_URL}/auth/me`, { method: "PUT", headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),
};

// Products
export const productsAPI = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetch(`${BASE_URL}/products/?${qs}`, { headers: getHeaders() }).then(handleResponse);
  },
  getOne: (id) =>
    fetch(`${BASE_URL}/products/${id}`, { headers: getHeaders() }).then(handleResponse),
  create: (formData) =>
    fetch(`${BASE_URL}/products/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: formData,
    }).then(handleResponse),
  update: (id, body) =>
    fetch(`${BASE_URL}/products/${id}`, { method: "PUT", headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),
  delete: (id) =>
    fetch(`${BASE_URL}/products/${id}`, { method: "DELETE", headers: getHeaders() }).then(handleResponse),
  myProducts: () =>
    fetch(`${BASE_URL}/products/my`, { headers: getHeaders() }).then(handleResponse),
  categories: () =>
    fetch(`${BASE_URL}/products/categories`, { headers: getHeaders() }).then(handleResponse),
  createCategory: (body) =>
    fetch(`${BASE_URL}/products/categories`, { method: "POST", headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),
  imageUrl: (filename) => `${BASE_URL}/products/images/${filename}`,
};

// Orders
export const ordersAPI = {
  create: (body) =>
    fetch(`${BASE_URL}/orders/`, { method: "POST", headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),
  getAll: () =>
    fetch(`${BASE_URL}/orders/`, { headers: getHeaders() }).then(handleResponse),
  getOne: (id) =>
    fetch(`${BASE_URL}/orders/${id}`, { headers: getHeaders() }).then(handleResponse),
  pay: (id, body) =>
    fetch(`${BASE_URL}/orders/${id}/pay`, { method: "POST", headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),
  updateStatus: (id, body) =>
    fetch(`${BASE_URL}/orders/${id}/status`, { method: "PUT", headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),
  cancel: (id) =>
    fetch(`${BASE_URL}/orders/${id}/cancel`, { method: "POST", headers: getHeaders() }).then(handleResponse),
};

// Chat (seller <-> admin only)
export const chatAPI = {
  send: (body) =>
    fetch(`${BASE_URL}/chat/`, { method: "POST", headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),

  sendWithFiles: (formData) =>
    fetch(`${BASE_URL}/chat/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: formData,
    }).then(handleResponse),

  conversations: () =>
    fetch(`${BASE_URL}/chat/conversations`, { headers: getHeaders() }).then(handleResponse),

  messages: (partnerId) =>
    fetch(`${BASE_URL}/chat/${partnerId}`, { headers: getHeaders() }).then(handleResponse),

  getAdminId: () =>
    fetch(`${BASE_URL}/chat/admin-id`, { headers: getHeaders() }).then(handleResponse),

  attachmentUrl: (filename) => `${BASE_URL}/chat/attachments/${filename}`,
};

// Admin
export const adminAPI = {
  dashboard: () =>
    fetch(`${BASE_URL}/admin/dashboard`, { headers: getHeaders() }).then(handleResponse),
  pendingProducts: () =>
    fetch(`${BASE_URL}/admin/products/pending`, { headers: getHeaders() }).then(handleResponse),
  approveProduct: (id, body = {}) =>
    fetch(`${BASE_URL}/admin/products/${id}/approve`, { method: "POST", headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),
  rejectProduct: (id, body = {}) =>
    fetch(`${BASE_URL}/admin/products/${id}/reject`, { method: "POST", headers: getHeaders(), body: JSON.stringify(body) }).then(handleResponse),
  getUsers: () =>
    fetch(`${BASE_URL}/admin/users`, { headers: getHeaders() }).then(handleResponse),
  getAllOrders: () =>
    fetch(`${BASE_URL}/orders/`, { headers: getHeaders() }).then(handleResponse),
};
