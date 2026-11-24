import { api } from './api.js';
import { cart } from './cart.js';
import { otpManager } from './otp.js';
import { paymentManager } from './payment.js';
import { adminManager } from './admin.js';

// Global state
let currentView = 'home';
let allProducts = [];
let shopSettings = null;
let selectedCategory = 'all';
let selectedSubCategory = 'all';
let searchQuery = '';
let selectedDrinkForModal = null;
let currentSweetness = 'หวานปกติ';
let modalQuantity = 1;

// Global toast helper
window.showToast = function(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bgColors = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    warning: 'bg-amber-500 text-white',
    info: 'bg-gray-800 text-white'
  };
  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-exclamation',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info'
  };

  toast.className = `toast ${bgColors[type] || bgColors.info} shadow-xl`;
  toast.innerHTML = `
    <i class="fa-solid ${icons[type] || icons.info} text-lg"></i>
    <span class="flex-1">${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

// Global order tracker renderer
window.renderOrderTracker = async function(orderOrId) {
  let order = orderOrId;
  if (typeof orderOrId === 'string') {
    try {
      order = await api.getOrder(orderOrId);
    } catch (e) {
      window.showToast('ไม่พบคำสั่งซื้อนี้', 'error');
      return;
    }
  }

  switchView('order-tracker');
  renderOrderTrackerDetails(order);
};

// Main Initialization
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupCartEvents();
  setupSweetnessModal();
  setupAntiFakeValidation();
  await adminManager.init();
  await loadInitialData();

  // Handle URL hash routing if present
  const hash = window.location.hash.replace('#', '');
  if (['home', 'menu', 'cart', 'order-tracker', 'settings', 'admin'].includes(hash)) {
    switchView(hash);
  }
});

// Setup bottom & top navigation
function setupNavigation() {
  document.querySelectorAll('.nav-tab-item').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      switchView(view);
    });
  });

  // Category tab clicks
  document.querySelectorAll('.category-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.category-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      selectedCategory = btn.dataset.category || 'all';
      selectedSubCategory = 'all';

      // Toggle sub-category chip container for drinks
      const subCatContainer = document.getElementById('drinks-subcategory-chips');
      if (selectedCategory === 'เครื่องดื่ม') {
        subCatContainer?.classList.remove('hidden');
      } else {
        subCatContainer?.classList.add('hidden');
      }

      filterAndRenderProducts();
    });
  });

  // Subcategory chips for drinks
  document.querySelectorAll('.subcat-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.subcat-chip').forEach(c => {
        c.classList.remove('bg-orange-500', 'text-white', 'border-transparent');
        c.classList.add('bg-white', 'text-gray-700', 'border-gray-200');
      });
      chip.classList.add('bg-orange-500', 'text-white', 'border-transparent');
      chip.classList.remove('bg-white', 'text-gray-700', 'border-gray-200');

      selectedSubCategory = chip.dataset.subcat || 'all';
      filterAndRenderProducts();
    });
  });

  // Search input
  const searchInputs = [document.getElementById('input-search-menu'), document.getElementById('input-search-hero')];
  searchInputs.forEach(input => {
    input?.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      if (currentView !== 'menu') {
        switchView('menu');
      }
      filterAndRenderProducts();
    });
  });

  // Home CTA buttons
  document.getElementById('btn-hero-order-now')?.addEventListener('click', () => {
    switchView('menu');
  });

  document.getElementById('btn-quick-track')?.addEventListener('click', () => {
    switchView('settings');
  });

  // Order lookup in order tracker view
  document.getElementById('btn-lookup-order')?.addEventListener('click', async () => {
    const input = document.getElementById('input-search-order-id');
    const orderNumber = input.value.trim();
    if (!orderNumber) {
      window.showToast('กรุณากรอกหมายเลขออเดอร์', 'warning');
      return;
    }
    await window.renderOrderTracker(orderNumber);
  });

  // User order history lookup by phone in settings view
  document.getElementById('btn-search-user-history')?.addEventListener('click', async () => {
    const phoneInput = document.getElementById('input-history-phone');
    const phone = phoneInput.value.trim().replace(/[^0-9]/g, '');
    const resultsContainer = document.getElementById('user-history-results');

    if (!phone || phone.length !== 10) {
      window.showToast('กรุณากรอกเบอร์โทรศัพท์ 10 หลัก', 'warning');
      return;
    }

    resultsContainer.innerHTML = `<div class="py-4 text-center text-gray-400 text-xs"><i class="fa-solid fa-spinner fa-spin mr-1"></i> กำลังค้นหา...</div>`;

    try {
      const orders = await api.getUserOrders(phone);
      if (!orders || orders.length === 0) {
        resultsContainer.innerHTML = `<p class="text-xs text-gray-400 text-center py-3">ไม่พบประวัติการสั่งซื้อสำหรับเบอร์นี้</p>`;
        return;
      }

      resultsContainer.innerHTML = orders.map(ord => {
        const time = new Date(ord.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
        return `
          <div class="p-3 bg-orange-50/50 rounded-xl border border-orange-100 flex items-center justify-between text-xs hover:bg-orange-100/50 transition cursor-pointer btn-open-history-order" data-order-id="${ord.id}">
            <div>
              <div class="font-bold text-gray-800">${ord.order_number}</div>
              <div class="text-[11px] text-gray-400">${time}</div>
            </div>
            <div class="text-right">
              <span class="font-bold text-orange-600 block">฿${parseFloat(ord.total_amount).toFixed(2)}</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-white font-semibold text-gray-700 border">${ord.order_status}</span>
            </div>
          </div>
        `;
      }).join('');

      resultsContainer.querySelectorAll('.btn-open-history-order').forEach(item => {
        item.addEventListener('click', () => {
          const ordId = item.dataset.orderId;
          window.renderOrderTracker(ordId);
        });
      });
    } catch (err) {
      resultsContainer.innerHTML = `<p class="text-xs text-red-500 text-center py-3">${err.message}</p>`;
    }
  });
}

// Switch between main views
function switchView(viewName) {
  currentView = viewName;
  window.location.hash = viewName;

  document.querySelectorAll('.main-view-panel').forEach(panel => {
    panel.classList.add('hidden');
  });

  const activePanel = document.getElementById(`view-${viewName}`);
  if (activePanel) {
    activePanel.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Update bottom navigation bar active state
  document.querySelectorAll('.nav-tab-item').forEach(item => {
    if (item.dataset.view === viewName || (viewName === 'admin' && item.dataset.view === 'settings')) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  if (viewName === 'cart') {
    renderCartView();
  } else if (viewName === 'admin') {
    if (!api.isAdminLoggedIn()) {
      showAdminLoginModal();
    } else {
      adminManager.loadActiveTabData();
    }
  }
}

// Load products and shop settings
async function loadInitialData() {
  try {
    const [settings, products] = await Promise.all([
      api.getShopSettings(),
      api.getProducts()
    ]);

    shopSettings = settings;
    allProducts = products;

    adminManager.updateStoreStatusBanner(settings);
    renderFeaturedProducts();
    filterAndRenderProducts();

    // Subscribe to cart updates
    cart.subscribe(updateCartBadge);
  } catch (error) {
    console.error('Error loading initial data:', error);
    window.showToast('ไม่สามารถเชื่อมต่อฐานข้อมูลได้', 'error');
  }
}

// Update live cart item badge
function updateCartBadge(items) {
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const badges = document.querySelectorAll('.cart-badge-count');
  badges.forEach(b => {
    b.textContent = totalCount;
    if (totalCount > 0) {
      b.classList.remove('hidden');
    } else {
      b.classList.add('hidden');
    }
  });
}

// Render Featured / Bestsellers on Home page
function renderFeaturedProducts() {
  const container = document.getElementById('home-featured-products');
  if (!container) return;

  const featured = allProducts.slice(0, 4);
  container.innerHTML = featured.map(prod => createProductCardHtml(prod)).join('');
  attachProductCardEvents(container);
}

// Filter and Render Products on Menu page
function filterAndRenderProducts() {
  const grid = document.getElementById('menu-products-grid');
  if (!grid) return;

  let filtered = [...allProducts];

  // Category filter
  if (selectedCategory === 'เครื่องดื่ม') {
    filtered = filtered.filter(p => p.category_id === '11111111-1111-1111-1111-111111111111');
    if (selectedSubCategory !== 'all') {
      filtered = filtered.filter(p => p.sub_category === selectedSubCategory);
    }
  } else if (selectedCategory === 'ของทานเล่น') {
    filtered = filtered.filter(p => p.category_id === '22222222-2222-2222-2222-222222222222');
  }

  // Search filter
  if (searchQuery) {
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(searchQuery) ||
      (p.description && p.description.toLowerCase().includes(searchQuery))
    );
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center text-gray-400">
        <i class="fa-solid fa-mug-saucer text-4xl mb-3 text-orange-200"></i>
        <p class="text-sm">ไม่พบสินค้าที่คุณค้นหา</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(prod => createProductCardHtml(prod)).join('');
  attachProductCardEvents(grid);
}

// HTML generator for product cards
function createProductCardHtml(prod) {
  const isDrink = prod.category_id === '11111111-1111-1111-1111-111111111111';
  const subCategoryLabels = {
    milk: 'หมวดนม',
    soda: 'หมวดโซดา',
    snack: 'ของทานเล่น'
  };
  const categoryLabel = subCategoryLabels[prod.sub_category] || (isDrink ? 'เครื่องดื่ม' : 'ของทานเล่น');

  return `
    <div class="product-card overflow-hidden group">
      <!-- Image & Badges -->
      <div class="relative aspect-square overflow-hidden bg-orange-50/50">
        <img src="${prod.image_url || '/assets/57853.jpg'}" alt="${prod.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
        <div class="absolute top-2.5 left-2.5">
          <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/90 text-orange-600 backdrop-blur shadow-sm">
            ${categoryLabel}
          </span>
        </div>
        ${!prod.is_available ? `
          <div class="absolute inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center">
            <span class="px-3 py-1 bg-rose-600 text-white rounded-full text-xs font-bold shadow-md">ปิดการขายชั่วคราว</span>
          </div>
        ` : (prod.stock_quantity <= 0 ? `
          <div class="absolute inset-0 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center">
            <span class="px-3 py-1 bg-gray-700 text-white rounded-full text-xs font-bold shadow-md">สินค้าหมด</span>
          </div>
        ` : '')}
      </div>

      <!-- Info -->
      <div class="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h4 class="font-bold text-gray-800 text-base mb-1 truncate">${prod.name}</h4>
          <p class="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">${prod.description || ''}</p>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-gray-100">
          <div>
            <span class="text-xs text-gray-400 block">ราคา</span>
            <span class="text-lg font-black text-orange-600">฿${parseFloat(prod.price).toFixed(2)}</span>
          </div>

          <button class="btn-add-to-cart px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs shadow-md shadow-orange-500/25 transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed" 
            data-product-id="${prod.id}"
            ${!prod.is_available || prod.stock_quantity <= 0 ? 'disabled' : ''}>
            <i class="fa-solid fa-plus"></i>
            <span>${isDrink ? 'เลือกระดับหวาน' : 'เพิ่มในตะกร้า'}</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

