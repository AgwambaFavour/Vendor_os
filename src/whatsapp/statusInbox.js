import { downloadMediaMessage } from '@whiskeysockets/baileys';
import pino from 'pino';
import { getStatusRecipients } from './statusRecipients.js';

const logger = pino({ level: process.env.LOG_LEVEL || 'silent' });

// Simple sequential queue: if you forward 10 photos at once, they arrive
// as 10 near-simultaneous messages. Posting all 10 to Status in parallel
// risks tripping WhatsApp's rate limits. This processes one at a time
// with a short gap between sends instead.
let queue = Promise.resolve();
const DELAY_BETWEEN_POSTS_MS = 2500;

/**
 * Call this from onMessage for every incoming message. It no-ops for
 * anything that isn't an image sent in your own self-chat.
 */
export function handleForwardedImage(msg, sock, { isSelfChat }) {
  if (!isSelfChat) return;

  const imageMessage = msg.message?.imageMessage;
  if (!imageMessage) return; // not a photo — ignore text, videos, etc. for now

  // Chain onto the queue so posts happen strictly one after another.
  queue = queue.then(() => processImage(msg, sock, imageMessage));
}

async function processImage(msg, sock, imageMessage) {
  try {
    console.log('Forwarded image detected — downloading...');

    const buffer = await downloadMediaMessage(
      msg,
      'buffer',
      {},
      { logger, reuploadRequest: sock.updateMediaMessage }
    );

    const statusJidList = await getStatusRecipients(sock);

    if (statusJidList.length === 0) {
      console.warn(
        'No Status recipients configured — skipping post. Add customers ' +
        'to the database, or set STATUS_JID_LIST in .env for testing.'
      );
      return;
    }

    await sock.sendMessage(
      'status@broadcast',
      { image: buffer, caption: imageMessage.caption || '' },
      { statusJidList, broadcast: true }
    );

    console.log(`Posted to Status (${statusJidList.length} recipients).`);

    // Small gap before the next queued image, if any.
    await new Promise((r) => setTimeout(r, DELAY_BETWEEN_POSTS_MS));
  } catch (err) {
    console.error('Failed to process forwarded image:', err);
  }
}
