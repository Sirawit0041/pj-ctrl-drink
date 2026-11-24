import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { db } from '../data/mockDb.js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseUrl.startsWith('http') && 
  (supabaseServiceRoleKey || supabaseAnonKey)
);

let supabaseClient = null;
let supabaseAdmin = null;

if (isSupabaseConfigured) {
  try {
    if (supabaseAnonKey) {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false }
      });
    }

    if (supabaseServiceRoleKey) {
      // Admin client with service role key - STRICTLY SERVER-SIDE ONLY
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    }
    console.log('✅ Supabase client initialized successfully.');
  } catch (error) {
    console.warn('⚠️ Failed to initialize Supabase client, running in local database fallback mode:', error.message);
  }
} else {
  console.log('ℹ️ Running in Local Persistent Database mode (db.json). To connect Supabase, configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
}

export { supabaseClient, supabaseAdmin };

/**
 * Universal Data Access Layer
 * Automatically delegates to Supabase if configured, otherwise uses local db
 */
export const dataService = {
  // Shop Settings
  async getShopSettings() {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from('shop_settings').select('*').eq('id', 1).single();
        if (!error && data) return data;
      } catch (e) {
        console.warn('Supabase getShopSettings fallback:', e.message);
      }
    }
    return db.getShopSettings();
  },

  async updateShopSettings(updates) {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from('shop_settings')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', 1)
          .select()
          .single();
        if (!error && data) {
          db.updateShopSettings(updates);
          return data;
        }
      } catch (e) {
        console.warn('Supabase updateShopSettings fallback:', e.message);
      }
    }
    return db.updateShopSettings(updates);
  },

  // Categories
  async getCategories() {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from('categories').select('*').order('name');
        if (!error && data && data.length > 0) return data;
      } catch (e) {
        console.warn('Supabase getCategories fallback:', e.message);
      }
    }
    return db.getCategories();
  },

  // Products
  async getProducts(filter = {}) {
    if (supabaseAdmin) {
      try {
        let query = supabaseAdmin.from('products').select('*');
        if (filter.category_id) query = query.eq('category_id', filter.category_id);
        if (filter.sub_category) query = query.eq('sub_category', filter.sub_category);
        if (filter.availableOnly) query = query.eq('is_available', true);
        if (filter.search) query = query.ilike('name', `%${filter.search}%`);
        
        const { data, error } = await query.order('created_at', { ascending: true });
        if (!error && data && data.length > 0) return data;
      } catch (e) {
        console.warn('Supabase getProducts fallback:', e.message);
      }
    }
    return db.getProducts(filter);
  },

  async getProductById(id) {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from('products').select('*').eq('id', id).single();
        if (!error && data) return data;
      } catch (e) {
        console.warn('Supabase getProductById fallback:', e.message);
      }
    }
    return db.getProductById(id);
  },

  async createProduct(product) {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from('products').insert([product]).select().single();
        if (!error && data) {
          db.createProduct(product);
          return data;
        }
      } catch (e) {
        console.warn('Supabase createProduct fallback:', e.message);
      }
    }
    return db.createProduct(product);
  },

  async updateProduct(id, updates) {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from('products')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (!error && data) {
          db.updateProduct(id, updates);
          return data;
        }
      } catch (e) {
        console.warn('Supabase updateProduct fallback:', e.message);
      }
    }
    return db.updateProduct(id, updates);
  },

  async deleteProduct(id) {
    if (supabaseAdmin) {
      try {
        const { error } = await supabaseAdmin.from('products').delete().eq('id', id);
        if (!error) {
          db.deleteProduct(id);
          return true;
        }
      } catch (e) {
        console.warn('Supabase deleteProduct fallback:', e.message);
      }
    }
    return db.deleteProduct(id);
  },

  // Orders
  async getOrders(filter = {}) {
    if (supabaseAdmin) {
      try {
        let query = supabaseAdmin.from('orders').select(`
          *,
          order_items (*),
          payments (*)
        `).order('created_at', { ascending: false });

        if (filter.phone) query = query.eq('customer_phone', filter.phone);
        if (filter.status && filter.status !== 'all') query = query.eq('order_status', filter.status);

        const { data, error } = await query;
        if (!error && data) {
          return data.map(o => ({
            ...o,
            items: o.order_items || [],
            payment: o.payments?.[0] || null
          }));
        }
      } catch (e) {
        console.warn('Supabase getOrders fallback:', e.message);
      }
    }
    return db.getOrders(filter);
  },

  async getOrderById(id) {
    if (supabaseAdmin) {
      try {
        const { data: order, error } = await supabaseAdmin.from('orders')
          .select(`*, order_items (*), payments (*)`)
          .or(`id.eq.${id},order_number.eq.${id}`)
          .single();

        if (!error && order) {
          return {
            ...order,
            items: order.order_items || [],
            payment: order.payments?.[0] || null
          };
        }
      } catch (e) {
        console.warn('Supabase getOrderById fallback:', e.message);
      }
    }
    return db.getOrderById(id);
  },

  async createOrder(orderData, itemsData) {
    return db.createOrder(orderData, itemsData);
  },

  async updateOrderStatus(orderId, order_status, payment_status = null) {
    if (supabaseAdmin) {
      try {
        const updates = { order_status, updated_at: new Date().toISOString() };
        if (payment_status) updates.payment_status = payment_status;
        await supabaseAdmin.from('orders').update(updates).eq('id', orderId);
      } catch (e) {
        console.warn('Supabase updateOrderStatus fallback:', e.message);
      }
    }
    return db.updateOrderStatus(orderId, order_status, payment_status);
  },

  // Payments & Slips
  async updatePaymentSlip(orderId, slipUrl) {
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('payments').update({
          slip_url: slipUrl,
          verification_status: 'waiting_verification'
        }).eq('order_id', orderId);

        await supabaseAdmin.from('orders').update({
          order_status: 'Waiting Verification',
          payment_status: 'waiting_verification',
          updated_at: new Date().toISOString()
        }).eq('id', orderId);
      } catch (e) {
        console.warn('Supabase updatePaymentSlip fallback:', e.message);
      }
    }
    return db.updatePaymentSlip(orderId, slipUrl);
  },

  async verifyPayment(paymentId, options) {
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('payments').update({
          verification_status: options.status,
          verified_by: options.adminId || null,
          verified_at: new Date().toISOString(),
          rejection_reason: options.reason || null
        }).or(`id.eq.${paymentId},order_id.eq.${paymentId}`);
      } catch (e) {
        console.warn('Supabase verifyPayment fallback:', e.message);
      }
    }
    return db.verifyPayment(paymentId, options);
  },

  // OTP
  async createOTP(phone, code) {
    return db.createOTP(phone, code);
  },

  async verifyOTP(phone, code) {
    return db.verifyOTP(phone, code);
  },

  // Logs
  async logAdminAction(adminId, action, description) {
    return db.logAdminAction(adminId, action, description);
  },

  async getAdminLogs(limit = 50) {
    return db.getAdminLogs(limit);
  },

  // Stats
  async getDashboardStats() {
    return db.getDashboardStats();
  }
};
