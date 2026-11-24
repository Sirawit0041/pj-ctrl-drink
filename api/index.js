import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import productsRouter from '../server/routes/products.js';
import ordersRouter from '../server/routes/orders.js';
import paymentsRouter from '../server/routes/payments.js';
import shopRouter from '../server/routes/shop.js';
import authRouter from '../server/routes/auth.js';

dotenv.config();

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount all API routes
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/shop', shopRouter);
app.use('/api/auth', authRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

export default app;