// Event attachment for product cards
function attachProductCardEvents(container) {
  container.querySelectorAll('.btn-add-to-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const prodId = btn.dataset.productId;
      const product = allProducts.find(p => p.id === prodId);
      if (!product) return;

      const isDrink = product.category_id === '11111111-1111-1111-1111-111111111111';
      if (isDrink) {
        openSweetnessModal(product);
      } else {
        cart.addItem(product, 'ไม่ระบุ', 1);
        window.showToast(`เพิ่ม "${product.name}" ลงในตะกร้าแล้ว`, 'success');
      }
    });
  });
}

// Sweetness Modal Handling
function setupSweetnessModal() {
  const modal = document.getElementById('sweetness-modal');
  const closeBtn = document.getElementById('btn-close-sweetness-modal');
  const addBtn = document.getElementById('btn-confirm-add-drink');
  const qtyMinus = document.getElementById('modal-qty-minus');
  const qtyPlus = document.getElementById('modal-qty-plus');
  const qtyDisplay = document.getElementById('modal-qty-display');

  closeBtn?.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  qtyMinus?.addEventListener('click', () => {
    if (modalQuantity > 1) {
      modalQuantity -= 1;
      qtyDisplay.textContent = modalQuantity;
      updateModalTotal();
    }
  });

  qtyPlus?.addEventListener('click', () => {
    modalQuantity += 1;
    qtyDisplay.textContent = modalQuantity;
    updateModalTotal();
  });

  document.querySelectorAll('.sweetness-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.sweetness-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      currentSweetness = opt.dataset.sweetness;
    });
  });

  addBtn?.addEventListener('click', () => {
    if (!selectedDrinkForModal) return;

    cart.addItem(selectedDrinkForModal, currentSweetness, modalQuantity);
    modal.classList.add('hidden');
    window.showToast(`เพิ่ม "${selectedDrinkForModal.name}" (${currentSweetness}) ${modalQuantity} แก้ว ลงตะกร้าแล้ว`, 'success');
  });
}

