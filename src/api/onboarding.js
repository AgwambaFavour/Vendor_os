import { Router } from 'express';
import QRCode from 'qrcode';
import { supabase } from '../db/supabaseClient.js';
import { startOnboarding } from '../whatsapp/socketManager.js';
import { getState } from '../whatsapp/qrStore.js';

function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '');
}

/**
 * Pairing codes need the full international number with no leading 0
 * or '+', e.g. 2348012345678. Returns an error message, or null if OK.
 */
function validatePhone(phone) {
  if (!phone) return 'Phone number is required.';
  if (phone.startsWith('0')) {
    return 'Use your full number with country code and no leading 0, e.g. 2348012345678.';
  }
  if (phone.length < 10 || phone.length > 15) {
    return 'That phone number doesn’t look right. Include your country code, e.g. 2348012345678.';
  }
  return null;
}

function parseMethod(method) {
  return method === 'qr' ? 'qr' : 'code'; // phone-number pairing is the default
}

async function getVendorById(id) {
  const { data } = await supabase.from('vendors').select('*').eq('id', id).maybeSingle();
  return data;
}

export function onboardingRouter(buildHandlers) {
  const router = Router();

  router.post('/signup', async (req, res) => {
    const phone = normalizePhone(req.body.phone);
    const businessName = req.body.business_name;
    const linkMethod = parseMethod(req.body.method);

    const phoneError = validatePhone(phone);
    if (phoneError) return res.status(400).json({ message: phoneError });

    const { data: existing } = await supabase.from('vendors').select('*').eq('phone', phone).maybeSingle();

    if (existing) {
      if (existing.status === 'connected') {
        return res.status(409).json({ message: 'This number is already registered. Log in instead.' });
      }

      // Signed up before but never finished linking (or got logged out):
      // let them link again instead of locking them out.
      if (businessName && businessName !== existing.business_name) {
        await supabase.from('vendors').update({ business_name: businessName }).eq('id', existing.id);
      }
      startOnboarding(existing, buildHandlers, {
        linkMethod,
        fresh: existing.status === 'disconnected',
      }).catch((err) => console.error('Failed to restart onboarding socket:', err));

      return res.json({ vendorId: existing.id, method: linkMethod });
    }

    const { data: vendor, error } = await supabase
      .from('vendors')
      .insert({
        phone,
        business_name: businessName || null,
        auth_state_key: phone, // one folder per phone number
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create vendor:', error);
      return res.status(500).json({ message: 'Failed to create vendor.' });
    }

    startOnboarding(vendor, buildHandlers, { linkMethod }).catch((err) =>
      console.error('Failed to start onboarding socket:', err)
    );

    res.json({ vendorId: vendor.id, method: linkMethod });
  });

  /**
   * Restart linking for a vendor — get a fresh pairing code, or switch
   * between pairing code and QR. Body: { method: 'code' | 'qr' }
   */
  router.post('/link/:vendorId/restart', async (req, res) => {
    const vendor = await getVendorById(req.params.vendorId);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found.' });
    if (vendor.status === 'connected') {
      return res.status(409).json({ message: 'This WhatsApp number is already linked.' });
    }

    const linkMethod = parseMethod(req.body?.method);
    startOnboarding(vendor, buildHandlers, {
      linkMethod,
      fresh: vendor.status === 'disconnected',
    }).catch((err) => console.error('Failed to restart onboarding socket:', err));

    res.json({ vendorId: vendor.id, method: linkMethod });
  });

  /**
   * Linking state for the dashboard to poll.
   * { status, method, pairingCode, qrImage, error }
   * status: 'starting' | 'awaiting_code' | 'awaiting_scan' | 'connected' | 'error'
   */
  router.get('/link/:vendorId', async (req, res) => {
    const state = getState(req.params.vendorId);
    if (!state) return res.json({ status: 'starting', method: null, pairingCode: null, qrImage: null, error: null });

    if (state.status === 'connected') {
      return res.json({ status: 'connected', method: state.method, pairingCode: null, qrImage: null, error: null });
    }

    const qrImage = state.method === 'qr' && state.qr ? await QRCode.toDataURL(state.qr) : null;
    res.json({
      status: state.status,
      method: state.method,
      pairingCode: state.method === 'code' ? state.pairingCode : null,
      qrImage,
      error: state.error || null,
    });
  });

  // Kept for older dashboard builds that still poll for a QR.
  router.get('/qr/:vendorId', async (req, res) => {
    const state = getState(req.params.vendorId);

    if (!state || !state.qr) {
      return res.json({ status: state?.status || 'starting', qrImage: null });
    }

    if (state.status === 'connected') {
      return res.json({ status: 'connected', qrImage: null });
    }

    const qrImage = await QRCode.toDataURL(state.qr);
    res.json({ status: state.status, qrImage });
  });

  router.get('/status/:vendorId', (req, res) => {
    const state = getState(req.params.vendorId);
    res.json({ status: state?.status || 'starting' });
  });

  return router;
}
