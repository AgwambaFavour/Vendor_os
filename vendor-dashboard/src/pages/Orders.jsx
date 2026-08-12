import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import OrderCard from '../components/OrderCard';
import BottomNav from '../components/BottomNav';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getOrders();
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-wa-bg pb-20">  {/* was pb-6 */}
      <header className="bg-wa-dark px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-white text-lg font-semibold">Orders</h1>
        <button onClick={load} className="text-white/80 text-sm">
          Refresh
        </button>
      </header>

      <main className="px-4 pt-4 flex flex-col gap-3">
        {loading && <p className="text-wa-muted text-sm text-center mt-8">Loading orders...</p>}

        {!loading && error && (
          <p className="text-red-500 text-sm text-center mt-8">{error}</p>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="text-center mt-16">
            <p className="text-wa-ink font-medium">No orders yet</p>
            <p className="text-wa-muted text-sm mt-1">
              Orders placed by customers on WhatsApp will show up here.
            </p>
          </div>
        )}
        <BottomNav />
        {!loading &&
          !error &&
          orders.map((order) => <OrderCard key={order.id} order={order} />)}
      </main>
    </div>
  );
}