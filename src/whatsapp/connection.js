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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, '../../auth_state');

const logger = pino({ level: process.env.LOG_LEVEL || 'silent' });

/**
 * Starts (or resumes) a WhatsApp connection for a single vendor.
 *
 * Auth session is persisted to disk (AUTH_DIR) so the vendor only
 * has to scan the QR code once. On restart, the saved session is
 * reused automatically.
 *
 * @param {object} handlers - optional event callbacks
 * @param {(sock) => void} handlers.onReady - called once connected
 * @param {(msg) => void} handlers.onMessage - called on incoming messages
 * @returns {Promise<import('@whiskeysockets/baileys').WASocket>}
 */
export async function connectWhatsApp(handlers = {}) {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    // Emulating a desktop client + syncFullHistory gets WhatsApp to push
    // your full contact list on pairing. Without both of these, contact
    // sync is partial/unreliable (confirmed on this project — some
    // accounts get nothing at all with the default browser/web config).
    browser: ['Windows', 'Chrome', '1.0.0'],
    syncFullHistory: true,
  });

  sock.ev.on('creds.update', saveCreds);

  // Baileys removed its built-in in-memory store in v6.6+, so we track
  // known contacts ourselves. This is what Status posting relies on
  // (see testPostStatus.js) — WhatsApp requires an explicit list of
  // recipient JIDs for status@broadcast, it won't infer "everyone".
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

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\nScan this QR code with the vendor\'s WhatsApp (Linked Devices):\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        `Connection closed (code ${statusCode}). Reconnecting: ${shouldReconnect}`
      );

      if (shouldReconnect) {
        // Simple reconnect. For production, add exponential backoff
        // so a flapping connection doesn't hammer WhatsApp's servers.
        setTimeout(() => connectWhatsApp(handlers), 3000);
      } else {
        console.log(
          'Session logged out. Delete the auth_state folder and re-scan the QR code.'
        );
      }
    } else if (connection === 'open') {
      console.log('WhatsApp connection established.');
      console.log('sock.user:', JSON.stringify(sock.user, null, 2));
      handlers.onReady?.(sock);
    }
  });

  if (handlers.onMessage) {
    sock.ev.on('messages.upsert', ({ messages, type }) => {
      console.log('messages.upsert fired. type:', type, 'count:', messages.length);

      if (type !== 'notify') return;

      const selfJid = sock.user?.id ? jidNormalizedUser(sock.user.id) : null;
      const selfLid = sock.user?.lid ? jidNormalizedUser(sock.user.lid) : null;

      for (const msg of messages) {
      const chatJid = jidNormalizedUser(msg.key.remoteJid);
      const isSelfChat = (selfJid && chatJid === selfJid) || (selfLid && chatJid === selfLid);

      if (msg.key.fromMe && !isSelfChat) continue;

      handlers.onMessage(msg, sock, { isSelfChat });
      }
      console.log('selfJid:', selfJid);

      for (const msg of messages) {
        const chatJid = jidNormalizedUser(msg.key.remoteJid);
        const isSelfChat = selfJid && chatJid === selfJid;

        console.log(
          'chatJid:', chatJid,
          'isSelfChat:', isSelfChat,
          'fromMe:', msg.key.fromMe,
          'hasImage:', !!msg.message?.imageMessage
        );

        if (msg.key.fromMe && !isSelfChat) continue;

        handlers.onMessage(msg, sock, { isSelfChat });
      }
    });
  }

  return sock;
}
