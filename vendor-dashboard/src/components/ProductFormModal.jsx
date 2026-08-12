import { useState, useEffect } from 'react';

export default function ProductFormModal({ product, onClose, onSave }) {
  const isEdit = Boolean(product);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price_naira: '',
    quantity: '',
    status: 'in_stock',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        description: product.description || '',
        price_naira: product.price_naira ?? '',
        quantity: product.quantity ?? '',
        status: product.status || 'in_stock',
      });
    }
  }, [product]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-20">
      <div className="bg-white rounded-t-xl sm:rounded-xl w-full sm:max-w-sm p-5">
        <h2 className="font-semibold text-wa-ink mb-4">
          {isEdit ? 'Edit product' : 'Add product'}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-sm text-wa-muted block mb-1">Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wa-green"
            />
          </div>
          <div>
            <label className="text-sm text-wa-muted block mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wa-green"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm text-wa-muted block mb-1">Price (₦)</label>
              <input
                required
                type="number"
                value={form.price_naira}
                onChange={(e) => update('price_naira', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wa-green"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm text-wa-muted block mb-1">Quantity</label>
              <input
                type="number"
                value={form.quantity}
                onChange={(e) => update('quantity', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wa-green"
              />
            </div>
          </div>
          {isEdit && (
            <div>
              <label className="text-sm text-wa-muted block mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => update('status', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wa-green"
              >
                <option value="in_stock">In stock</option>
                <option value="low_stock">Low stock</option>
                <option value="sold_out">Sold out</option>
              </select>
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 rounded-lg py-2.5 text-wa-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-wa-green text-white rounded-lg py-2.5 font-medium disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}