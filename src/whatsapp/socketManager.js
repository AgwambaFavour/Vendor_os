import { rm } from 'fs/promises';
import { createVendorSocket, getAuthDir, formatPairingCode } from './connection.js';
import { getConnectedVendors } from '../db/vendors.js';
import { startLinking, setQr, setPairingCode, setLinkError, setStatus } from './qrStore.js';

const sockets = new Map();

export async function startVendorSocket(vendor, handlers, options = {}) {
  // Reconnects (including the restart WhatsApp forces right after linking)
  // create a new socket, so always keep the newest one in the map.
  const originalOnSocket = handlers.onSocket;
  handlers.onSocket = (sock, v) => {
    sockets.set(v.id, sock);
    originalOnSocket?.(sock, v);
  };

  return createVendorSocket(vendor, handlers, options);
}

export function getVendorSocket(vendorId) {
  return sockets.get(vendorId);
}

/** Closes a vendor's socket without triggering the auto-reconnect. */
export function stopVendorSocket(vendorId) {
  const sock = sockets.get(vendorId);
  if (!sock) return;
  sock.stoppedByVendorOs = true;
  try {
    sock.end(undefined);
  } catch (err) {
    console.error('Error closing socket:', err);
  }
  sockets.delete(vendorId);
}

export async function bootAllVendors(buildHandlers) {
  const vendors = await getConnectedVendors();
  console.log(`Reconnecting ${vendors.length} vendor(s)...`);
  for (const vendor of vendors) {
    await startVendorSocket(vendor, buildHandlers(vendor));
  }
}

/**
 * Starts a socket for a vendor during onboarding, wiring QR / pairing-code
 * updates and connection status into qrStore so the dashboard can poll it.
 *
 * @param {object} vendor
 * @param {function} buildHandlers
 * @param {object} opts - { linkMethod: 'code' | 'qr', fresh: boolean }
 *   fresh: wipe any old session files first (needed after a logout, since
 *   stale credentials can't be re-linked).
 */
export async function startOnboarding(vendor, buildHandlers, opts = {}) {
  const linkMethod = opts.linkMethod === 'qr' ? 'qr' : 'code';

  stopVendorSocket(vendor.id);
  if (opts.fresh) {
    await rm(getAuthDir(vendor), { recursive: true, force: true });
  }
  startLinking(vendor.id, linkMethod);

  const handlers = buildHandlers(vendor);
  const originalOnQr = handlers.onQr;
  const originalOnReady = handlers.onReady;

  handlers.onQr = (qr, v) => {
    setQr(v.id, qr);
    originalOnQr?.(qr, v);
  };
  handlers.onPairingCode = (code, v) => {
    setPairingCode(v.id, formatPairingCode(code));
    console.log(`[${v.phone}] Pairing code issued.`);
  };
  handlers.onPairingError = (err, v) => {
    setLinkError(v.id, 'Could not get a pairing code from WhatsApp. Check the number and try again.');
  };
  handlers.onReady = (sock, v) => {
    setStatus(v.id, 'connected');
    originalOnReady?.(sock, v);
  };

  return startVendorSocket(vendor, handlers, { linkMethod });
}
