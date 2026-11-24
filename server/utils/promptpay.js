import generatePayload from 'promptpay-qr';
import qrcode from 'qrcode';

/**
 * Generate standard EMVCo PromptPay QR Code
 * @param {string} promptpayNumber Mobile number (10 digits) or National ID (13 digits)
 * @param {number} amount Exact amount to charge
 * @returns {Promise<{ payload: string, qrDataUrl: string }>}
 */
export async function generatePromptPayQR(promptpayNumber, amount) {
  try {
    const cleanNumber = (promptpayNumber || '0945174302').replace(/[^0-9]/g, '');
    const numAmount = parseFloat(amount);
    
    // Generate EMVCo standard payload with exact amount
    const payload = generatePayload(cleanNumber, { amount: numAmount });
    
    // Generate high-resolution PNG data URL
    const qrDataUrl = await qrcode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      margin: 2,
      width: 320,
      color: {
        dark: '#1e293b',
        light: '#ffffff'
      }
    });

    return {
      payload,
      qrDataUrl
    };
  } catch (error) {
    console.error('Error generating PromptPay QR:', error);
    throw new Error('ไม่สามารถสร้าง PromptPay QR Code ได้');
  }
}
