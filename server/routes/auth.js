import express from 'express';
import crypto from 'crypto';
import { dataService } from '../config/supabase.js';
import { validateCustomerName, validateThaiPhone, formatPhone } from '../utils/validator.js';
import { verifiedPhoneTokens } from './orders.js';

const router = express.Router();
const ADMIN_PASSWORD = process.env.ADMIN_SECRET_KEY || 'admin1234';

/**
 * Public: Request OTP for phone verification
 * Anti-fake check: validates name & Thai mobile format before issuing OTP
 */
router.post('/otp/send', async (req, res) => {
  try {
    const { name, phone } = req.body;

    const nameCheck = validateCustomerName(name);
    if (!nameCheck.valid) {
      return res.status(400).json({ success: false, message: nameCheck.message });
    }

    const phoneCheck = validateThaiPhone(phone);
    if (!phoneCheck.valid) {
      return res.status(400).json({ success: false, message: phoneCheck.message });
    }

    const cleanPhone = phoneCheck.phone;

    // Generate random 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const refCode = crypto.randomBytes(2).toString('hex').toUpperCase();

    await dataService.createOTP(cleanPhone, otpCode);

    res.json({
      success: true,
      message: `ส่งรหัส OTP ไปยังเบอร์ ${formatPhone(cleanPhone, true)} แล้ว (รหัสอ้างอิง: ${refCode})`,
      data: {
        ref: refCode,
        phone: formatPhone(cleanPhone, true),
        // For convenience and real-time testing, return simulated OTP in response
        simulatedOtp: otpCode,
        expiresInSeconds: 300
      }
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการส่งรหัส OTP' });
  }
});

/**
 * Public: Verify OTP Code
 */
router.post('/otp/verify', async (req, res) => {
  try {
    const { phone, otp_code } = req.body;

    const phoneCheck = validateThaiPhone(phone);
    if (!phoneCheck.valid) {
      return res.status(400).json({ success: false, message: phoneCheck.message });
    }

    if (!otp_code || otp_code.trim().length !== 6) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกรหัส OTP ให้ครบ 6 หลัก' });
    }

    const result = await dataService.verifyOTP(phoneCheck.phone, otp_code.trim());

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    // Issue signed phone verification token valid for 15 minutes
    const token = crypto.randomBytes(24).toString('hex');
    verifiedPhoneTokens.set(phoneCheck.phone, {
      token,
      phone: phoneCheck.phone,
      verifiedAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000
    });

    res.json({
      success: true,
      message: 'ยืนยันเบอร์โทรศัพท์สำเร็จ คุณสามารถดำเนินการสั่งซื้อได้ทันที',
      data: {
        verified: true,
        phone: phoneCheck.phone,
        phone_token: token
      }
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบ OTP' });
  }
});

/**
 * Admin Login
 */
router.post('/admin-login', (req, res) => {
  const { password } = req.body;

  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      success: false,
      message: 'รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง'
    });
  }

  // Issue session token
  res.json({
    success: true,
    message: 'เข้าสู่ระบบผู้ดูแลสำเร็จ',
    data: {
      token: ADMIN_PASSWORD,
      user: {
        id: 'admin-001',
        role: 'admin',
        name: 'ผู้ดูแลร้าน'
      }
    }
  });
});

export default router;
