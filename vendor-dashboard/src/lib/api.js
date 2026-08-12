const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function authHeaders() {
  const token = localStorage.getItem('vendor_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (${res.status})`);
  }

  return res.json();
}

export const api = {
  requestOtp: (phone) =>
    request('/api/auth/request-otp', { method: 'POST', body: JSON.stringify({ phone }) }),

  verifyOtp: (phone, code) =>
    request('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, code }) }),

  getOrders: () => request('/api/orders'),
  getGroups: () => request('/api/groups'),
  getProducts: () => request('/api/products'),
  addProduct: (product) =>
    request('/api/products', { method: 'POST', body: JSON.stringify(product) }),
  updateProduct: (id, updates) =>
    request(`/api/products/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
};