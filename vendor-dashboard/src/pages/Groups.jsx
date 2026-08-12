import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import BottomNav from '../components/BottomNav';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getGroups();
      setGroups(data);
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
    <div className="min-h-screen bg-wa-bg pb-20">
      <header className="bg-wa-dark px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-white text-lg font-semibold">Groups</h1>
        <button onClick={load} className="text-white/80 text-sm">
          Refresh
        </button>
      </header>

      <main className="px-4 pt-4 flex flex-col gap-3">
        {loading && <p className="text-wa-muted text-sm text-center mt-8">Loading groups...</p>}

        {!loading && error && (
          <p className="text-red-500 text-sm text-center mt-8">{error}</p>
        )}

        {!loading && !error && groups.length === 0 && (
          <div className="text-center mt-16">
            <p className="text-wa-ink font-medium">No groups registered yet</p>
            <p className="text-wa-muted text-sm mt-1">
              Type <span className="font-mono text-wa-teal">/register</span> inside a WhatsApp
              group to start sending product updates there.
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          groups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-wa-bubble flex items-center justify-center text-wa-dark font-semibold">
                {(group.name || group.jid)[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-wa-ink">{group.name || 'Unnamed group'}</p>
                <p className="text-xs text-wa-muted">
                  Added {new Date(group.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
      </main>

      <BottomNav />
    </div>
  );
}