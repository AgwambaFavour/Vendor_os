import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import path from 'path';
import { fileURLToPath } from 'url';
import { updateVendorStatus } from '../db/vendors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_ROOT = path.join(__dirname, '../../auth_state');

const logger = pino({ level: process.env.LOG_LEVEL || 'silent' });

/**
 * Starts (or resumes) a WhatsApp connection for a single vendor.
 * Each vendor's session lives in its own folder under auth_state/,
 * keyed by vendor.auth_state_key.
 *
 * Two ways to link a vendor's WhatsApp:
 *  - 'qr'   (default): Baileys emits a QR code the vendor scans.
 *  - 'code': we ask WhatsApp for an 8-character pairing code for the
 *            vendor's phone number. The vendor opens WhatsApp → Linked
 *            devices → Link a device → "Link with phone number instead"
 *            and types the code. No second screen or camera needed.
 *
 * @param {object} vendor - row from the `vendors` table
 * @param {object} handlers - { onReady, onMessage, onQr, onPairingCode, onPairingError, onSocket }
 * @param {object} options - { linkMethod: 'qr' | 'code' }
 */
export async function createVendorSocket(vendor, handlers = {}, options = {}) {
  const linkMethod = options.linkMethod === 'code' ? 'code' : 'qr';
  const AUTH_DIR = getAuthDir(vendor);
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    browser: ['Windows', 'Chrome', '1.0.0'],
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  // Let the caller track the newest socket — reconnects create new ones.
  handlers.onSocket?.(sock, vendor);

  sock.knownContacts = new Set();
  sock.ev.on('contacts.upsert', (contacts) => {
    for (const c of contacts) {
      if (c.id?.endsWith('@s.whatsapp.net')) sock.knownContacts.add(c.id);
    }
  });
  sock.ev.on('contacts.update', (contacts) => {
    for (const c of contacts) {
      if (c.id?.endsWith('@s.whatsapp.net')) sock.knownContacts.add(c.id);
    }
  });

  // Only ask for one pairing code per socket. If the vendor doesn't enter
  // it in time, WhatsApp closes the socket and the reconnect below creates
  // a fresh socket, which requests a fresh code.
  let pairingRequested = false;

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Baileys emits `qr` once the socket is ready to be linked; that is
    // also the right moment to request a pairing code instead.
    if (qr && linkMethod === 'code') {
      if (!pairingRequested && !sock.authState.creds.registered) {
        pairingRequested = true;
        try {
          const code = await sock.requestPairingCode(vendor.phone);
          if (handlers.onPairingCode) {
            handlers.onPairingCode(code, vendor);
          } else {
            console.log(`\nPairing code for vendor ${vendor.phone}: ${formatPairingCode(code)}\n`);
          }
        } catch (err) {
          console.error(`[${vendor.phone}] Failed to request pairing code:`, err);
          handlers.onPairingError?.(err, vendor);
        }
      }
    } else if (qr) {
      handlers.onQr?.(qr, vendor);
      if (!handlers.onQr) {
        console.log(`\nScan this QR code for vendor ${vendor.phone}:\n`);
        qrcode.generate(qr, { small: true });
      }
    }

    if (connection === 'close') {
      // Closed on purpose (e.g. vendor restarted linking) — don't reconnect.
      if (sock.stoppedByVendorOs) return;

      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        `[${vendor.phone}] Connection closed (code ${statusCode}). Reconnecting: ${shouldReconnect}`
      );

      if (shouldReconnect) {
        setTimeout(() => createVendorSocket(vendor, handlers, options), 3000);
      } else {
        await updateVendorStatus(vendor.id, 'disconnected');
        console.log(`[${vendor.phone}] Logged out. Vendor must link WhatsApp again to reconnect.`);
      }
    } else if (connection === 'open') {
      console.log(`[${vendor.phone}] WhatsApp connection established.`);
      await updateVendorStatus(vendor.id, 'connected');
      handlers.onReady?.(sock, vendor);
    }
  });

  if (handlers.onMessage) {
    sock.ev.on('messages.upsert', ({ messages, type }) => {
      if (type !== 'notify') return;

      const selfJid = sock.user?.id ? jidNormalizedUser(sock.user.id) : null;
      const selfLid = sock.user?.lid ? jidNormalizedUser(sock.user.lid) : null;

      for (const msg of messages) {
        const chatJid = jidNormalizedUser(msg.key.remoteJid);
        const isSelfChat = (selfJid && chatJid === selfJid) || (selfLid && chatJid === selfLid);
        const isGroupChat = chatJid.endsWith('@g.us');

        if (msg.key.fromMe && !isSelfChat && !isGroupChat) continue;

        handlers.onMessage(msg, sock, { isSelfChat, isGroupChat, vendorId: vendor.id });
      }
    });
  }

  return sock;
}

/** WhatsApp shows pairing codes as XXXX-XXXX. */
export function formatPairingCode(code) {
  const clean = String(code || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return clean.length === 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}

/** Folder holding a vendor's Baileys session files. */
export function getAuthDir(vendor) {
  return path.join(AUTH_ROOT, vendor.auth_state_key);
}
