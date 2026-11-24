/**
 * Validation utilities for anti-spam, anti-fake name, and Thai mobile phone formats
 */

/**
 * Validate customer name
 * - Must not be empty
 * - Between 2 and 50 characters
 * - Cannot be all numbers
 * - Cannot have excessive repeating characters (e.g. AAAA, 1111, กกกก)
 * - Must only contain Thai, English alphabets, spaces, dots, or hyphens
 */
export function validateCustomerName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, message: 'กรุณากรอกชื่อ-นามสกุล' };
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { valid: false, message: 'ชื่อต้องมีความยาวอย่างน้อย 2 ตัวอักษร' };
  }

  if (trimmed.length > 50) {
    return { valid: false, message: 'ชื่อมีความยาวเกิน 50 ตัวอักษร' };
  }

  // Reject all numbers
  if (/^\d+$/.test(trimmed)) {
    return { valid: false, message: 'ชื่อต้องไม่ใช่ตัวเลขล้วน' };
  }

  // Reject repeating characters (4 or more consecutive identical chars) e.g. AAAAA, 1111, กกกก
  if (/(.)\1{3,}/i.test(trimmed)) {
    return { valid: false, message: 'ชื่อมีตัวอักษรซ้ำกันผิดปกติ กรุณากรอกชื่อจริง' };
  }

  // Reject common fake names
  const fakeNames = ['test', 'asdf', 'qwer', 'aaa', '1234', 'ทดสอบ', 'กขคง'];
  if (fakeNames.includes(trimmed.toLowerCase())) {
    return { valid: false, message: 'กรุณาระบุชื่อผู้สั่งซื้อที่ถูกต้อง' };
  }

  // Allow Thai, English letters, spaces, dots, hyphens, parentheses
  const validNameRegex = /^[a-zA-Z\u0E00-\u0E7F\s.\-()']+$/;
  if (!validNameRegex.test(trimmed)) {
    return { valid: false, message: 'ชื่อต้องประกอบด้วยตัวอักษรภาษาไทยหรือภาษาอังกฤษเท่านั้น' };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Validate Thai mobile phone number
 * - Must be 10 digits
 * - Must start with 06, 08, or 09 (standard Thai mobile operator prefix)
 * - Must not be all identical digits (e.g. 0888888888)
 * - Must not be sequential dummy digits (e.g. 0123456789)
 */
export function validateThaiPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, message: 'กรุณากรอกเบอร์โทรศัพท์' };
  }

  const cleanPhone = phone.replace(/[^0-9]/g, '');

  if (cleanPhone.length !== 10) {
    return { valid: false, message: 'เบอร์โทรศัพท์มือถือต้องมี 10 หลัก' };
  }

  // Thai mobile prefix check: 06, 08, 09
  if (!/^0[689]\d{8}$/.test(cleanPhone)) {
    return { valid: false, message: 'เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 06, 08 หรือ 09' };
  }

  // Check all identical digits (e.g. 0888888888)
  const remainingDigits = cleanPhone.substring(2);
  if (/^(\d)\1{7}$/.test(remainingDigits)) {
    return { valid: false, message: 'เบอร์โทรศัพท์เป็นตัวเลขซ้ำผิดปกติ' };
  }

  // Check simple sequential dummy numbers
  if (cleanPhone === '0812345678' || cleanPhone === '0912345678' || cleanPhone === '0876543210') {
    return { valid: false, message: 'เบอร์โทรศัพท์นี้ไม่สามารถใช้งานได้ กรุณาใช้เบอร์จริง' };
  }

  return { valid: true, phone: cleanPhone };
}

/**
 * Format phone number for display e.g. 094-517-4302 or 094-xxx-4302
 */
export function formatPhone(phone, mask = false) {
  if (!phone) return '';
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length !== 10) return phone;
  if (mask) {
    return `${clean.slice(0, 3)}-xxx-${clean.slice(6)}`;
  }
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
}
