import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dataService, supabaseAdmin } from '../config/supabase.js';
import { requireAdmin } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `slip-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowedMime.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP) เท่านั้น'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter
});

const router = express.Router();

/**
 * Public: Upload payment transfer slip for an order
 */
router.post('/orders/:orderId/slip', upload.single('slip'), async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์สลิปโอนเงิน' });
    }

    const order = await dataService.getOrderById(orderId);
    if (!order) {
      // Remove uploaded file if order doesn't exist
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'ไม่พบคำสั่งซื้อนี้' });
    }

    let slipUrl = `/uploads/${req.file.filename}`;

    // If Supabase Storage is configured, upload to Supabase Storage 'slips' bucket
    if (supabaseAdmin) {
      try {
        const fileContent = fs.readFileSync(req.file.path);
        const storagePath = `slips/${req.file.filename}`;
        const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
          .from('slips')
          .upload(storagePath, fileContent, {
            contentType: req.file.mimetype,
            upsert: true
          });

        if (!uploadErr && uploadData) {
          const { data: publicUrlData } = supabaseAdmin.storage.from('slips').getPublicUrl(storagePath);
          if (publicUrlData?.publicUrl) {
            slipUrl = publicUrlData.publicUrl;
          }
        }
      } catch (storageErr) {
        console.warn('Supabase storage upload fallback to local URL:', storageErr.message);
      }
    }

    // Update payment record and order status to 'Waiting Verification'
    const updatedPayment = await dataService.updatePaymentSlip(order.id, slipUrl);

    res.json({
      success: true,
      message: 'แนบหลักฐานการชำระเงินเรียบร้อยแล้ว เจ้าหน้าที่จะทำการตรวจสอบยอดเงิน',
      data: {
        slip_url: slipUrl,
        payment: updatedPayment
      }
    });
  } catch (error) {
    console.error('Error uploading slip:', error);
    res.status(500).json({ success: false, message: error.message || 'เกิดข้อผิดพลาดในการอัปโหลดสลิป' });
  }
});

/**
 * Admin: Approve Payment Slip
 * IMPORTANT: Manual verification by admin is mandatory before approving!
 */
router.post('/admin/:id/verify', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dataService.verifyPayment(id, {
      status: 'approved',
      adminId: req.admin.id
    });

    if (!result) {
      return res.status(404).json({ success: false, message: 'ไม่พบรายการชำระเงินนี้' });
    }

    res.json({
      success: true,
      message: 'อนุมัติการชำระเงินเรียบร้อยแล้ว คำสั่งซื้อพร้อมเข้าสู่ขั้นตอนจัดเตรียม',
      data: result
    });
  } catch (error) {
    console.error('Error approving payment:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอนุมัติการชำระเงิน' });
  }
});

/**
 * Admin: Reject Payment Slip
 */
router.post('/admin/:id/reject', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุเหตุผลในการปฏิเสธสลิป' });
    }

    const result = await dataService.verifyPayment(id, {
      status: 'rejected',
      adminId: req.admin.id,
      reason: reason.trim()
    });

    if (!result) {
      return res.status(404).json({ success: false, message: 'ไม่พบรายการชำระเงินนี้' });
    }

    res.json({
      success: true,
      message: 'ปฏิเสธสลิปเรียบร้อยแล้ว แจ้งเตือนลูกค้าเพื่อส่งหลักฐานใหม่',
      data: result
    });
  } catch (error) {
    console.error('Error rejecting payment:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการปฏิเสธการชำระเงิน' });
  }
});

export default router;
