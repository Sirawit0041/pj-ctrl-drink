import express from 'express';
import { dataService } from '../config/supabase.js';
import { requireAdmin } from '../middleware/auth.js';
import { validateCustomerName, validateThaiPhone } from '../utils/validator.js';
import { generatePromptPayQR } from '../utils/promptpay.js';

const router = express.Router();

// Memory store for verified phone tokens (5 minutes validity)
export const verifiedPhoneTokens = new Map();

/**
 * Public: Create a new order
 * Security & Anti-tampering:
 * 1. Verifies shop is currently OPEN
 * 2. Validates customer name (no fake names, no all-digits, no abnormal repeats)
 * 3. Validates phone format (10-digit Thai mobile)
 * 4. Checks phone verification token (OTP must have been verified!)
 * 5. Calculates total price server-side using current DB prices to prevent tampering!
 * 6. Generates EMVCo PromptPay QR Code dynamically
 */
router.post('/', async (req, res) => {
  try {
    // 1. Verify shop status
    const shopSettings = await dataService.getShopSettings();
    if (!shopSettings.is_open) {
      return res.status(400).json({
        success: false,
        message: shopSettings.closed_message || 'ขออภัย ขณะนี้ร้านปิดให้บริการแล้ว ไม่สามารถรับคำสั่งซื้อใหม่ได้'
      });
    }

    const { customer_name, customer_phone, phone_token, items, note } = req.body;

    // 2. Validate customer name
    const nameCheck = validateCustomerName(customer_name);
    if (!nameCheck.valid) {
      return res.status(400).json({ success: false, message: nameCheck.message });
    }

    // 3. Validate Thai phone number
    const phoneCheck = validateThaiPhone(customer_phone);
    if (!phoneCheck.valid) {
      return res.status(400).json({ success: false, message: phoneCheck.message });
    }
    const cleanPhone = phoneCheck.phone;

    // 4. Validate OTP verification token
    const tokenRecord = verifiedPhoneTokens.get(cleanPhone);
    if (!tokenRecord || tokenRecord.token !== phone_token || tokenRecord.expiresAt < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'กรุณายืนยันเบอร์โทรศัพท์ด้วยรหัส OTP ให้เรียบร้อยก่อนทำการสั่งซื้อ'
      });
    }

    // 5. Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกสินค้าอย่างน้อย 1 รายการ' });
    }

    // 6. Calculate pricing SERVER-SIDE to prevent client-side tampering
    let calculatedTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const quantity = parseInt(item.quantity, 10);
      if (isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ success: false, message: 'จำนวนสินค้าต้องมากกว่า 0' });
      }

      const product = await dataService.getProductById(item.product_id);
      if (!product) {
        return res.status(400).json({ success: false, message: `ไม่พบสินค้า ID: ${item.product_id}` });
      }

      if (!product.is_available) {
        return res.status(400).json({ success: false, message: `สินค้า "${product.name}" ปิดการขายชั่วคราว` });
      }

      if (product.stock_quantity < quantity) {
        return res.status(400).json({ success: false, message: `สินค้า "${product.name}" มีจำนวนในสต็อกไม่เพียงพอ (เหลือ ${product.stock_quantity} ชิ้น)` });
      }

      const unitPrice = parseFloat(product.price);
      const subtotal = Math.round(unitPrice * quantity * 100) / 100;
      calculatedTotal += subtotal;

      validatedItems.push({
        product_id: product.id,
        product_name: product.name,
        unit_price: unitPrice,
        quantity,
        sweetness_level: item.sweetness_level || 'หวานปกติ',
        subtotal
      });
    }

    calculatedTotal = Math.round(calculatedTotal * 100) / 100;

    // 7. Create Order in Database
    const order = await dataService.createOrder({
      customer_name: nameCheck.sanitized,
      customer_phone: cleanPhone,
      total_amount: calculatedTotal,
      note: (note || '').trim()
    }, validatedItems);

    // 8. Generate PromptPay QR Code or use custom Shop QR Image
    const promptpayNumber = shopSettings.promptpay_number || '0945174302';
    let qrDataUrl = shopSettings.promptpay_qr_image || null;
    let payload = '';

    if (!qrDataUrl) {
      const generated = await generatePromptPayQR(promptpayNumber, calculatedTotal);
      qrDataUrl = generated.qrDataUrl;
      payload = generated.payload;
    }

    res.status(201).json({
      success: true,
      message: 'สร้างคำสั่งซื้อสำเร็จ',
      data: {
        order,
        promptpay: {
          number: promptpayNumber,
          account_name: shopSettings.promptpay_account_name || 'PJ Ctrl + Drink',
          amount: calculatedTotal,
          qrDataUrl,
          payload,
          isCustomImage: Boolean(shopSettings.promptpay_qr_image)
        }
      }
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ: ' + error.message });
  }
});

// Public: Get Order Details by ID or Order Number
router.get('/:id', async (req, res) => {
  try {
    const order = await dataService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'ไม่พบคำสั่งซื้อนี้' });
    }

    const shopSettings = await dataService.getShopSettings();
    const promptpayNumber = shopSettings.promptpay_number || '0945174302';
    let qrDataUrl = shopSettings.promptpay_qr_image || null;

    if (!qrDataUrl) {
      const generated = await generatePromptPayQR(promptpayNumber, order.total_amount);
      qrDataUrl = generated.qrDataUrl;
    }

    res.json({
      success: true,
      data: {
        ...order,
        promptpay: {
          number: promptpayNumber,
          account_name: shopSettings.promptpay_account_name || 'PJ Ctrl + Drink',
          amount: order.total_amount,
          qrDataUrl,
          isCustomImage: Boolean(shopSettings.promptpay_qr_image)
        }
      }
    });
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลคำสั่งซื้อ' });
  }
});

// Public: Get orders for specific phone number (User order history)
router.get('/user/:phone', async (req, res) => {
  try {
    const phoneCheck = validateThaiPhone(req.params.phone);
    if (!phoneCheck.valid) {
      return res.status(400).json({ success: false, message: phoneCheck.message });
    }

    const orders = await dataService.getOrders({ phone: phoneCheck.phone });
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงประวัติคำสั่งซื้อ' });
  }
});

// Admin: Get all orders with filter
router.get('/admin/list', requireAdmin, async (req, res) => {
  try {
    const { status, phone } = req.query;
    const orders = await dataService.getOrders({ status, phone });
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงรายการคำสั่งซื้อ' });
  }
});

// Admin: Update order status
router.put('/admin/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { order_status, payment_status } = req.body;

    const validStatuses = [
      'Pending Payment',
      'Waiting Verification',
      'Payment Approved',
      'Preparing',
      'Ready',
      'Completed',
      'Rejected',
      'Cancelled'
    ];

    if (!validStatuses.includes(order_status)) {
      return res.status(400).json({ success: false, message: 'สถานะคำสั่งซื้อไม่ถูกต้อง' });
    }

    const updated = await dataService.updateOrderStatus(id, order_status, payment_status);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'ไม่พบคำสั่งซื้อ' });
    }

    await dataService.logAdminAction(req.admin.id, 'ORDER_STATUS_UPDATE', `อัปเดตสถานะออเดอร์ ${updated.order_number} เป็น "${order_status}"`);

    res.json({ success: true, message: 'อัปเดตสถานะคำสั่งซื้อสำเร็จ', data: updated });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะคำสั่งซื้อ' });
  }
});

export default router;
