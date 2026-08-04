import { registerGroup } from './groupRecipients.js';

/**
 * Call this from onMessage for every incoming message. It no-ops for
 * anything that isn't a /register command typed by you inside a group.
 */
export async function handleGroupCommand(msg, sock) {
  const chatJid = msg.key.remoteJid;
  if (!chatJid?.endsWith('@g.us')) return; // only groups
  if (!msg.key.fromMe) return; // only you can register a group

  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    '';

  if (text.trim().toLowerCase() !== '/register') return;

  let groupName = chatJid;
  try {
    const metadata = await sock.groupMetadata(chatJid);
    groupName = metadata.subject || chatJid;
  } catch (err) {
    console.warn('Could not fetch group metadata:', err);
  }

  const ok = await registerGroup(chatJid, groupName);

  await sock.sendMessage(chatJid, {
    text: ok
      ? `✅ "${groupName}" is now registered to receive product updates.`
      : `⚠️ Failed to register this group — check the bot logs.`,
  });

  console.log(ok ? `Group registered: ${groupName} (${chatJid})` : `Group registration failed: ${chatJid}`);
}