function openSweetnessModal(product) {
  selectedDrinkForModal = product;
  currentSweetness = 'หวานปกติ';
  modalQuantity = 1;

  const modal = document.getElementById('sweetness-modal');
  document.getElementById('modal-drink-title').textContent = product.name;
  document.getElementById('modal-drink-desc').textContent = product.description || '';
  document.getElementById('modal-drink-img').src = product.image_url || '/assets/57853.jpg';
  document.getElementById('modal-qty-display').textContent = '1';

  document.querySelectorAll('.sweetness-option').forEach(opt => {
    if (opt.dataset.sweetness === 'หวานปกติ') {
      opt.classList.add('selected');
    } else {
      opt.classList.remove('selected');
    }
  });

  updateModalTotal();
  modal.classList.remove('hidden');
}

function updateModalTotal() {
  if (!selectedDrinkForModal) return;
  const total = selectedDrinkForModal.price * modalQuantity;
  document.getElementById('modal-drink-total-price').textContent = `฿${total.toFixed(2)}`;
}

// Cart View Rendering & Checkout
function setupCartEvents() {
  const checkoutBtn = document.getElementById('btn-checkout-submit');
  checkoutBtn?.addEventListener('click', handleOrderSubmission);

  document.getElementById('btn-clear-cart')?.addEventListener('click', () => {
    if (confirm('คุณต้องการล้างตะกร้าสินค้าใช่หรือไม่?')) {
      cart.clear();
      renderCartView();
    }
  });
}

