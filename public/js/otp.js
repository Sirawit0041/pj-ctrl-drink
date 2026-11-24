import { api } from './api.js';

let countdownInterval = null;
let countdownSeconds = 0;

export const otpManager = {
  verifiedPhones: new Set(),

  isPhoneVerified(phone) {
    if (!phone) return false;
    const clean = phone.replace(/[^0-9]/g, '');
    const token = api.getPhoneToken(clean);
    return Boolean(token);
  },

  async requestOTP({ name, phone, onSuccess, onError, onCountdown }) {
    try {
      if (countdownSeconds > 0) {
        throw new Error(`กรุณารออีก ${countdownSeconds} วินาทีก่อนขอรหัสใหม่`);
      }

      const res = await api.sendOTP(name, phone);
      
      // Start 60s cooldown timer
      countdownSeconds = 60;
      if (countdownInterval) clearInterval(countdownInterval);
      
      if (onCountdown) onCountdown(countdownSeconds);
      countdownInterval = setInterval(() => {
        countdownSeconds -= 1;
        if (onCountdown) onCountdown(countdownSeconds);
        if (countdownSeconds <= 0) {
          clearInterval(countdownInterval);
        }
      }, 1000);

      if (onSuccess) onSuccess(res);
      return res;
    } catch (err) {
      if (onError) onError(err.message);
      throw err;
    }
  },

  async verifyCode({ phone, code, onSuccess, onError }) {
    try {
      const clean = phone.replace(/[^0-9]/g, '');
      const res = await api.verifyOTP(clean, code);
      this.verifiedPhones.add(clean);
      if (onSuccess) onSuccess(res);
      return res;
    } catch (err) {
      if (onError) onError(err.message);
      throw err;
    }
  }
};
