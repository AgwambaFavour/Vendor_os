// In-memory store of each vendor's linking state (latest QR or pairing
// code + connection status), so the API can serve it to the dashboard
// while onboarding.
const store = new Map(); // vendorId -> { method, qr, pairingCode, status, error }

export function startLinking(vendorId, method) {
  store.set(vendorId, { method, qr: null, pairingCode: null, status: 'starting', error: null });
}

export function setQr(vendorId, qr) {
  store.set(vendorId, { ...(store.get(vendorId) || {}), qr, status: 'awaiting_scan' });
}

export function setPairingCode(vendorId, pairingCode) {
  store.set(vendorId, {
    ...(store.get(vendorId) || {}),
    pairingCode,
    error: null,
    status: 'awaiting_code',
  });
}

export function setLinkError(vendorId, error) {
  store.set(vendorId, { ...(store.get(vendorId) || {}), error, status: 'error' });
}

export function setStatus(vendorId, status) {
  store.set(vendorId, { ...(store.get(vendorId) || {}), status });
}

export function getState(vendorId) {
  return store.get(vendorId) || null;
}
