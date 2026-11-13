import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function Signup() {
  const [step, setStep] = useState('form'); // 'form' | 'link'
  const [method, setMethod] = useState('code'); // 'code' (phone number) | 'qr'
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [vendorId, setVendorId] = useState(null);
  const [link, setLink] = useState({ status: 'starting', pairingCode: null, qrImage: null, error: null });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef(null);
  const navigate = useNavigate();

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/onboarding/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, business_name: businessName, method }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setVendorId(data.vendorId);
      setLink({ status: 'starting', pairingCode: null, qrImage: null, error: null });
      setStep('link');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Get a fresh code, or switch between phone-number code and QR.
  async function restartLink(nextMethod) {
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/onboarding/link/${vendorId}/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: nextMethod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMethod(nextMethod);
      setLink({ status: 'starting', pairingCode: null, qrImage: null, error: null });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!link.pairingCode) return;
    try {
      await navigator.clipboard.writeText(link.pairingCode.replace('-', ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available (e.g. http on mobile) — the code is still on screen.
    }
  }

  useEffect(() => {
    if (step !== 'link' || !vendorId) return;

    async function poll() {
      try {
        const res = await fetch(`${API_URL}/api/onboarding/link/${vendorId}`);
        const data = await res.json();
        if (data.status === 'connected') {
          clearInterval(pollRef.current);
          navigate('/');
          return;
        }
        setLink(data);
      } catch {
        // Network blip — keep polling.
      }
    }

    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollRef.current);
  }, [step, vendorId, navigate]);

  const inputClass =
    'w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-wa-green';

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
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="2348012345678"
                className={inputClass}
              />
              <p className="text-xs text-wa-muted mt-1">Include your country code, no leading 0.</p>
            </div>
            <div>
              <label className="text-sm text-wa-muted block mb-1">Business name</label>
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className={inputClass}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button disabled={busy} className="w-full bg-wa-green text-white font-medium rounded-lg py-2.5 disabled:opacity-60">
              {busy ? 'Please wait...' : 'Continue'}
            </button>
            <button
              type="button"
              onClick={() => setMethod(method === 'code' ? 'qr' : 'code')}
              className="text-sm text-wa-muted underline"
            >
              {method === 'code'
                ? 'Have another device? Link with a QR code instead'
                : 'Link with your phone number instead'}
            </button>
          </form>
        ) : method === 'code' ? (
          <div className="flex flex-col items-center gap-4">
            <h1 className="font-semibold text-wa-ink text-lg">Link your WhatsApp</h1>

            {link.pairingCode ? (
              <>
                <button
                  type="button"
                  onClick={copyCode}
                  className="font-mono text-3xl tracking-widest text-wa-ink bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
                  aria-label="Copy pairing code"
                >
                  {link.pairingCode}
                </button>
                <p className="text-xs text-wa-muted">{copied ? 'Copied!' : 'Tap the code to copy it'}</p>
              </>
            ) : link.status === 'error' ? (
              <p className="text-sm text-red-500 text-center">{link.error}</p>
            ) : (
              <div className="h-16 flex items-center text-wa-muted text-sm">Getting your code...</div>
            )}

            <ol className="text-sm text-wa-muted list-decimal pl-5 space-y-1 self-stretch">
              <li>Open WhatsApp on this phone</li>
              <li>Tap ⋮ (or Settings) → <b>Linked devices</b> → <b>Link a device</b></li>
              <li>Tap <b>Link with phone number instead</b></li>
              <li>Enter the code above</li>
            </ol>
            <p className="text-xs text-wa-muted text-center">
              You should also get a WhatsApp notification asking you to enter the code.
            </p>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => restartLink('code')}
                className="text-sm text-wa-green font-medium disabled:opacity-60"
              >
                Get a new code
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => restartLink('qr')}
                className="text-sm text-wa-muted underline disabled:opacity-60"
              >
                Scan a QR code instead
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <h1 className="font-semibold text-wa-ink text-lg">Scan with WhatsApp</h1>
            <p className="text-sm text-wa-muted text-center">
              Open WhatsApp → Linked Devices → Link a Device, and scan this code.
            </p>
            {link.qrImage ? (
              <img src={link.qrImage} alt="QR code" className="w-56 h-56" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-wa-muted text-sm">
                Generating QR code...
              </div>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="button"
              disabled={busy}
              onClick={() => restartLink('code')}
              className="text-sm text-wa-muted underline disabled:opacity-60"
            >
              Link with your phone number instead
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
