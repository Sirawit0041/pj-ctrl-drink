import express from 'express';
import { dataService } from '../config/supabase.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public: Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await dataService.getCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่' });
  }
});

// Public: Get all products (with optional category and search filter)
router.get('/', async (req, res) => {
  try {
    const { category_id, sub_category, search, availableOnly } = req.query;
    const products = await dataService.getProducts({
      category_id,
      sub_category,
      search,
      availableOnly: availableOnly === 'true'
    });
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า' });
  }
});

// Public: Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await dataService.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'ไม่พบสินค้านี้' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า' });
  }
});

// Admin: Create product
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, category_id, sub_category, description, price, image_url, is_available, stock_quantity } = req.body;

    if (!name || !price || !category_id) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อสินค้า ราคา และเลือกหมวดหมู่' });
    }

    const newProduct = await dataService.createProduct({
      name: name.trim(),
      category_id,
      sub_category: sub_category || null,
      description: description?.trim() || '',
      price: parseFloat(price),
      image_url: image_url || '/assets/57853.jpg',
      is_available: is_available !== false,
      stock_quantity: parseInt(stock_quantity, 10) || 50
    });

    await dataService.logAdminAction(req.admin.id, 'PRODUCT_CREATE', `เพิ่มสินค้าใหม่: ${newProduct.name} (฿${newProduct.price})`);

    res.status(201).json({ success: true, message: 'เพิ่มสินค้าสำเร็จ', data: newProduct });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มสินค้า' });
  }
});

// Admin: Update product
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await dataService.getProductById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'ไม่พบสินค้าที่ต้องการแก้ไข' });
    }

    const updated = await dataService.updateProduct(id, req.body);
    await dataService.logAdminAction(req.admin.id, 'PRODUCT_UPDATE', `แก้ไขข้อมูลสินค้า: ${updated.name}`);

    res.json({ success: true, message: 'แก้ไขข้อมูลสินค้าสำเร็จ', data: updated });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการแก้ไขสินค้า' });
  }
});

// Admin: Delete product
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await dataService.getProductById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'ไม่พบสินค้าที่ต้องการลบ' });
    }

    await dataService.deleteProduct(id);
    await dataService.logAdminAction(req.admin.id, 'PRODUCT_DELETE', `ลบสินค้า: ${existing.name}`);

    res.json({ success: true, message: 'ลบสินค้าสำเร็จ' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบสินค้า' });
  }
});

export default router;
