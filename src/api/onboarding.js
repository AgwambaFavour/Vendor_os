import { Router } from 'express';
import QRCode from 'qrcode';
import { supabase } from '../db/supabaseClient.js';
import { startOnboarding } from '../whatsapp/socketManager.js';
import { getState } from '../whatsapp/qrStore.js';

function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '');
}

export function onboardingRouter(buildHandlers) {
  const router = Router();

  router.post('/signup', async (req, res) => {
    const phone = normalizePhone(req.body.phone);
    const businessName = req.body.business_name;

    if (!phone) return res.status(400).json({ message: 'Phone number is required.' });

    const { data: existing } = await supabase.from('vendors').select('*').eq('phone', phone).maybeSingle();
    if (existing) {
      return res.status(409).json({ message: 'This number is already registered.' });
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

    startOnboarding(vendor, buildHandlers).catch((err) =>
      console.error('Failed to start onboarding socket:', err)
    );

    res.json({ vendorId: vendor.id });
  });

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