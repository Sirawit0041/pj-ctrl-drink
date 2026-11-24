import { api } from './api.js';

export const adminManager = {
  currentTab: 'dashboard',
  cachedStats: null,
  cachedOrders: [],
  cachedProducts: [],
  cachedSettings: null,

  async init() {
    this.setupAdminUI();
  },

  setupAdminUI() {
    // Tab switching
    const tabBtns = document.querySelectorAll('.admin-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Refresh button
    document.getElementById('btn-admin-refresh')?.addEventListener('click', () => {
      this.loadActiveTabData();
    });

    // Store Open/Close Toggle
    const storeToggle = document.getElementById('store-status-toggle');
    storeToggle?.addEventListener('change', async (e) => {
      const is_open = e.target.checked;
      try {
        const updated = await api.updateShopSettings({ is_open });
        if (window.showToast) {
          window.showToast(`เปลี่ยนสถานะร้านเป็น: ${is_open ? 'เปิดให้บริการ' : 'ปิดร้านชั่วคราว'} แล้ว`, 'success');
        }
        this.updateStoreStatusBanner(updated);
      } catch (err) {
        e.target.checked = !is_open; // revert
        if (window.showToast) window.showToast(err.message, 'error');
      }
    });

    // Store settings form submit
    document.getElementById('form-shop-settings')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const shop_name = document.getElementById('input-shop-name').value;
      const promptpay_number = document.getElementById('input-promptpay-number').value;
      const promptpay_account_name = document.getElementById('input-promptpay-account-name').value;
      const closed_message = document.getElementById('input-closed-message').value;

      try {
        const updated = await api.updateShopSettings({
          shop_name,
          promptpay_number,
          promptpay_account_name,
          closed_message
        });
        if (window.showToast) window.showToast('บันทึกการตั้งค่าร้านค้าสำเร็จ', 'success');
        this.updateStoreStatusBanner(updated);
      } catch (err) {
        if (window.showToast) window.showToast(err.message, 'error');
      }
    });

    // Product Add Button
    document.getElementById('btn-add-product-modal')?.addEventListener('click', () => {
      this.openProductModal();
    });

    // Order status filter
    document.getElementById('select-order-filter')?.addEventListener('change', (e) => {
      this.loadOrders(e.target.value);
    });

    // QR Code Image Upload Handler in Admin Settings
    const qrFileInput = document.getElementById('input-admin-qr-file');
    const uploadQrBtn = document.getElementById('btn-upload-admin-qr');
    const qrImgEl = document.getElementById('admin-current-qr-img');

    qrFileInput?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        if (uploadQrBtn) uploadQrBtn.disabled = false;
        const reader = new FileReader();
        reader.onload = (re) => {
          if (qrImgEl) {
            qrImgEl.src = re.target.result;
            qrImgEl.classList.remove('opacity-40');
          }
        };
        reader.readAsDataURL(e.target.files[0]);
      }
    });

    uploadQrBtn?.addEventListener('click', async () => {
      if (!qrFileInput?.files || !qrFileInput.files[0]) return;
      uploadQrBtn.disabled = true;
      uploadQrBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> กำลังอัปโหลด...`;

      try {
        const res = await api.uploadQRImage(qrFileInput.files[0]);
        if (window.showToast) window.showToast('อัปเดตรูปภาพ PromptPay QR เรียบร้อยแล้ว', 'success');
        uploadQrBtn.innerHTML = `<i class="fa-solid fa-check mr-1"></i> อัปโหลดสำเร็จ`;
        setTimeout(() => {
          uploadQrBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up mr-1"></i> บันทึกรูปภาพ QR Code ใหม่`;
        }, 2000);
      } catch (err) {
        if (window.showToast) window.showToast(err.message, 'error');
        uploadQrBtn.disabled = false;
        uploadQrBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up mr-1"></i> ลองใหม่อีกครั้ง`;
      }
    });
  },

  switchTab(tabName) {
    this.currentTab = tabName;
    document.querySelectorAll('.admin-tab-btn').forEach(b => {
      if (b.dataset.tab === tabName) {
        b.classList.add('bg-orange-500', 'text-white', 'shadow-md');
        b.classList.remove('text-gray-600', 'hover:bg-gray-100');
      } else {
        b.classList.remove('bg-orange-500', 'text-white', 'shadow-md');
        b.classList.add('text-gray-600', 'hover:bg-gray-100');
      }
    });

    document.querySelectorAll('.admin-tab-content').forEach(c => {
      c.classList.add('hidden');
    });

    const activeContent = document.getElementById(`admin-tab-${tabName}`);
    if (activeContent) activeContent.classList.remove('hidden');

    this.loadActiveTabData();
  },

  async loadActiveTabData() {
    if (!api.isAdminLoggedIn()) return;

    if (this.currentTab === 'dashboard') {
      await this.loadDashboardStats();
    } else if (this.currentTab === 'orders') {
      const filter = document.getElementById('select-order-filter')?.value || 'all';
      await this.loadOrders(filter);
    } else if (this.currentTab === 'slips') {
      await this.loadSlips();
    } else if (this.currentTab === 'products') {
      await this.loadProducts();
    } else if (this.currentTab === 'settings') {
      await this.loadSettings();
    } else if (this.currentTab === 'logs') {
      await this.loadLogs();
    }
  },

  async loadDashboardStats() {
    try {
      const stats = await api.getDashboardStats();
      this.cachedStats = stats;

      document.getElementById('stat-today-sales').textContent = `฿${parseFloat(stats.todaySales || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
      document.getElementById('stat-total-sales').textContent = `฿${parseFloat(stats.totalSales || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
      document.getElementById('stat-today-orders').textContent = stats.todayOrdersCount || 0;
      document.getElementById('stat-pending-slips').textContent = stats.pendingVerificationCount || 0;
      document.getElementById('stat-active-orders').textContent = stats.activeOrdersCount || 0;

      // Render bestsellers
      const bsList = document.getElementById('stat-bestsellers-list');
      if (bsList) {
        if (!stats.bestSellers || stats.bestSellers.length === 0) {
          bsList.innerHTML = `<p class="text-sm text-gray-400 py-3 text-center">ยังไม่มีข้อมูลการขายสินค้า</p>`;
        } else {
          bsList.innerHTML = stats.bestSellers.map((item, idx) => `
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-orange-50/50 border border-orange-100">
              <div class="flex items-center gap-3">
                <span class="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">${idx + 1}</span>
                <span class="font-medium text-gray-800 text-sm">${item.name}</span>
              </div>
              <span class="text-xs font-bold text-orange-600 bg-white px-2.5 py-1 rounded-full border">${item.qty} ชิ้น</span>
            </div>
          `).join('');
        }
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  },

  async loadOrders(status = 'all') {
    const listEl = document.getElementById('admin-orders-table-body');
    if (!listEl) return;

    listEl.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-gray-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> กำลังโหลดออเดอร์...</td></tr>`;

    try {
      const orders = await api.getAdminOrders(status);
      this.cachedOrders = orders;

      if (!orders || orders.length === 0) {
        listEl.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-gray-400">ไม่พบคำสั่งซื้อในหมวดหมู่นี้</td></tr>`;
        return;
      }

      const statusOptions = [
        'Pending Payment',
        'Waiting Verification',
        'Payment Approved',
        'Preparing',
        'Ready',
        'Completed',
        'Rejected',
        'Cancelled'
      ];

      listEl.innerHTML = orders.map(ord => {
        const dateStr = new Date(ord.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
        const itemsSummary = (ord.items || []).map(i => `${i.product_name} x${i.quantity}`).join(', ');

        return `
          <tr class="border-b border-gray-100 hover:bg-orange-50/30 transition text-sm">
            <td class="py-3 px-3 font-semibold text-gray-800">${ord.order_number}</td>
            <td class="py-3 px-3 text-xs text-gray-500">${dateStr}</td>
            <td class="py-3 px-3">
              <div class="font-medium text-gray-800">${ord.customer_name}</div>
              <div class="text-xs text-gray-500">${ord.customer_phone}</div>
            </td>
            <td class="py-3 px-3 text-xs text-gray-600 max-w-xs truncate" title="${itemsSummary}">${itemsSummary || '-'}</td>
            <td class="py-3 px-3 font-bold text-orange-600">฿${parseFloat(ord.total_amount).toFixed(2)}</td>
            <td class="py-3 px-3">
              <select class="admin-order-status-select text-xs font-semibold rounded-lg border-gray-300 py-1 px-2 focus:ring-orange-500 focus:border-orange-500 bg-white" data-order-id="${ord.id}">
                ${statusOptions.map(opt => `
                  <option value="${opt}" ${ord.order_status === opt ? 'selected' : ''}>${opt}</option>
                `).join('')}
              </select>
            </td>
            <td class="py-3 px-3 text-right">
              ${ord.payment?.slip_url ? `
                <button class="btn-inspect-slip text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 px-2.5 py-1 rounded-lg font-medium transition" data-order-id="${ord.id}" data-slip-url="${ord.payment.slip_url}">
                  <i class="fa-solid fa-receipt mr-1"></i> ดูสลิป
                </button>
              ` : `
                <span class="text-xs text-gray-400">ไม่มีสลิป</span>
              `}
            </td>
          </tr>
        `;
      }).join('');

      // Attach change listeners
      listEl.querySelectorAll('.admin-order-status-select').forEach(select => {
        select.addEventListener('change', async (e) => {
          const orderId = e.target.dataset.orderId;
          const newStatus = e.target.value;
          try {
            await api.updateOrderStatus(orderId, newStatus);
            if (window.showToast) window.showToast('อัปเดตสถานะสำเร็จ', 'success');
          } catch (err) {
            if (window.showToast) window.showToast(err.message, 'error');
          }
        });
      });

      listEl.querySelectorAll('.btn-inspect-slip').forEach(btn => {
        btn.addEventListener('click', () => {
          const orderId = btn.dataset.orderId;
          const order = orders.find(o => o.id === orderId);
          if (order) this.openSlipModal(order);
        });
      });

    } catch (err) {
      listEl.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-red-500">${err.message}</td></tr>`;
    }
  },

  async loadSlips() {
    const container = document.getElementById('admin-slips-grid');
    if (!container) return;

    container.innerHTML = `<div class="col-span-full py-8 text-center text-gray-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> กำลังโหลดรายการสลิป...</div>`;

    try {
      const orders = await api.getAdminOrders('all');
      const ordersWithSlips = orders.filter(o => o.payment && o.payment.slip_url);

      if (ordersWithSlips.length === 0) {
        container.innerHTML = `<div class="col-span-full py-12 text-center text-gray-400"><i class="fa-solid fa-receipt text-3xl mb-2 text-gray-300"></i><p>ยังไม่มีสลิปที่ต้องตรวจสอบ</p></div>`;
        return;
      }

      container.innerHTML = ordersWithSlips.map(ord => {
        const isPending = ord.payment.verification_status === 'waiting_verification';
        const dateStr = new Date(ord.payment.created_at || ord.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });

        return `
          <div class="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col">
            <div class="relative bg-gray-100 aspect-video overflow-hidden cursor-pointer btn-open-slip-preview" data-order-id="${ord.id}">
              <img src="${ord.payment.slip_url}" alt="Slip" class="w-full h-full object-cover">
              <span class="absolute top-2 right-2 text-[11px] font-bold px-2 py-0.5 rounded-full ${isPending ? 'bg-amber-500 text-white' : (ord.payment.verification_status === 'approved' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white')}">
                ${isPending ? 'รอตรวจสอบ' : (ord.payment.verification_status === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธ')}
              </span>
            </div>
            <div class="p-4 flex-1 flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>${ord.order_number}</span>
                  <span>${dateStr}</span>
                </div>
                <h4 class="font-bold text-gray-800 text-sm mb-1">${ord.customer_name}</h4>
                <div class="text-xs text-gray-500 mb-2">${ord.customer_phone}</div>
                <div class="text-lg font-black text-orange-600 mb-3">฿${parseFloat(ord.total_amount).toFixed(2)}</div>
              </div>

              <div class="space-y-2 pt-2 border-t border-gray-100">
                <button class="w-full py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold rounded-xl transition btn-open-slip-preview" data-order-id="${ord.id}">
                  <i class="fa-solid fa-magnifying-glass-plus mr-1"></i> ตรวจสอบสลิปขนาดใหญ่
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      container.querySelectorAll('.btn-open-slip-preview').forEach(btn => {
        btn.addEventListener('click', () => {
          const ord = ordersWithSlips.find(o => o.id === btn.dataset.orderId);
          if (ord) this.openSlipModal(ord);
        });
      });
    } catch (err) {
      container.innerHTML = `<div class="col-span-full py-8 text-center text-red-500">${err.message}</div>`;
    }
  },

  openSlipModal(order) {
    const modal = document.getElementById('admin-slip-inspect-modal');
    if (!modal) return;

    const payment = order.payment || {};
    const slipUrl = payment.slip_url;

    modal.innerHTML = `
      <div class="glass-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative animate-fade-in my-8 max-h-[90vh] flex flex-col">
          <!-- Close button -->
          <button id="btn-close-slip-inspect" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center transition z-10">
            <i class="fa-solid fa-xmark"></i>
          </button>

          <h3 class="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <i class="fa-solid fa-shield-halved text-orange-500"></i> ตรวจสอบสลิปโอนเงิน (Manual Verification)
          </h3>

          <!-- Warning Alert -->
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 mb-4 flex items-start gap-2">
            <i class="fa-solid fa-triangle-exclamation text-amber-600 text-base mt-0.5"></i>
            <div>
              <strong>ข้อกำหนดสำคัญ:</strong> การอัปโหลดสลิปไม่ทำให้ระบบยืนยันยอดเงินโดยอัตโนมัติ ผู้ดูแลระบบต้องตรวจสอบยอดเงินโอนเข้าบัญชีจริงจากแอปธนาคารของท่านก่อนกดอนุมัติทุกครั้ง
            </div>
          </div>

          <!-- Order Summary Details -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 rounded-xl p-3 text-xs mb-4">
            <div>
              <span class="text-gray-400 block">เลขออเดอร์:</span>
              <span class="font-bold text-gray-800">${order.order_number}</span>
            </div>
            <div>
              <span class="text-gray-400 block">ผู้สั่งซื้อ:</span>
              <span class="font-bold text-gray-800">${order.customer_name}</span>
            </div>
            <div>
              <span class="text-gray-400 block">เบอร์ติดต่อ:</span>
              <span class="font-bold text-gray-800">${order.customer_phone}</span>
            </div>
            <div>
              <span class="text-gray-400 block">ยอดที่ต้องชำระ:</span>
              <span class="font-black text-orange-600 text-sm">฿${parseFloat(order.total_amount).toFixed(2)}</span>
            </div>
          </div>

          <!-- Slip Large Preview -->
          <div class="flex-1 overflow-auto rounded-2xl border border-gray-200 bg-gray-900/5 p-2 flex items-center justify-center min-h-[300px]">
            <img src="${slipUrl}" alt="Slip High Res" class="max-h-[500px] w-auto max-w-full rounded-xl shadow object-contain">
          </div>

          <!-- Actions -->
          <div class="mt-4 pt-3 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
            <button id="btn-approve-slip" class="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20">
              <i class="fa-solid fa-circle-check"></i> ยืนยันการชำระเงิน (อนุมัติ)
            </button>
            <button id="btn-reject-slip" class="py-3 px-5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl transition flex items-center justify-center gap-2 border border-rose-200">
              <i class="fa-solid fa-circle-xmark"></i> ปฏิเสธสลิป
            </button>
          </div>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');

    modal.querySelector('#btn-close-slip-inspect')?.addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    modal.querySelector('#btn-approve-slip')?.addEventListener('click', async () => {
      if (confirm(`คุณได้ตรวจสอบยอดเงิน ฿${parseFloat(order.total_amount).toFixed(2)} ในบัญชีธนาคารแล้ว และต้องการอนุมัติออเดอร์นี้ใช่หรือไม่?`)) {
        try {
          await api.verifyPayment(payment.id || order.id);
          if (window.showToast) window.showToast('อนุมัติการชำระเงินเรียบร้อยแล้ว ออเดอร์เข้าสู่ขั้นตอนจัดเตรียม', 'success');
          modal.classList.add('hidden');
          this.loadActiveTabData();
        } catch (err) {
          if (window.showToast) window.showToast(err.message, 'error');
        }
      }
    });

    modal.querySelector('#btn-reject-slip')?.addEventListener('click', async () => {
      const reason = prompt('กรุณาระบุเหตุผลในการปฏิเสธสลิป (เช่น ยอดเงินไม่ตรง, สลิปซ้ำ, สลิปไม่ชัดเจน):');
      if (reason && reason.trim()) {
        try {
          await api.rejectPayment(payment.id || order.id, reason.trim());
          if (window.showToast) window.showToast('ปฏิเสธสลิปเรียบร้อยแล้ว', 'warning');
          modal.classList.add('hidden');
          this.loadActiveTabData();
        } catch (err) {
          if (window.showToast) window.showToast(err.message, 'error');
        }
      }
    });
  },

  async loadProducts() {
    const listEl = document.getElementById('admin-products-table-body');
    if (!listEl) return;

    listEl.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-gray-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> กำลังโหลดสินค้า...</td></tr>`;

    try {
      const products = await api.getProducts();
      this.cachedProducts = products;

      if (!products || products.length === 0) {
        listEl.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-gray-400">ยังไม่มีสินค้าในระบบ</td></tr>`;
        return;
      }

      listEl.innerHTML = products.map(prod => `
        <tr class="border-b border-gray-100 hover:bg-orange-50/30 transition text-sm">
          <td class="py-3 px-3">
            <img src="${prod.image_url}" alt="${prod.name}" class="w-12 h-12 rounded-xl object-cover border">
          </td>
          <td class="py-3 px-3">
            <div class="font-bold text-gray-800">${prod.name}</div>
            <div class="text-xs text-gray-400">${prod.sub_category === 'milk' ? 'หมวดนม' : (prod.sub_category === 'soda' ? 'หมวดโซดา' : 'ของทานเล่น')}</div>
          </td>
          <td class="py-3 px-3 font-bold text-orange-600">฿${parseFloat(prod.price).toFixed(2)}</td>
          <td class="py-3 px-3">
            <span class="text-xs px-2.5 py-1 rounded-full font-semibold ${prod.stock_quantity > 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
              ${prod.stock_quantity} ชิ้น
            </span>
          </td>
          <td class="py-3 px-3">
            <button class="btn-toggle-product-avail px-2.5 py-1 rounded-full text-xs font-semibold transition ${prod.is_available ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}" data-product-id="${prod.id}" data-avail="${prod.is_available}">
              ${prod.is_available ? '● พร้อมขาย' : '○ ปิดการขาย'}
            </button>
          </td>
          <td class="py-3 px-3 text-right space-x-1">
            <button class="btn-edit-product text-gray-600 hover:text-orange-500 p-1.5 rounded-lg hover:bg-orange-50 transition" data-product-id="${prod.id}">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn-delete-product text-gray-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition" data-product-id="${prod.id}">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>
      `).join('');

      // Attach button listeners
      listEl.querySelectorAll('.btn-toggle-product-avail').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.productId;
          const currentAvail = btn.dataset.avail === 'true';
          try {
            await api.updateProduct(id, { is_available: !currentAvail });
            if (window.showToast) window.showToast('อัปเดตสถานะสินค้าสำเร็จ', 'success');
            this.loadProducts();
          } catch (e) {
            if (window.showToast) window.showToast(e.message, 'error');
          }
        });
      });

      listEl.querySelectorAll('.btn-edit-product').forEach(btn => {
        btn.addEventListener('click', () => {
          const prod = products.find(p => p.id === btn.dataset.productId);
          if (prod) this.openProductModal(prod);
        });
      });

      listEl.querySelectorAll('.btn-delete-product').forEach(btn => {
        btn.addEventListener('click', async () => {
          const prod = products.find(p => p.id === btn.dataset.productId);
          if (confirm(`คุณต้องการลบสินค้า "${prod?.name}" ใช่หรือไม่?`)) {
            try {
              await api.deleteProduct(btn.dataset.productId);
              if (window.showToast) window.showToast('ลบสินค้าสำเร็จ', 'success');
              this.loadProducts();
            } catch (e) {
              if (window.showToast) window.showToast(e.message, 'error');
            }
          }
        });
      });
    } catch (err) {
      listEl.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-red-500">${err.message}</td></tr>`;
    }
  },

  openProductModal(product = null) {
    const isEdit = Boolean(product);
    const modal = document.getElementById('admin-product-edit-modal');
    if (!modal) return;

    modal.innerHTML = `
      <div class="glass-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-fade-in my-8">
          <button id="btn-close-prod-modal" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center transition">
            <i class="fa-solid fa-xmark"></i>
          </button>

          <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <i class="fa-solid fa-cube text-orange-500"></i> ${isEdit ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่'}
          </h3>

          <form id="form-product-save" class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">ชื่อสินค้า *</label>
              <input type="text" id="prod-input-name" required value="${product?.name || ''}" class="w-full text-sm rounded-xl border border-gray-300 px-3 py-2 focus:ring-orange-500 focus:border-orange-500">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">หมวดหมู่หลัก *</label>
                <select id="prod-input-cat" class="w-full text-sm rounded-xl border border-gray-300 px-3 py-2">
                  <option value="11111111-1111-1111-1111-111111111111" ${product?.category_id === '11111111-1111-1111-1111-111111111111' ? 'selected' : ''}>เครื่องดื่ม</option>
                  <option value="22222222-2222-2222-2222-222222222222" ${product?.category_id === '22222222-2222-2222-2222-222222222222' ? 'selected' : ''}>ของทานเล่น</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">หมวดหมู่ย่อย</label>
                <select id="prod-input-subcat" class="w-full text-sm rounded-xl border border-gray-300 px-3 py-2">
                  <option value="milk" ${product?.sub_category === 'milk' ? 'selected' : ''}>หมวดนม (Milk)</option>
                  <option value="soda" ${product?.sub_category === 'soda' ? 'selected' : ''}>หมวดโซดา (Soda)</option>
                  <option value="snack" ${product?.sub_category === 'snack' ? 'selected' : ''}>ของทานเล่น (Snack)</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">ราคา (บาท) *</label>
                <input type="number" step="0.5" id="prod-input-price" required value="${product?.price || '45'}" class="w-full text-sm rounded-xl border border-gray-300 px-3 py-2 focus:ring-orange-500 focus:border-orange-500">
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 mb-1">จำนวนสต็อก</label>
                <input type="number" id="prod-input-stock" required value="${product?.stock_quantity ?? '50'}" class="w-full text-sm rounded-xl border border-gray-300 px-3 py-2">
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">รูปภาพสินค้า (URL)</label>
              <input type="url" id="prod-input-img" value="${product?.image_url || 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80'}" class="w-full text-sm rounded-xl border border-gray-300 px-3 py-2">
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">รายละเอียดสินค้า</label>
              <textarea id="prod-input-desc" rows="2" class="w-full text-sm rounded-xl border border-gray-300 px-3 py-2">${product?.description || ''}</textarea>
            </div>

            <div class="flex items-center gap-2 pt-1">
              <input type="checkbox" id="prod-input-avail" ${product ? (product.is_available ? 'checked' : '') : 'checked'} class="rounded text-orange-500 focus:ring-orange-500">
              <label for="prod-input-avail" class="text-xs font-medium text-gray-700">เปิดให้สั่งซื้อได้ทันที</label>
            </div>

            <div class="pt-3">
              <button type="submit" class="w-full py-2.5 bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold rounded-xl shadow-md transition hover:from-orange-500 hover:to-orange-600">
                ${isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');

    modal.querySelector('#btn-close-prod-modal')?.addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    modal.querySelector('#form-product-save')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('prod-input-name').value,
        category_id: document.getElementById('prod-input-cat').value,
        sub_category: document.getElementById('prod-input-subcat').value,
        price: parseFloat(document.getElementById('prod-input-price').value),
        stock_quantity: parseInt(document.getElementById('prod-input-stock').value, 10),
        image_url: document.getElementById('prod-input-img').value,
        description: document.getElementById('prod-input-desc').value,
        is_available: document.getElementById('prod-input-avail').checked
      };

      try {
        if (isEdit) {
          await api.updateProduct(product.id, payload);
          if (window.showToast) window.showToast('แก้ไขข้อมูลสินค้าสำเร็จ', 'success');
        } else {
          await api.createProduct(payload);
          if (window.showToast) window.showToast('เพิ่มสินค้าใหม่สำเร็จ', 'success');
        }
        modal.classList.add('hidden');
        this.loadProducts();
      } catch (err) {
        if (window.showToast) window.showToast(err.message, 'error');
      }
    });
  },

  async loadSettings() {
    try {
      const settings = await api.getShopSettings();
      this.cachedSettings = settings;

      document.getElementById('input-shop-name').value = settings.shop_name || 'PJ Ctrl + Drink';
      document.getElementById('input-promptpay-number').value = settings.promptpay_number || '0945174302';
      document.getElementById('input-promptpay-account-name').value = settings.promptpay_account_name || 'PJ Ctrl + Drink';
      document.getElementById('input-closed-message').value = settings.closed_message || '';
      document.getElementById('store-status-toggle').checked = Boolean(settings.is_open);

      if (settings.promptpay_qr_image) {
        const qrImg = document.getElementById('admin-current-qr-img');
        if (qrImg) {
          qrImg.src = settings.promptpay_qr_image + '?t=' + Date.now();
          qrImg.classList.remove('opacity-40');
        }
      }
      
      this.updateStoreStatusBanner(settings);
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  },

  updateStoreStatusBanner(settings) {
    const banner = document.getElementById('live-shop-closed-alert');
    const statusPill = document.getElementById('header-store-status-pill');

    if (statusPill) {
      if (settings.is_open) {
        statusPill.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> เปิดร้าน`;
        statusPill.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-md border border-white/30 flex items-center gap-1.5';
      } else {
        statusPill.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-400"></span> ปิดร้าน`;
        statusPill.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/80 text-white backdrop-blur-md border border-white/30 flex items-center gap-1.5';
      }
    }

    if (banner) {
      if (!settings.is_open) {
        banner.classList.remove('hidden');
        const msgEl = document.getElementById('shop-closed-message-text');
        if (msgEl) msgEl.textContent = settings.closed_message || 'ขณะนี้ร้านปิดให้บริการแล้ว';
      } else {
        banner.classList.add('hidden');
      }
    }
  },

  async loadLogs() {
    const listEl = document.getElementById('admin-logs-list');
    if (!listEl) return;

    listEl.innerHTML = `<div class="py-8 text-center text-gray-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> กำลังโหลดประวัติการทำงาน...</div>`;

    try {
      const logs = await api.getAdminLogs();
      if (!logs || logs.length === 0) {
        listEl.innerHTML = `<div class="py-8 text-center text-gray-400">ยังไม่มีบันทึกประวัติ</div>`;
        return;
      }

      listEl.innerHTML = logs.map(l => {
        const time = new Date(l.created_at).toLocaleString('th-TH');
        return `
          <div class="p-3 bg-white rounded-xl border border-gray-100 flex items-start gap-3 text-xs">
            <span class="w-2 h-2 rounded-full bg-orange-400 mt-1.5 flex-shrink-0"></span>
            <div class="flex-1">
              <div class="flex items-center justify-between text-gray-400 mb-0.5">
                <span class="font-bold text-gray-700">${l.action}</span>
                <span>${time}</span>
              </div>
              <p class="text-gray-600">${l.description}</p>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      listEl.innerHTML = `<div class="py-8 text-center text-red-500">${err.message}</div>`;
    }
  }
};
