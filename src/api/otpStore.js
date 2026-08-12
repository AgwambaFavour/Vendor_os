const codes = new Map(); // phone -> { code, expiresAt }
const OTP_TTL_MS = 5 * 60 * 1000;

export function generateOtp(phone) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  codes.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS });
  return code;
}

export function verifyOtp(phone, code) {
  const entry = codes.get(phone);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    codes.delete(phone);
    return false;
  }
  const valid = entry.code === code;
  if (valid) codes.delete(phone); // one-time use
  return valid;
}