function renderCartView() {
  const container = document.getElementById('cart-items-container');
  const emptyState = document.getElementById('cart-empty-state');
  const summaryBox = document.getElementById('cart-summary-box');
  const checkoutForm = document.getElementById('cart-checkout-form');

  const items = cart.getItems();

  if (items.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    summaryBox.classList.add('hidden');
    checkoutForm.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  summaryBox.classList.remove('hidden');
  checkoutForm.classList.remove('hidden');

  container.innerHTML = items.map((item, idx) => `
    <div class="bg-white rounded-2xl p-4 border border-orange-100/60 shadow-sm flex items-center gap-3">
      <img src="${item.image_url || '/assets/57853.jpg'}" alt="${item.product_name}" class="w-16 h-16 rounded-xl object-cover border flex-shrink-0">
      <div class="flex-1 min-w-0">
        <h4 class="font-bold text-gray-800 text-sm truncate">${item.product_name}</h4>
        ${item.sweetness_level && item.sweetness_level !== 'ไม่ระบุ' ? `
          <span class="inline-block px-2 py-0.5 rounded-full text-[11px] bg-orange-50 text-orange-600 font-medium">
            ${item.sweetness_level}
          </span>
        ` : ''}
        <div class="text-sm font-black text-orange-600 mt-1">
          ฿${(item.price * item.quantity).toFixed(2)}
        </div>
      </div>

      <!-- Quantity Stepper -->
      <div class="flex items-center gap-2 bg-gray-50 rounded-xl p-1 border">
        <button class="cart-step-minus w-7 h-7 rounded-lg bg-white shadow-xs flex items-center justify-center text-gray-600 hover:text-orange-600 transition" data-index="${idx}">
          <i class="fa-solid fa-minus text-xs"></i>
        </button>
        <span class="font-bold text-xs text-gray-800 w-5 text-center">${item.quantity}</span>
        <button class="cart-step-plus w-7 h-7 rounded-lg bg-white shadow-xs flex items-center justify-center text-gray-600 hover:text-orange-600 transition" data-index="${idx}">
          <i class="fa-solid fa-plus text-xs"></i>
        </button>
      </div>

      <!-- Remove button -->
      <button class="cart-remove-item text-gray-300 hover:text-rose-500 p-2 transition" data-index="${idx}">
        <i class="fa-solid fa-trash-can text-sm"></i>
      </button>
    </div>
  `).join('');

  // Update totals
  const totalAmount = cart.getTotalAmount();
  document.getElementById('cart-subtotal-price').textContent = `฿${totalAmount.toFixed(2)}`;
  document.getElementById('cart-total-price').textContent = `฿${totalAmount.toFixed(2)}`;

  // Attach item events
  container.querySelectorAll('.cart-step-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      cart.updateQuantity(idx, items[idx].quantity - 1);
      renderCartView();
    });
  });

  container.querySelectorAll('.cart-step-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      cart.updateQuantity(idx, items[idx].quantity + 1);
      renderCartView();
    });
  });

  container.querySelectorAll('.cart-remove-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      cart.removeItem(idx);
      renderCartView();
    });
  });
}

