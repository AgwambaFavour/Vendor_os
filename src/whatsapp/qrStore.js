// In-memory store of each vendor's latest QR + connection status,
// so the API can serve it to the dashboard while onboarding.
const store = new Map(); // vendorId -> { qr, status }

export function setQr(vendorId, qr) {
  store.set(vendorId, { ...(store.get(vendorId) || {}), qr, status: 'awaiting_scan' });
}

export function setStatus(vendorId, status) {
  store.set(vendorId, { ...(store.get(vendorId) || {}), status });
}

export function getState(vendorId) {
  return store.get(vendorId) || null;
}