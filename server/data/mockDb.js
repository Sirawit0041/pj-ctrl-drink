import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = process.env.VERCEL ? path.join('/tmp', 'db.json') : path.join(__dirname, 'db.json');

// Default initial database state matching database/schema.sql
const initialData = {
  shop_settings: [
    {
      id: 1,
      shop_name: 'PJ Ctrl + Drink',
      shop_logo: '/assets/57853.jpg',
      is_open: true,
      closed_message: 'ขออภัย ขณะนี้ร้านปิดให้บริการแล้ว กรุณาสั่งซื้อใหม่ในเวลาทำการ (เปิด 09:00 - 20:00 น.)',
      promptpay_number: '0945174302',
      promptpay_account_name: 'PJ Ctrl + Drink (คุณผู้ดูแลร้าน)',
      updated_at: new Date().toISOString()
    }
  ],
  categories: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'เครื่องดื่ม',
      description: 'เครื่องดื่มเย็นสดชื่น นมสดแท้ และโซดาซ่าโดนใจ ชงสดใหม่ทุกแก้ว',
      created_at: new Date().toISOString()
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'ของทานเล่น',
      description: 'ของว่าง ของทานเล่นทอดและปิ้งร้อนๆ สดใหม่ กรอบอร่อยเคี้ยวเพลิน',
      created_at: new Date().toISOString()
    }
  ],
  products: [
    // หมวดนม (Milk Series)
    {
      id: 'prod-milk-01',
      category_id: '11111111-1111-1111-1111-111111111111',
      sub_category: 'milk',
      name: 'นมสด',
      description: 'นมสดแท้ 100% หอมมัน กลมกล่อม เข้มข้นเลือกระดับความหวานได้ตามใจ',
      price: 45.00,
      image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
      is_available: true,
      stock_quantity: 50,
      created_at: new Date().toISOString()
    },
    {
      id: 'prod-milk-02',
      category_id: '11111111-1111-1111-1111-111111111111',
      sub_category: 'milk',
      name: 'นมสดบราวชูก้าร์',
      description: 'นมสดหอมมันราดซอสบราวชูก้าร์เคี่ยวหอมละมุนเข้มข้น ลายสวย รสชาติหวานมัน',
      price: 55.00,
      image_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80',
      is_available: true,
      stock_quantity: 50,
      created_at: new Date().toISOString()
    },
    {
      id: 'prod-milk-03',
      category_id: '11111111-1111-1111-1111-111111111111',
      sub_category: 'milk',
      name: 'นมสดน้ำผึ้ง',
      description: 'นมสดผสมผสานน้ำผึ้งแท้ หอมหวานละมุน ชื่นใจ ดีต่อสุขภาพ',
      price: 50.00,
      image_url: 'https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?auto=format&fit=crop&w=600&q=80',
      is_available: true,
      stock_quantity: 40,
      created_at: new Date().toISOString()
    },
    {
      id: 'prod-milk-04',
      category_id: '11111111-1111-1111-1111-111111111111',
      sub_category: 'milk',
      name: 'นมโกโก้',
      description: 'ดาร์กโกโก้เข้มข้นพิเศษ ชงกับนมสดสูตรเฉพาะ เข้มถึงใจ หอมกลิ่นโกโก้แท้',
      price: 50.00,
      image_url: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=600&q=80',
      is_available: true,
      stock_quantity: 45,
      created_at: new Date().toISOString()
    },
    {
      id: 'prod-milk-05',
      category_id: '11111111-1111-1111-1111-111111111111',
      sub_category: 'milk',
      name: 'นมเผือก',
      description: 'นมสดผสมเผือกหอมเข้มข้น สีม่วงละมุน หวานมันกลมกล่อม มีเอกลักษณ์',
      price: 50.00,
      image_url: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=600&q=80',
      is_available: true,
      stock_quantity: 35,
      created_at: new Date().toISOString()
    },
    // หมวดโซดา (Soda Series)
    {
      id: 'prod-soda-01',
      category_id: '11111111-1111-1111-1111-111111111111',
      sub_category: 'soda',
      name: 'ลิ้นจี่โซดา',
      description: 'ไซรัปลิ้นจี่หวานฉ่ำ ผสมโซดาซ่าเย็นชื่นใจ ดับกระหายคลายร้อน',
      price: 45.00,
      image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
      is_available: true,
      stock_quantity: 60,
      created_at: new Date().toISOString()
    },
    {
      id: 'prod-soda-02',
      category_id: '11111111-1111-1111-1111-111111111111',
      sub_category: 'soda',
      name: 'กีวี่โซดา',
      description: 'ไซรัปกีวี่เปรี้ยวอมหวานสดชื่น เติมเต็มความกระปรี้กระเปร่าด้วยโซดาซ่า',
      price: 45.00,
      image_url: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=600&q=80',
      is_available: true,
      stock_quantity: 50,
      created_at: new Date().toISOString()
    },
    {
      id: 'prod-soda-03',
      category_id: '11111111-1111-1111-1111-111111111111',
      sub_category: 'soda',
      name: 'พีชโซดา',
      description: 'พีชหอมละมุน เปรี้ยวอมหวาน ผสมโซดาซ่าสะใจ สดชื่นคลายร้อน สดใสทุกจิบ',
      price: 45.00,
      image_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80',
      is_available: true,
      stock_quantity: 50,
      created_at: new Date().toISOString()
    },
    // หมวดของทานเล่น (Snacks)
    {
      id: 'prod-snack-01',
      category_id: '22222222-2222-2222-2222-222222222222',
      sub_category: 'snack',
      name: 'ไข่นกกระทา',
      description: 'ขนมไข่นกกระทาทอด กรอบนอกนุ่มใน ไม่อมน้ำมัน หวานมันเคี้ยวเพลิน ทอดใหม่ร้อนๆ',
      price: 40.00,
      image_url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80',
      is_available: true,
      stock_quantity: 40,
      created_at: new Date().toISOString()
    },
    {
      id: 'prod-snack-02',
      category_id: '22222222-2222-2222-2222-222222222222',
      sub_category: 'snack',
      name: 'เฟรนฟราย',
      description: 'มันฝรั่งทอดชิ้นโต คัดสรรอย่างดี กรอบนอกนุ่มใน โรยเกลือเล็กน้อย เสิร์ฟพร้อมซอส',
      price: 49.00,
      image_url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80',
      is_available: true,
      stock_quantity: 45,
      created_at: new Date().toISOString()
    },
    {
      id: 'prod-snack-03',
      category_id: '22222222-2222-2222-2222-222222222222',
      sub_category: 'snack',
      name: 'ขนมปังปิ้งเนย',
      description: 'ขนมปังแผ่นหนาปิ้งเตาถ่าน หอมเนยสดแท้ กรอบนอกนุ่มใน ชุ่มฉ่ำถึงรสชาติ',
      price: 30.00,
      image_url: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=600&q=80',
      is_available: true,
      stock_quantity: 50,
      created_at: new Date().toISOString()
    },
    {
      id: 'prod-snack-04',
      category_id: '22222222-2222-2222-2222-222222222222',
      sub_category: 'snack',
      name: 'ขนมปังปิ้งเนยนม',
      description: 'ขนมปังปิ้งทาเนยสดแท้ชุ่มฉ่ำ ราดนมข้นหวานเน้นๆ อร่อยเต็มคำฟินสุดๆ',
      price: 35.00,
      image_url: 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=600&q=80',
      is_available: true,
      stock_quantity: 50,
      created_at: new Date().toISOString()
    }
  ],
  profiles: [
    {
      id: 'admin-001',
      full_name: 'ผู้ดูแลระบบ (Admin)',
      phone: '0945174302',
      role: 'admin',
      phone_verified: true,
      created_at: new Date().toISOString()
    }
  ],
  orders: [],
  order_items: [],
  payments: [],
  admin_logs: [
    {
      id: 'log-001',
      admin_id: 'admin-001',
      action: 'SYSTEM_START',
      description: 'เริ่มต้นระบบ PJ Ctrl + Drink เรียบร้อยแล้ว',
      created_at: new Date().toISOString()
    }
  ],
  otp_verifications: []
};

