import dotenv from 'dotenv';
dotenv.config();

const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'admin1234';

/**
 * Middleware to protect Admin endpoints (RBAC)
 * Verifies Authorization header bearer token or x-admin-token
 */
export function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : req.headers['x-admin-token'];

  // Check against admin secret or valid admin session token
  if (!token || (token !== ADMIN_SECRET && token !== 'ctrl-drink-admin-authorized-session')) {
    return res.status(403).json({
      success: false,
      message: 'ไม่อนุญาตให้เข้าถึง: ต้องการสิทธิ์ผู้ดูแลระบบ (Admin Access Required)'
    });
  }

  req.admin = {
    id: 'admin-001',
    role: 'admin',
    name: 'ผู้ดูแลร้าน'
  };

  next();
}
