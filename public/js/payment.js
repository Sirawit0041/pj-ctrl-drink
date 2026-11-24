import { api } from './api.js';

export const paymentManager = {
  currentOrder: null,
  pollTimer: null,

  init(orderData) {
    this.currentOrder = orderData;
    this.renderPaymentModal(orderData);
    this.startStatusPolling(orderData.id || orderData.order_number);
  },

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  },

  startStatusPolling(orderId) {
    this.stopPolling();
    this.pollTimer = setInterval(async () => {
      try {
        const order = await api.getOrder(orderId);
        if (order) {
          this.currentOrder = order;
          this.updateOrderStatusBadge(order.order_status);
          
          if (['Completed', 'Payment Approved', 'Rejected', 'Cancelled'].includes(order.order_status)) {
            // Update order tracker UI if open
            if (window.renderOrderTracker) {
              window.renderOrderTracker(order);
            }
          }
        }
      } catch (e) {
        // quiet poll fail
      }
    }, 4000);
  },

  updateOrderStatusBadge(status) {
    const badge = document.getElementById('order-status-live-badge');
    if (badge) {
      const statusMap = {
        'Pending Payment': { text: 'รอชำระเงิน', bg: 'bg-amber-100 text-amber-800' },
        'Waiting Verification': { text: 'รอตรวจสอบสลิป', bg: 'bg-blue-100 text-blue-800' },
        'Payment Approved': { text: 'ชำระเงินแล้ว', bg: 'bg-emerald-100 text-emerald-800' },
        'Preparing': { text: 'กำลังจัดเตรียม', bg: 'bg-purple-100 text-purple-800' },
        'Ready': { text: 'สินค้าพร้อมรับ', bg: 'bg-teal-100 text-teal-800' },
        'Completed': { text: 'สำเร็จ', bg: 'bg-green-100 text-green-800' },
        'Rejected': { text: 'สลิปไม่ถูกต้อง', bg: 'bg-rose-100 text-rose-800' },
        'Cancelled': { text: 'ยกเลิกคำสั่งซื้อ', bg: 'bg-gray-100 text-gray-800' }
      };
      const info = statusMap[status] || { text: status, bg: 'bg-gray-100 text-gray-800' };
      badge.className = `px-3 py-1 rounded-full text-xs font-semibold ${info.bg}`;
      badge.textContent = info.text;
    }
  },

  renderPaymentModal(order) {
    const modalEl = document.getElementById('payment-modal');
    if (!modalEl) return;

    const pp = order.promptpay || {};
    const amount = order.total_amount ? parseFloat(order.total_amount).toFixed(2) : '0.00';

    modalEl.innerHTML = `
      <div class="glass-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative animate-fade-in my-8">
          <!-- Close button -->
          <button id="btn-close-payment-modal" class="absolute top-5 right-5 text-gray-400 hover:text-gray-600 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center transition">
            <i class="fa-solid fa-xmark"></i>
          </button>

          <!-- Header -->
          <div class="text-center mb-5">
            <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 mb-3">
              <i class="fa-solid fa-qrcode text-xl"></i>
            </div>
            <h3 class="text-xl font-bold text-gray-800">ชำระเงินผ่าน PromptPay</h3>
            <p class="text-sm text-gray-500">หมายเลขออเดอร์: <span class="font-semibold text-gray-700">${order.order_number}</span></p>
            <div class="mt-2">
              <span id="order-status-live-badge" class="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                ${order.order_status === 'Waiting Verification' ? 'รอตรวจสอบสลิป' : 'รอชำระเงิน'}
              </span>
            </div>
          </div>

          <!-- PromptPay QR Box -->
          <div class="bg-[#FFF9F4] rounded-2xl p-5 border border-orange-100 text-center mb-5">
            <div class="bg-white p-3 rounded-2xl shadow-sm inline-block mb-3 border border-gray-100">
              <img id="promptpay-qr-img" src="${pp.qrDataUrl || '/assets/57853.jpg'}" alt="PromptPay QR Code" class="w-56 h-56 mx-auto rounded-lg object-contain">
            </div>

            <div class="text-2xl font-black text-orange-600 mb-2">
              ฿${amount}
            </div>

            <div class="space-y-1.5 text-xs text-gray-600 bg-white/70 rounded-xl p-3 border border-orange-100">
              <div class="flex items-center justify-between">
                <span>หมายเลข PromptPay:</span>
                <div class="flex items-center gap-1.5 font-bold text-gray-800">
                  <span id="promptpay-num-text">${pp.number || '0945174302'}</span>
                  <button id="btn-copy-promptpay" class="text-orange-500 hover:text-orange-600 text-xs px-2 py-0.5 rounded bg-orange-50 hover:bg-orange-100 transition">
                    <i class="fa-regular fa-copy"></i> คัดลอก
                  </button>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <span>ชื่อบัญชี:</span>
                <span class="font-medium text-gray-800">${pp.account_name || 'PJ Ctrl + Drink'}</span>
              </div>
            </div>
          </div>

          <!-- Slip Upload Section -->
          <div class="border-t border-gray-100 pt-4">
            <h4 class="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
              <i class="fa-solid fa-receipt text-orange-500"></i> แนบสลิปหลักฐานการโอน
            </h4>

            <form id="form-upload-slip" class="space-y-3">
              <div id="drop-zone-slip" class="border-2 border-dashed border-gray-300 hover:border-orange-400 rounded-2xl p-4 text-center cursor-pointer transition bg-gray-50/50">
                <input type="file" id="input-slip-file" accept="image/jpeg,image/png,image/webp" class="hidden">
                <div id="slip-preview-container" class="hidden mb-3">
                  <img id="slip-preview-img" src="" alt="Slip Preview" class="max-h-48 mx-auto rounded-xl shadow-md border">
                  <p id="slip-preview-name" class="text-xs text-gray-500 mt-2 truncate max-w-xs mx-auto"></p>
                </div>
                <div id="slip-placeholder">
                  <i class="fa-solid fa-cloud-arrow-up text-3xl text-orange-400 mb-2"></i>
                  <p class="text-xs font-semibold text-gray-700">คลิกหรือลากไฟล์สลิปมาวางที่นี่</p>
                  <p class="text-[11px] text-gray-400 mt-1">รองรับ JPG, PNG, WEBP (ไม่เกิน 5MB)</p>
                </div>
              </div>

              <button type="submit" id="btn-submit-slip" class="w-full py-3 px-4 bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" disabled>
                <i class="fa-solid fa-paper-plane"></i> ยืนยันการส่งสลิป
              </button>
            </form>
          </div>

          <!-- Footer Action -->
          <div class="mt-4 pt-3 border-t border-gray-100 text-center">
            <button id="btn-view-order-tracker" class="text-xs text-orange-600 hover:text-orange-700 font-semibold flex items-center justify-center gap-1 mx-auto">
              <span>ติดตามสถานะออเดอร์นี้</span>
              <i class="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    modalEl.classList.remove('hidden');

    // Setup event listeners
    this.setupEventListeners(order);
  },

  setupEventListeners(order) {
    const modalEl = document.getElementById('payment-modal');
    const closeBtn = document.getElementById('btn-close-payment-modal');
    const copyBtn = document.getElementById('btn-copy-promptpay');
    const fileInput = document.getElementById('input-slip-file');
    const dropZone = document.getElementById('drop-zone-slip');
    const submitBtn = document.getElementById('btn-submit-slip');
    const form = document.getElementById('form-upload-slip');
    const trackerBtn = document.getElementById('btn-view-order-tracker');

    let selectedFile = null;

    closeBtn?.addEventListener('click', () => {
      modalEl.classList.add('hidden');
      this.stopPolling();
    });

    copyBtn?.addEventListener('click', () => {
      const num = order.promptpay?.number || '0945174302';
      navigator.clipboard.writeText(num).then(() => {
        if (window.showToast) window.showToast('คัดลอกหมายเลข PromptPay เรียบร้อย', 'success');
      });
    });

    dropZone?.addEventListener('click', () => fileInput.click());

    fileInput?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    });

    // Drag and drop
    dropZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('border-orange-500', 'bg-orange-50/50');
    });

    dropZone?.addEventListener('dragleave', () => {
      dropZone.classList.remove('border-orange-500', 'bg-orange-50/50');
    });

    dropZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-orange-500', 'bg-orange-50/50');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    function handleFileSelect(file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        if (window.showToast) window.showToast('รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP)', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        if (window.showToast) window.showToast('ขนาดไฟล์ต้องไม่เกิน 5MB', 'error');
        return;
      }

      selectedFile = file;
      const previewImg = document.getElementById('slip-preview-img');
      const previewName = document.getElementById('slip-preview-name');
      const previewContainer = document.getElementById('slip-preview-container');
      const placeholder = document.getElementById('slip-placeholder');

      const reader = new FileReader();
      reader.onload = (re) => {
        previewImg.src = re.target.result;
        previewName.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        previewContainer.classList.remove('hidden');
        placeholder.classList.add('hidden');
        submitBtn.disabled = false;
      };
      reader.readAsDataURL(file);
    }

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!selectedFile) return;

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> กำลังอัปโหลด...`;

      try {
        const res = await api.uploadSlip(order.id, selectedFile);
        if (window.showToast) window.showToast(res.message || 'แนบสลิปเรียบร้อยแล้ว รอเจ้าหน้าที่ตรวจสอบ', 'success');
        
        submitBtn.innerHTML = `<i class="fa-solid fa-check"></i> ส่งสลิปแล้ว`;
        this.updateOrderStatusBadge('Waiting Verification');

        setTimeout(() => {
          if (window.renderOrderTracker) {
            modalEl.classList.add('hidden');
            window.renderOrderTracker(order);
          }
        }, 1200);
      } catch (err) {
        if (window.showToast) window.showToast(err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> ลองใหม่อีกครั้ง`;
      }
    });

    trackerBtn?.addEventListener('click', () => {
      modalEl.classList.add('hidden');
      if (window.renderOrderTracker) {
        window.renderOrderTracker(order);
      }
    });
  }
};