class MockDatabase {
  constructor() {
    this.data = initialData;
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = { ...initialData, ...parsed };
      } else {
        this.save();
      }
    } catch (err) {
      console.warn('Could not load existing db.json, using initial state:', err.message);
      this.data = initialData;
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save db.json:', err.message);
    }
  }

  // Shop settings
  getShopSettings() {
    const settings = { ...(this.data.shop_settings[0] || initialData.shop_settings[0]) };
    
    // Auto-detect custom PromptPay QR image in public/assets if present
    const publicAssetsDir = path.join(__dirname, '../../public/assets');
    const possibleQRs = ['qr.png', 'qr.jpg', 'qr.jpeg', 'qr.webp', 'promptpay.png', 'promptpay.jpg'];
    for (const file of possibleQRs) {
      if (fs.existsSync(path.join(publicAssetsDir, file))) {
        settings.promptpay_qr_image = `/assets/${file}`;
        break;
      }
    }

    return settings;
  }

  updateShopSettings(updates) {
    const current = this.getShopSettings();
    this.data.shop_settings[0] = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.save();
    return this.data.shop_settings[0];
  }

  // Categories
  getCategories() {
    return this.data.categories;
  }

  // Products
  getProducts(filter = {}) {
    let list = [...this.data.products];
    if (filter.category_id) {
      list = list.filter(p => p.category_id === filter.category_id);
    }
    if (filter.sub_category) {
      list = list.filter(p => p.sub_category === filter.sub_category);
    }
    if (filter.availableOnly) {
      list = list.filter(p => p.is_available === true);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
    }
    return list;
  }

  getProductById(id) {
    return this.data.products.find(p => p.id === id);
  }

  createProduct(product) {
    const newProd = {
      id: `prod-${Date.now()}`,
      category_id: product.category_id,
      sub_category: product.sub_category || null,
      name: product.name,
      description: product.description || '',
      price: parseFloat(product.price) || 0,
      image_url: product.image_url || '/assets/57853.jpg',
      is_available: product.is_available !== false,
      stock_quantity: parseInt(product.stock_quantity, 10) || 50,
      created_at: new Date().toISOString()
    };
    this.data.products.push(newProd);
    this.save();
    return newProd;
  }

  updateProduct(id, updates) {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.data.products[idx] = {
      ...this.data.products[idx],
      ...updates,
      price: updates.price !== undefined ? parseFloat(updates.price) : this.data.products[idx].price,
      stock_quantity: updates.stock_quantity !== undefined ? parseInt(updates.stock_quantity, 10) : this.data.products[idx].stock_quantity,
      updated_at: new Date().toISOString()
    };
    this.save();
    return this.data.products[idx];
  }

  deleteProduct(id) {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.data.products.splice(idx, 1);
    this.save();
    return true;
  }

  // Orders
  getOrders(filter = {}) {
    let list = [...this.data.orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (filter.phone) {
      list = list.filter(o => o.customer_phone === filter.phone);
    }
    if (filter.status && filter.status !== 'all') {
      list = list.filter(o => o.order_status === filter.status);
    }
    return list;
  }

  getOrderById(id) {
    const order = this.data.orders.find(o => o.id === id || o.order_number === id);
    if (!order) return null;
    const items = this.data.order_items.filter(item => item.order_id === order.id);
    const payment = this.data.payments.find(p => p.order_id === order.id);
    return { ...order, items, payment };
  }

  createOrder(orderData, itemsData) {
    const orderId = `ord-${Date.now()}`;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `CD-${dateStr}-${randSuffix}`;

    const newOrder = {
      id: orderId,
      order_number: orderNumber,
      customer_id: orderData.customer_id || null,
      customer_name: orderData.customer_name,
      customer_phone: orderData.customer_phone,
      total_amount: parseFloat(orderData.total_amount),
      payment_status: 'pending',
      order_status: 'Pending Payment',
      note: orderData.note || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const savedItems = itemsData.map((item, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      order_id: orderId,
      product_id: item.product_id,
      product_name: item.product_name,
      unit_price: parseFloat(item.unit_price),
      quantity: parseInt(item.quantity, 10),
      sweetness_level: item.sweetness_level || 'หวานปกติ',
      subtotal: parseFloat(item.subtotal)
    }));

    // Initial payment record
    const newPayment = {
      id: `pay-${Date.now()}`,
      order_id: orderId,
      payment_method: 'PromptPay',
      amount: newOrder.total_amount,
      slip_url: null,
      verification_status: 'pending',
      verified_by: null,
      verified_at: null,
      rejection_reason: null,
      created_at: new Date().toISOString()
    };

    this.data.orders.push(newOrder);
    this.data.order_items.push(...savedItems);
    this.data.payments.push(newPayment);

    // Decrement product stock
    for (const item of savedItems) {
      const prod = this.getProductById(item.product_id);
      if (prod && prod.stock_quantity >= item.quantity) {
        this.updateProduct(item.product_id, {
          stock_quantity: prod.stock_quantity - item.quantity
        });
      }
    }

    this.save();
    return { ...newOrder, items: savedItems, payment: newPayment };
  }

  updateOrderStatus(orderId, order_status, payment_status = null) {
    const idx = this.data.orders.findIndex(o => o.id === orderId);
    if (idx === -1) return null;
    
    this.data.orders[idx].order_status = order_status;
    if (payment_status) {
      this.data.orders[idx].payment_status = payment_status;
    }
    this.data.orders[idx].updated_at = new Date().toISOString();

    this.save();
    return this.data.orders[idx];
  }

  // Payments
  getPaymentByOrderId(orderId) {
    return this.data.payments.find(p => p.order_id === orderId);
  }

  updatePaymentSlip(orderId, slipUrl) {
    const payment = this.data.payments.find(p => p.order_id === orderId);
    if (!payment) return null;

    payment.slip_url = slipUrl;
    payment.verification_status = 'waiting_verification';

    // Also update order status
    const order = this.data.orders.find(o => o.id === orderId);
    if (order) {
      order.order_status = 'Waiting Verification';
      order.payment_status = 'waiting_verification';
      order.updated_at = new Date().toISOString();
    }

    this.save();
    return payment;
  }

  verifyPayment(paymentId, { status, adminId, reason = null }) {
    const payment = this.data.payments.find(p => p.id === paymentId || p.order_id === paymentId);
    if (!payment) return null;

    payment.verification_status = status; // 'approved' or 'rejected'
    payment.verified_by = adminId || 'admin-001';
    payment.verified_at = new Date().toISOString();
    payment.rejection_reason = reason;

    const order = this.data.orders.find(o => o.id === payment.order_id);
    if (order) {
      if (status === 'approved') {
        order.order_status = 'Payment Approved';
        order.payment_status = 'approved';
      } else {
        order.order_status = 'Rejected';
        order.payment_status = 'rejected';
      }
      order.updated_at = new Date().toISOString();
    }

    this.logAdminAction(adminId || 'admin-001', 'PAYMENT_VERIFY', 
      `ตรวจสอบสลิปสำหรับออเดอร์ ${order ? order.order_number : payment.order_id}: ${status === 'approved' ? 'อนุมัติเรียบร้อย' : 'ปฏิเสธ (' + reason + ')'}`);

    this.save();
    return { payment, order };
  }

  // OTP
  createOTP(phone, code, expiresMinutes = 5) {
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000).toISOString();
    const otp = {
      id: `otp-${Date.now()}`,
      phone,
      otp_code: code,
      expires_at: expiresAt,
      is_verified: false,
      attempt_count: 0,
      created_at: new Date().toISOString()
    };
    this.data.otp_verifications.push(otp);
    this.save();
    return otp;
  }

  verifyOTP(phone, code) {
    const now = new Date();
    // Find latest OTP for this phone
    const otps = this.data.otp_verifications
      .filter(o => o.phone === phone && !o.is_verified)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (otps.length === 0) {
      return { success: false, message: 'ไม่พบคำขอ OTP หรือรหัสถูกใช้ไปแล้ว' };
    }

    const latest = otps[0];
    if (new Date(latest.expires_at) < now) {
      return { success: false, message: 'รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่' };
    }

    if (latest.attempt_count >= 3) {
      return { success: false, message: 'คุณกรอกรหัสผิดเกินจำนวนครั้งที่กำหนด กรุณาขอรหัสใหม่' };
    }

    if (latest.otp_code !== code.trim()) {
      latest.attempt_count += 1;
      this.save();
      return { success: false, message: `รหัส OTP ไม่ถูกต้อง (เหลือโอกาส ${3 - latest.attempt_count} ครั้ง)` };
    }

    latest.is_verified = true;
    this.save();
    return { success: true };
  }

  // Admin Logs
  logAdminAction(adminId, action, description) {
    const log = {
      id: `log-${Date.now()}`,
      admin_id: adminId || 'admin-001',
      action,
      description,
      created_at: new Date().toISOString()
    };
    this.data.admin_logs.unshift(log);
    // Keep max 200 logs
    if (this.data.admin_logs.length > 200) {
      this.data.admin_logs.pop();
    }
    this.save();
    return log;
  }

  getAdminLogs(limit = 50) {
    return this.data.admin_logs.slice(0, limit);
  }

  // Dashboard Stats
  getDashboardStats() {
    const today = new Date().toISOString().slice(0, 10);
    const orders = this.data.orders;

    let todaySales = 0;
    let totalSales = 0;
    let todayOrdersCount = 0;
    let pendingVerificationCount = 0;
    let activeOrdersCount = 0;

    const productSalesCount = {};

    for (const ord of orders) {
      const ordDate = ord.created_at.slice(0, 10);
      const isPaid = ['Payment Approved', 'Preparing', 'Ready', 'Completed'].includes(ord.order_status);

      if (isPaid) {
        totalSales += ord.total_amount;
        if (ordDate === today) {
          todaySales += ord.total_amount;
        }
      }

      if (ordDate === today) {
        todayOrdersCount += 1;
      }

      if (ord.order_status === 'Waiting Verification') {
        pendingVerificationCount += 1;
      }

      if (['Pending Payment', 'Waiting Verification', 'Payment Approved', 'Preparing', 'Ready'].includes(ord.order_status)) {
        activeOrdersCount += 1;
      }
    }

    // Best sellers calculation
    for (const item of this.data.order_items) {
      productSalesCount[item.product_name] = (productSalesCount[item.product_name] || 0) + item.quantity;
    }

    const bestSellers = Object.entries(productSalesCount)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return {
      todaySales,
      totalSales,
      todayOrdersCount,
      totalOrdersCount: orders.length,
      pendingVerificationCount,
      activeOrdersCount,
      bestSellers
    };
  }
}

export const db = new MockDatabase();
