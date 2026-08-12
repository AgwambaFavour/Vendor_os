import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function Login() {
  const [step, setStep] = useState('phone'); // 'phone' | 'code'
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSendCode(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.requestOtp(phone);
      setStep('code');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await api.verifyOtp(phone, code);
      localStorage.setItem('vendor_token', token);
      navigate('/orders');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-wa-dark flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-wa-green flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M12 2a10 10 0 00-8.6 15L2 22l5.1-1.3A10 10 0 1012 2zm5.6 14.3c-.2.7-1.4 1.3-2 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.6-1.2-3.1s.8-2.2 1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5.2.5.7 1.8.8 1.9.1.2.1.3 0 .5-.1.2-.1.3-.3.5-.1.2-.3.4-.4.5-.2.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.5 1.5.3.1.5.1.6-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.6-.1.2.1 1.5.7 1.8.8.3.2.5.2.6.3.1.2.1.9-.1 1.6z" />
            </svg>
          </div>
          <h1 className="text-white text-xl font-semibold">Vendor OS</h1>
          <p className="text-white/70 text-sm mt-1">Manage orders from WhatsApp</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg">
          {step === 'phone' ? (
            <form onSubmit={handleSendCode} className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-wa-muted block mb-1">WhatsApp number</label>
                <input
                  type="tel"
                  required
                  placeholder="2348012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-wa-ink focus:outline-none focus:ring-2 focus:ring-wa-green"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-wa-green text-white font-medium rounded-lg py-2.5 disabled:opacity-60"
              >
                {loading ? 'Sending...' : 'Send code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-wa-muted block mb-1">
                  Enter the code sent to your WhatsApp
                </label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-wa-ink tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-wa-green"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-wa-green text-white font-medium rounded-lg py-2.5 disabled:opacity-60"
              >
                {loading ? 'Verifying...' : 'Verify & continue'}
              </button>
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="text-sm text-wa-teal"
              >
                Use a different number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}