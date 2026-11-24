/**
 * Cart State Management with LocalStorage Persistence
 */

const CART_STORAGE_KEY = 'ctrl_drink_cart_items';

class CartManager {
  constructor() {
    this.items = [];
    this.listeners = [];
    this.load();
  }

  load() {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      this.items = saved ? JSON.parse(saved) : [];
    } catch (e) {
      this.items = [];
    }
    this.notify();
  }

  save() {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.items));
    } catch (e) {
      console.error('Failed to save cart:', e);
    }
    this.notify();
  }

  subscribe(callback) {
    this.listeners.push(callback);
    callback(this.items);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.items);
    }
  }

  getItems() {
    return this.items;
  }

  addItem(product, sweetness = 'หวานปกติ', quantity = 1) {
    const existingIndex = this.items.findIndex(
      item => item.product_id === product.id && item.sweetness_level === sweetness
    );

    if (existingIndex > -1) {
      this.items[existingIndex].quantity += quantity;
    } else {
      this.items.push({
        product_id: product.id,
        product_name: product.name,
        price: parseFloat(product.price),
        image_url: product.image_url,
        sweetness_level: sweetness,
        quantity: quantity,
        sub_category: product.sub_category || ''
      });
    }

    this.save();
  }

  updateQuantity(index, newQty) {
    if (index >= 0 && index < this.items.length) {
      if (newQty <= 0) {
        this.removeItem(index);
      } else {
        this.items[index].quantity = newQty;
        this.save();
      }
    }
  }

  updateSweetness(index, newSweetness) {
    if (index >= 0 && index < this.items.length) {
      this.items[index].sweetness_level = newSweetness;
      this.save();
    }
  }

  removeItem(index) {
    if (index >= 0 && index < this.items.length) {
      this.items.splice(index, 1);
      this.save();
    }
  }

  clear() {
    this.items = [];
    this.save();
  }

  getTotalCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  getTotalAmount() {
    const sum = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    return Math.round(sum * 100) / 100;
  }
}

export const cart = new CartManager();
