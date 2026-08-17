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
 * @param {object} vendor - row from the `vendors` table
 * @param {object} handlers - { onReady, onMessage, onQr }
 */
export async function createVendorSocket(vendor, handlers = {}) {
  const AUTH_DIR = path.join(AUTH_ROOT, vendor.auth_state_key);
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

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      handlers.onQr?.(qr, vendor);
      if (!handlers.onQr) {
        console.log(`\nScan this QR code for vendor ${vendor.phone}:\n`);
        qrcode.generate(qr, { small: true });
      }
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        `[${vendor.phone}] Connection closed (code ${statusCode}). Reconnecting: ${shouldReconnect}`
      );

      if (shouldReconnect) {
        setTimeout(() => createVendorSocket(vendor, handlers), 3000);
      } else {
        await updateVendorStatus(vendor.id, 'disconnected');
        console.log(`[${vendor.phone}] Logged out. Vendor must re-scan QR to reconnect.`);
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