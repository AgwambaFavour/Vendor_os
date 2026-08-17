import { supabase } from './supabaseClient.js';

export async function getConnectedVendors() {
  const { data, error } = await supabase.from('vendors').select('*').eq('status', 'connected');
  if (error) {
    console.error('Failed to fetch connected vendors:', error);
    return [];
  }
  return data;
}

export async function getVendorByPhone(phone) {
  const { data, error } = await supabase.from('vendors').select('*').eq('phone', phone).maybeSingle();
  if (error) {
    console.error('Failed to fetch vendor by phone:', error);
    return null;
  }
  return data;
}

export async function updateVendorStatus(vendorId, status) {
  const { error } = await supabase.from('vendors').update({ status }).eq('id', vendorId);
  if (error) console.error('Failed to update vendor status:', error);
}