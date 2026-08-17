import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function Signup() {
  const [step, setStep] = useState('form'); // 'form' | 'qr'
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [vendorId, setVendorId] = useState(null);
  const [qrImage, setQrImage] = useState(null);
  const [error, setError] = useState('');
  const pollRef = useRef(null);
  const navigate = useNavigate();

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/onboarding/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, business_name: businessName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setVendorId(data.vendorId);
      setStep('qr');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (step !== 'qr' || !vendorId) return;

    pollRef.current = setInterval(async () => {
      const res = await fetch(`${API_URL}/api/onboarding/qr/${vendorId}`);
      const data = await res.json();

      if (data.status === 'connected') {
        clearInterval(pollRef.current);
        navigate('/');
        return;
      }
      if (data.qrImage) setQrImage(data.qrImage);
    }, 2000);

    return () => clearInterval(pollRef.current);
  }, [step, vendorId, navigate]);

  return (
    <div className="min-h-screen bg-wa-dark flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white rounded-xl p-6 shadow-lg">
        {step === 'form' ? (
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <h1 className="font-semibold text-wa-ink text-lg">Set up your store</h1>
            <div>
              <label className="text-sm text-wa-muted block mb-1">WhatsApp number</label>
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="2348012345678"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-wa-green"
              />
            </div>
            <div>
              <label className="text-sm text-wa-muted block mb-1">Business name</label>
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-wa-green"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button className="w-full bg-wa-green text-white font-medium rounded-lg py-2.5">
              Continue
            </button>
          </form>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <h1 className="font-semibold text-wa-ink text-lg">Scan with WhatsApp</h1>
            <p className="text-sm text-wa-muted text-center">
              Open WhatsApp → Linked Devices → Link a Device, and scan this code.
            </p>
            {qrImage ? (
              <img src={qrImage} alt="QR code" className="w-56 h-56" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-wa-muted text-sm">
                Generating QR code...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}