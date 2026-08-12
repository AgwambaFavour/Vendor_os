import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { generateOtp, verifyOtp } from './otpStore.js';

function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '');
}

export function authRouter(sock) {
  const router = Router();
  const vendorPhone = normalizePhone(process.env.VENDOR_PHONE);

  router.post('/request-otp', async (req, res) => {
    const phone = normalizePhone(req.body.phone);

    if (phone !== vendorPhone) {
      return res.status(403).json({ message: 'This number is not recognized.' });
    }

    const code = generateOtp(phone);

    try {
      await sock.sendMessage(`${phone}@s.whatsapp.net`, {
        text: `Your Vendor OS login code is ${code}. It expires in 5 minutes.`,
      });
      res.json({ sent: true });
    } catch (err) {
      console.error('Failed to send OTP:', err);
      res.status(500).json({ message: 'Failed to send code — try again.' });
    }
  });

  router.post('/verify-otp', (req, res) => {
    const phone = normalizePhone(req.body.phone);
    const { code } = req.body;

    if (phone !== vendorPhone || !verifyOtp(phone, code)) {
      return res.status(401).json({ message: 'Invalid or expired code.' });
    }

    const token = jwt.sign({ phone }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token });
  });

  return router;
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: 'Missing token.' });

  try {
    req.vendor = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
}