// Anti-fake Validation & OTP Checkout Flow
function setupAntiFakeValidation() {
  const nameInput = document.getElementById('input-customer-name');
  const phoneInput = document.getElementById('input-customer-phone');
  const requestOtpBtn = document.getElementById('btn-request-otp');
  const verifyOtpBtn = document.getElementById('btn-verify-otp');
  const otpCodeInput = document.getElementById('input-otp-code');
  const otpSection = document.getElementById('checkout-otp-section');
  const verifiedBadge = document.getElementById('customer-phone-verified-badge');

  // Request OTP click
  requestOtpBtn?.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!name) {
      window.showToast('กรุณากรอกชื่อ-นามสกุลก่อนขอรหัส OTP', 'warning');
      nameInput.focus();
      return;
    }

    if (!phone) {
      window.showToast('กรุณากรอกเบอร์โทรศัพท์มือถือ 10 หลัก', 'warning');
      phoneInput.focus();
      return;
    }

    requestOtpBtn.disabled = true;
    requestOtpBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> กำลังส่ง OTP...`;

    try {
      const res = await otpManager.requestOTP({
        name,
        phone,
        onCountdown: (sec) => {
          if (sec > 0) {
            requestOtpBtn.disabled = true;
            requestOtpBtn.innerHTML = `ขอใหม่ (${sec}s)`;
          } else {
            requestOtpBtn.disabled = false;
            requestOtpBtn.innerHTML = `<i class="fa-solid fa-sms mr-1"></i> ขอรหัส OTP`;
          }
        }
      });

      window.showToast(res.message, 'success');
      otpSection.classList.remove('hidden');

      // Show simulated SMS alert banner for effortless testing
      if (res.data?.simulatedOtp) {
        showSimulatedSMSBanner(res.data.simulatedOtp, res.data.ref);
      }
    } catch (err) {
      window.showToast(err.message, 'error');
      requestOtpBtn.disabled = false;
      requestOtpBtn.innerHTML = `<i class="fa-solid fa-sms mr-1"></i> ขอรหัส OTP`;
    }
  });

  // Verify OTP click
  verifyOtpBtn?.addEventListener('click', async () => {
    const phone = phoneInput.value.trim();
    const code = otpCodeInput.value.trim();

    if (!code || code.length !== 6) {
      window.showToast('กรุณากรอกรหัส OTP ให้ครบ 6 หลัก', 'warning');
      otpCodeInput.focus();
      return;
    }

    verifyOtpBtn.disabled = true;
    verifyOtpBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> กำลังตรวจ...`;

    try {
      const res = await otpManager.verifyCode({ phone, code });
      window.showToast(res.message, 'success');

      verifiedBadge.classList.remove('hidden');
      otpSection.classList.add('hidden');
      requestOtpBtn.classList.add('hidden');
      phoneInput.readOnly = true;

      // Enable checkout submit button
      const submitBtn = document.getElementById('btn-checkout-submit');
      if (submitBtn) {
        submitBtn.disabled = false;
      }
    } catch (err) {
      window.showToast(err.message, 'error');
      verifyOtpBtn.disabled = false;
      verifyOtpBtn.innerHTML = `ยืนยัน`;
    }
  });
}

