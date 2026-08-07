import { supabase } from '../db/supabaseClient.js';

/**
 * Which groups get product broadcasts. Priority order:
 *
 * 1. GROUP_JID_LIST in .env (explicit group JIDs) — for pinpoint testing
 * 2. The `groups` table — populated by vendors typing /register inside
 *    a group, so the vendor controls this without touching the DB.
 */
export async function getGroupRecipients() {
  if (process.env.GROUP_JID_LIST) {
    return process.env.GROUP_JID_LIST.split(',')
      .map((g) => g.trim())
      .filter(Boolean);
  }

  const { data, error } = await supabase.from('groups').select('jid');

  if (error) {
    console.error('Failed to fetch groups for broadcast:', error);
    return [];
  }

  return data.map((g) => g.jid);
}

/**
 * Called when someone types /register inside a group.
 */
export async function registerGroup(jid, name) {
  const { error } = await supabase
    .from('groups')
    .upsert({ jid, name }, { onConflict: 'jid' });

  if (error) {
    console.error('Failed to register group:', error);
    return false;
  }
  return true;
}