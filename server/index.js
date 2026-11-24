import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import paymentsRouter from './routes/payments.js';
import shopRouter from './routes/shop.js';
import authRouter from './routes/auth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Allow CDN resources (Tailwind, FontAwesome, Google Fonts)
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Assets
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// General API Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // limit each IP to 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'คำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง' }
});
app.use('/api/', apiLimiter);

// Stricter Rate Limiter for Order Creation to prevent spam
const orderLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 15, // max 15 order creation attempts per 5 mins
  message: { success: false, message: 'คุณสั่งซื้อถี่เกินไป กรุณารอ 5 นาที' }
});
app.use('/api/orders', orderLimiter);

// Stricter Rate Limiter for OTP Requests
const otpLimiter = rateLimit({
  windowMs: 3 * 60 * 1000, // 3 minutes
  max: 10,
  message: { success: false, message: 'ขอรหัส OTP ถี่เกินไป กรุณารอสักครู่' }
});
app.use('/api/auth/otp', otpLimiter);

// API Routes
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/shop', shopRouter);
app.use('/api/auth', authRouter);

// Fallback to index.html for SPA client navigation
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/assets')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Centralized Error Handling
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
  });
});

if (process.env.VERCEL !== '1' && !process.env.VERCEL_ENV) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 PJ Ctrl + Drink Web Application Server Started`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=======================================================`);
  });
}

export default app;
