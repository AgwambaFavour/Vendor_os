import { downloadMediaMessage } from '@whiskeysockets/baileys';
import pino from 'pino';
import { getStatusRecipients } from './statusRecipients.js';
import { getGroupRecipients } from './groupRecipients.js';

const logger = pino({ level: process.env.LOG_LEVEL || 'silent' });

// Simple sequential queue: if you forward several photos/videos at once,
// they arrive as near-simultaneous messages. Posting all of them in
// parallel risks tripping WhatsApp's rate limits. This processes one at
// a time with a short gap between sends instead.
let queue = Promise.resolve();
const DELAY_BETWEEN_POSTS_MS = 2500;

/**
 * Call this from onMessage for every incoming message. It no-ops for
 * anything that isn't an image or video sent in your own self-chat.
 */
export function handleForwardedMedia(msg, sock, { isSelfChat }) {
  if (!isSelfChat) return;

  const imageMessage = msg.message?.imageMessage;
  const videoMessage = msg.message?.videoMessage;

  if (!imageMessage && !videoMessage) return; // not media we handle — ignore text etc.

  const mediaType = imageMessage ? 'image' : 'video';
  const mediaMessage = imageMessage || videoMessage;

  // Chain onto the queue so posts happen strictly one after another.
  queue = queue.then(() => processMedia(msg, sock, mediaType, mediaMessage));
}

async function processMedia(msg, sock, mediaType, mediaMessage) {
  try {
    console.log(`Forwarded ${mediaType} detected — downloading...`);

    const buffer = await downloadMediaMessage(
      msg,
      'buffer',
      {},
      { logger, reuploadRequest: sock.updateMediaMessage }
    );

    const caption = mediaMessage.caption || '';
    // { image: buffer, caption } or { video: buffer, caption }
    const content = { [mediaType]: buffer, caption };

    // --- Status post ---
    const statusJidList = await getStatusRecipients(sock);

    if (statusJidList.length === 0) {
      console.warn(
        'No Status recipients configured — skipping post. Add customers ' +
        'to the database, or set STATUS_JID_LIST in .env for testing.'
      );
    } else {
      const result = await sock.sendMessage(
        'status@broadcast',
        content,
        { statusJidList, broadcast: true }
      );
      console.log('Send result:', JSON.stringify(result, null, 2));
      console.log(`Posted ${mediaType} to Status (${statusJidList.length} recipients).`);
    }

    // --- Group broadcast ---
    const groupJidList = await getGroupRecipients();

    if (groupJidList.length === 0) {
      console.warn(
        'No groups registered — skipping group broadcast. Type /register ' +
        'inside a group, or set GROUP_JID_LIST in .env for testing.'
      );
    } else {
      for (const groupJid of groupJidList) {
        try {
          await sock.sendMessage(groupJid, content);
          console.log(`Sent ${mediaType} to group: ${groupJid}`);
        } catch (err) {
          console.error(`Failed to send ${mediaType} to group ${groupJid}:`, err);
        }
      }
    }

    // Small gap before the next queued item, if any.
    await new Promise((r) => setTimeout(r, DELAY_BETWEEN_POSTS_MS));
  } catch (err) {
    console.error(`Failed to process forwarded ${mediaType}:`, err);
  }
}