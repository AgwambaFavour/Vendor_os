import { supabase } from '../db/supabaseClient.js';

/**
 * Who should see Status posts. Priority order:
 *
 * 1. STATUS_JID_LIST in .env (explicit phone numbers) — for pinpoint testing
 * 2. STATUS_BROADCAST_ALL_CONTACTS=true in .env — everyone Baileys has
 *    synced as a contact (requires syncFullHistory + a fresh QR pairing
 *    to actually populate — see README)
 * 3. Default: the `customers` table, so the vendor controls the list
 *    directly rather than depending on WhatsApp's contact sync
 *
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 */
export async function getStatusRecipients(sock) {
  if (process.env.STATUS_JID_LIST) {
    return process.env.STATUS_JID_LIST.split(',')
      .map((n) => n.trim())
      .filter(Boolean)
      .map((n) => (n.includes('@') ? n : `${n}@s.whatsapp.net`));
  }

  if (process.env.STATUS_BROADCAST_ALL_CONTACTS === 'true') {
    const contacts = Array.from(sock?.knownContacts || []);
    if (contacts.length === 0) {
      console.warn(
        'STATUS_BROADCAST_ALL_CONTACTS is set but no contacts have synced ' +
        'yet. If this persists, delete auth_state/ and re-scan the QR code ' +
        '— full contact sync only happens on a fresh pairing.'
      );
    }
    return contacts;
  }

  const { data, error } = await supabase.from('customers').select('whatsapp_jid');

  if (error) {
    console.error('Failed to fetch customers for Status recipients:', error);
    return [];
  }

  return data.map((c) => c.whatsapp_jid);
}
