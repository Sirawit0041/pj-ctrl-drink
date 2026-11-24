/**
 * Centralized API Service for PJ Ctrl + Drink
 */

const API_BASE = '/api';

export const api = {
  // Token management
  getAdminToken() {
    return localStorage.getItem('ctrl_drink_admin_token') || '';
  },
  setAdminToken(token) {
    if (token) localStorage.setItem('ctrl_drink_admin_token', token);
    else localStorage.removeItem('ctrl_drink_admin_token');
  },
  isAdminLoggedIn() {
    return Boolean(this.getAdminToken());
  },

  getPhoneToken(phone) {
    return sessionStorage.getItem(`ctrl_drink_phone_token_${phone}`) || '';
  },
  setPhoneToken(phone, token) {
    sessionStorage.setItem(`ctrl_drink_phone_token_${phone}`, token);
  },

  // Generic fetch wrapper
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = options.headers || {};

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const adminToken = this.getAdminToken();
    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    }

    const response = await fetch(url, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }

    return data;
  },

  // Shop Settings
  async getShopSettings() {
    const res = await this.request('/shop/settings');
    return res.data;
  },
  async updateShopSettings(updates) {
    const res = await this.request('/shop/settings', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    return res.data;
  },
  async uploadQRImage(file) {
    const formData = new FormData();
    formData.append('qr_image', file);
    const res = await this.request('/shop/upload-qr', {
      method: 'POST',
      body: formData
    });
    return res.data;
  },
  async getDashboardStats() {
    const res = await this.request('/shop/admin/stats');
    return res.data;
  },
  async getAdminLogs(limit = 50) {
    const res = await this.request(`/shop/logs?limit=${limit}`);
    return res.data;
  },

  // Categories & Products
  async getCategories() {
    const res = await this.request('/products/categories');
    return res.data;
  },
  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await this.request(`/products?${query}`);
    return res.data;
  },
  async getProduct(id) {
    const res = await this.request(`/products/${id}`);
    return res.data;
  },
  async createProduct(productData) {
    const res = await this.request('/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
    return res.data;
  },
  async updateProduct(id, updates) {
    const res = await this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    return res.data;
  },
  async deleteProduct(id) {
    const res = await this.request(`/products/${id}`, {
      method: 'DELETE'
    });
    return res;
  },

  // OTP Authentication & Verification
  async sendOTP(name, phone) {
    const res = await this.request('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ name, phone })
    });
    return res;
  },
  async verifyOTP(phone, otp_code) {
    const res = await this.request('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, otp_code })
    });
    if (res.data?.phone_token) {
      this.setPhoneToken(phone, res.data.phone_token);
    }
    return res;
  },
  async adminLogin(password) {
    const res = await this.request('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
    if (res.data?.token) {
      this.setAdminToken(res.data.token);
    }
    return res;
  },

  // Orders
  async createOrder(orderPayload) {
    const res = await this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderPayload)
    });
    return res.data;
  },
  async getOrder(id) {
    const res = await this.request(`/orders/${id}`);
    return res.data;
  },
  async getUserOrders(phone) {
    const res = await this.request(`/orders/user/${phone}`);
    return res.data;
  },
  async getAdminOrders(status = 'all') {
    const res = await this.request(`/orders/admin/list?status=${status}`);
    return res.data;
  },
  async updateOrderStatus(orderId, order_status, payment_status = null) {
    const res = await this.request(`/orders/admin/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ order_status, payment_status })
    });
    return res.data;
  },

  // Payments & Slips
  async uploadSlip(orderId, file) {
    const formData = new FormData();
    formData.append('slip', file);
    const res = await this.request(`/payments/orders/${orderId}/slip`, {
      method: 'POST',
      body: formData
    });
    return res.data;
  },
  async verifyPayment(paymentId) {
    const res = await this.request(`/payments/admin/${paymentId}/verify`, {
      method: 'POST'
    });
    return res.data;
  },
  async rejectPayment(paymentId, reason) {
    const res = await this.request(`/payments/admin/${paymentId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
    return res.data;
  }
};