function showSimulatedSMSBanner(code, ref) {
  const banner = document.getElementById('simulated-sms-banner');
  if (!banner) return;

  banner.innerHTML = `
    <div class="bg-gray-900 text-white p-3.5 rounded-2xl shadow-2xl border border-gray-700 animate-fade-in flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center text-lg">
          <i class="fa-solid fa-comment-sms"></i>
        </div>
        <div>
          <div class="text-[11px] text-gray-400 font-semibold">SMS ข้อความ (จำลองระบบทดสอบ)</div>
          <div class="text-sm font-bold text-white">รหัส OTP ของคุณคือ: <span class="text-orange-400 text-base font-black tracking-widest">${code}</span> (Ref: ${ref})</div>
        </div>
      </div>
      <button onclick="document.getElementById('input-otp-code').value='${code}'; document.getElementById('simulated-sms-banner').classList.add('hidden');" class="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold">
        ใส่รหัสนี้
      </button>
    </div>
  `;
  banner.classList.remove('hidden');
}

// Order Submission Handling
async function handleOrderSubmission() {
  const nameInput = document.getElementById('input-customer-name');
  const phoneInput = document.getElementById('input-customer-phone');
  const noteInput = document.getElementById('input-customer-note');
  const submitBtn = document.getElementById('btn-checkout-submit');

  const customer_name = nameInput.value.trim();
  const customer_phone = phoneInput.value.trim();
  const cleanPhone = customer_phone.replace(/[^0-9]/g, '');
  const note = noteInput.value.trim();

  // Shop status check
  if (shopSettings && !shopSettings.is_open) {
    window.showToast(shopSettings.closed_message || 'ขออภัย ร้านปิดให้บริการแล้ว ไม่สามารถสั่งซื้อได้', 'error');
    return;
  }

  // Token check
  const phoneToken = api.getPhoneToken(cleanPhone);
  if (!phoneToken) {
    window.showToast('กรุณายืนยันเบอร์โทรศัพท์ด้วยรหัส OTP ก่อนสั่งซื้อ', 'warning');
    return;
  }

  const items = cart.getItems().map(item => ({
    product_id: item.product_id,
    quantity: item.quantity,
    sweetness_level: item.sweetness_level
  }));

  if (items.length === 0) {
    window.showToast('ตะกร้าสินค้าว่างเปล่า', 'warning');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> กำลังสร้างคำสั่งซื้อ...`;

  try {
    const res = await api.createOrder({
      customer_name,
      customer_phone: cleanPhone,
      phone_token: phoneToken,
      note,
      items
    });

    window.showToast('สร้างคำสั่งซื้อเรียบร้อยแล้ว กรุณาชำระเงิน', 'success');
    cart.clear();

    // Open Payment Modal with dynamic PromptPay QR
    paymentManager.init(res.order);
  } catch (err) {
    window.showToast(err.message, 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fa-solid fa-lock mr-2"></i> ยืนยันคำสั่งซื้อและชำระเงิน`;
  }
}

