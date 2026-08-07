import { supabase } from './supabaseClient.js';

export async function findOrCreateCustomer(jid, displayName) {
  const { data: existing, error: fetchError } = await supabase
    .from('customers')
    .select('*')
    .eq('whatsapp_jid', jid)
    .maybeSingle();

  if (fetchError) {
    console.error('Failed to look up customer:', fetchError);
    return null;
  }

  if (existing) return existing;

  const { data: created, error: insertError } = await supabase
    .from('customers')
    .insert({ whatsapp_jid: jid, display_name: displayName || null })
    .select()
    .single();

  if (insertError) {
    console.error('Failed to create customer:', insertError);
    return null;
  }

  return created;
}