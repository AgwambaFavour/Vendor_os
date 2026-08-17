import { createVendorSocket } from './connection.js';
import { getConnectedVendors } from '../db/vendors.js';
import { setQr, setStatus } from './qrStore.js';

const sockets = new Map();

export async function startVendorSocket(vendor, handlers) {
  const sock = await createVendorSocket(vendor, handlers);
  sockets.set(vendor.id, sock);
  return sock;
}

export function getVendorSocket(vendorId) {
  return sockets.get(vendorId);
}

export async function bootAllVendors(buildHandlers) {
  const vendors = await getConnectedVendors();
  console.log(`Reconnecting ${vendors.length} vendor(s)...`);
  for (const vendor of vendors) {
    await startVendorSocket(vendor, buildHandlers(vendor));
  }
}

/**
 * Starts a socket for a brand-new vendor during onboarding, wiring QR
 * updates and connection status into qrStore so the dashboard can poll it.
 */
export async function startOnboarding(vendor, buildHandlers) {
  const handlers = buildHandlers(vendor);
  const originalOnQr = handlers.onQr;
  const originalOnReady = handlers.onReady;

  handlers.onQr = (qr, v) => {
    setQr(v.id, qr);
    originalOnQr?.(qr, v);
  };
  handlers.onReady = (sock, v) => {
    setStatus(v.id, 'connected');
    originalOnReady?.(sock, v);
  };

  return startVendorSocket(vendor, handlers);
}