// Render Order Tracker view
function renderOrderTrackerDetails(order) {
  const container = document.getElementById('order-tracker-content');
  if (!container) return;

  const statuses = [
    { key: 'Pending Payment', label: 'รอชำระเงิน', icon: 'fa-clock' },
    { key: 'Waiting Verification', label: 'รอตรวจสอบสลิป', icon: 'fa-receipt' },
    { key: 'Payment Approved', label: 'ชำระเงินแล้ว', icon: 'fa-circle-check' },
    { key: 'Preparing', label: 'กำลังจัดเตรียม', icon: 'fa-blender' },
    { key: 'Ready', label: 'พร้อมรับสินค้า', icon: 'fa-bell-concierge' },
    { key: 'Completed', label: 'สำเร็จ', icon: 'fa-flag-checkered' }
  ];

  const currentIdx = statuses.findIndex(s => s.key === order.order_status);
  const isRejected = order.order_status === 'Rejected';
  const isCancelled = order.order_status === 'Cancelled';

  container.innerHTML = `
    <div class="bg-white rounded-3xl p-6 shadow-xl border border-orange-100 max-w-xl mx-auto animate-fade-in">
      <div class="text-center mb-6">
        <span class="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">หมายเลขออเดอร์</span>
        <h3 class="text-2xl font-black text-gray-800 mt-1">${order.order_number}</h3>
        <p class="text-xs text-gray-400 mt-0.5">${new Date(order.created_at).toLocaleString('th-TH')}</p>
      </div>

      <!-- Progression Steps -->
      ${!isRejected && !isCancelled ? `
        <div class="relative py-4 mb-6">
          <div class="absolute left-6 top-7 bottom-7 w-0.5 bg-gray-200 -z-0"></div>
          <div class="space-y-5">
            ${statuses.map((step, idx) => {
              const isPast = currentIdx >= idx;
              const isCurrent = currentIdx === idx;
              return `
                <div class="flex items-center gap-4 relative z-10">
                  <div class="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base transition ${isCurrent ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 ring-4 ring-orange-100' : (isPast ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400')}">
                    <i class="fa-solid ${step.icon}"></i>
                  </div>
                  <div>
                    <h5 class="text-sm font-bold ${isCurrent ? 'text-orange-600' : (isPast ? 'text-gray-800' : 'text-gray-400')}">${step.label}</h5>
                    <p class="text-xs text-gray-400">${isCurrent ? 'ขั้นตอนปัจจุบัน' : (isPast ? 'เสร็จสิ้นแล้ว' : 'รอดำเนินการ')}</p>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : `
        <div class="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-center mb-6">
          <i class="fa-solid fa-circle-exclamation text-rose-500 text-3xl mb-2"></i>
          <h4 class="font-bold text-rose-800">${isRejected ? 'สลิปไม่ถูกต้อง หรือถูกปฏิเสธ' : 'คำสั่งซื้อนี้ถูกยกเลิกแล้ว'}</h4>
          <p class="text-xs text-rose-600 mt-1">${order.payment?.rejection_reason || 'กรุณาติดต่อเจ้าหน้าที่ร้าน'}</p>
        </div>
      `}

      <!-- Action Button to Open Payment Modal if Pending -->
      ${['Pending Payment', 'Waiting Verification', 'Rejected'].includes(order.order_status) ? `
        <button id="btn-reopen-payment-modal" class="w-full py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold rounded-2xl shadow-md transition hover:from-orange-500 hover:to-orange-600 mb-6 flex items-center justify-center gap-2">
          <i class="fa-solid fa-qrcode"></i> เปิดหน้าชำระเงินและส่งสลิป
        </button>
      ` : ''}

      <!-- Order Items Detail -->
      <div class="border-t border-gray-100 pt-4">
        <h5 class="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">รายการสินค้า</h5>
        <div class="space-y-2 mb-4">
          ${(order.items || []).map(item => `
            <div class="flex items-center justify-between text-xs py-1">
              <div>
                <span class="font-semibold text-gray-800">${item.product_name}</span>
                <span class="text-gray-400">x${item.quantity}</span>
                ${item.sweetness_level ? `<span class="text-orange-500 ml-1">(${item.sweetness_level})</span>` : ''}
              </div>
              <span class="font-bold text-gray-700">฿${parseFloat(item.subtotal).toFixed(2)}</span>
            </div>
          `).join('')}
        </div>

        <div class="flex items-center justify-between border-t border-gray-100 pt-3">
          <span class="font-bold text-gray-700 text-sm">ยอดรวมทั้งหมด:</span>
          <span class="text-xl font-black text-orange-600">฿${parseFloat(order.total_amount).toFixed(2)}</span>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-reopen-payment-modal')?.addEventListener('click', () => {
    paymentManager.init(order);
  });
}

// Admin Login Modal
function showAdminLoginModal() {
  const modal = document.getElementById('admin-login-modal');
  if (!modal) return;

  modal.classList.remove('hidden');

  document.getElementById('btn-close-admin-login')?.addEventListener('click', () => {
    modal.classList.add('hidden');
    switchView('home');
  });

  const form = document.getElementById('form-admin-login');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const password = document.getElementById('input-admin-password').value;

    try {
      await api.adminLogin(password);
      modal.classList.add('hidden');
      window.showToast('เข้าสู่ระบบผู้ดูแลเรียบร้อยแล้ว', 'success');
      switchView('admin');
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  };
}
