import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import BottomNav from '../components/BottomNav';
import ProductCard from '../components/ProductCard';
import ProductFormModal from '../components/ProductFormModal';

export default function Catalogue() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalProduct, setModalProduct] = useState(null); // null = closed, {} = adding, product = editing
  const [showModal, setShowModal] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setModalProduct(null);
    setShowModal(true);
  }

  function openEdit(product) {
    setModalProduct(product);
    setShowModal(true);
  }

  async function handleSave(form) {
    if (modalProduct) {
      await api.updateProduct(modalProduct.id, form);
    } else {
      await api.addProduct(form);
    }
    await load();
  }

  return (
    <div className="min-h-screen bg-wa-bg pb-20">
      <header className="bg-wa-dark px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-white text-lg font-semibold">Catalogue</h1>
        <button onClick={openAdd} className="text-white/80 text-sm font-medium">
          + Add
        </button>
      </header>

      <main className="px-4 pt-4 flex flex-col gap-3">
        {loading && <p className="text-wa-muted text-sm text-center mt-8">Loading catalogue...</p>}

        {!loading && error && (
          <p className="text-red-500 text-sm text-center mt-8">{error}</p>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="text-center mt-16">
            <p className="text-wa-ink font-medium">No products yet</p>
            <p className="text-wa-muted text-sm mt-1">
              Add one here, or type{' '}
              <span className="font-mono text-wa-teal">/addproduct Name, Price</span> on
              WhatsApp.
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          products.map((product) => (
            <ProductCard key={product.id} product={product} onEdit={openEdit} />
          ))}
      </main>

      {showModal && (
        <ProductFormModal
          product={modalProduct}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}

      <BottomNav />
    </div>
  );
}