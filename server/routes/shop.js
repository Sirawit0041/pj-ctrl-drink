import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dataService } from '../config/supabase.js';
import { requireAdmin } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetsDir = process.env.VERCEL ? path.join('/tmp', 'assets') : path.join(__dirname, '../../public/assets');

try {
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
} catch (e) {
  // Suppress read-only filesystem errors in serverless environments
}

const qrStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, assetsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `qr${ext}`);
  }
});

const uploadQR = multer({
  storage: qrStorage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const router = express.Router();

// Public: Get shop settings (open status, promptpay info, shop name, etc.)
router.get('/settings', async (req, res) => {
  try {
    const settings = await dataService.getShopSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching shop settings:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลร้านค้า' });
  }
});

// Admin: Upload custom PromptPay QR Code Image
router.post('/upload-qr', requireAdmin, uploadQR.single('qr_image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์รูปภาพ QR Code' });
    }

    const qrImageUrl = `/assets/${req.file.filename}`;
    const updated = await dataService.updateShopSettings({
      promptpay_qr_image: qrImageUrl
    });

    await dataService.logAdminAction(
      req.admin.id,
      'QR_IMAGE_UPDATE',
      `อัปเดตรูปภาพ PromptPay QR Code ของร้านเป็น: ${qrImageUrl}`
    );

    res.json({
      success: true,
      message: 'อัปเดตรูปภาพ QR Code ของร้านเรียบร้อยแล้ว',
      data: {
        promptpay_qr_image: qrImageUrl,
        shopSettings: updated
      }
    });
  } catch (error) {
    console.error('Error uploading QR image:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปโหลดรูป QR Code: ' + error.message });
  }
});

// Admin: Update shop settings (Open/Close store, PromptPay number, name, message)
router.put('/settings', requireAdmin, async (req, res) => {
  try {
    const { shop_name, shop_logo, is_open, closed_message, promptpay_number, promptpay_account_name } = req.body;

    const updates = {};
    if (shop_name !== undefined) updates.shop_name = shop_name.trim();
    if (shop_logo !== undefined) updates.shop_logo = shop_logo.trim();
    if (is_open !== undefined) updates.is_open = Boolean(is_open);
    if (closed_message !== undefined) updates.closed_message = closed_message.trim();
    if (promptpay_number !== undefined) updates.promptpay_number = promptpay_number.replace(/[^0-9]/g, '');
    if (promptpay_account_name !== undefined) updates.promptpay_account_name = promptpay_account_name.trim();

    const updated = await dataService.updateShopSettings(updates);

    await dataService.logAdminAction(
      req.admin.id,
      'SHOP_SETTINGS_UPDATE',
      `อัปเดตข้อมูลร้านค้า (สถานะร้าน: ${updated.is_open ? 'เปิด' : 'ปิด'})`
    );

    res.json({
      success: true,
      message: 'อัปเดตการตั้งค่าร้านค้าเรียบร้อยแล้ว',
      data: updated
    });
  } catch (error) {
    console.error('Error updating shop settings:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลร้านค้า' });
  }
});

// Admin: Get Dashboard Stats
router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await dataService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ' });
  }
});

// Admin: Get Admin Audit Logs
router.get('/logs', requireAdmin, async (req, res) => {
  try {
    const logs = await dataService.getAdminLogs(req.query.limit ? parseInt(req.query.limit, 10) : 50);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงประวัติการทำงาน' });
  }
});

export default router;
