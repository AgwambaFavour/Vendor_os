const STATUS_STYLES = {
  in_stock: 'bg-wa-bubble text-wa-dark',
  low_stock: 'bg-amber-100 text-amber-700',
  sold_out: 'bg-red-100 text-red-600',
};

const STATUS_LABELS = {
  in_stock: 'In stock',
  low_stock: 'Low stock',
  sold_out: 'Sold out',
};

export default function ProductCard({ product, onEdit }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 flex justify-between items-start">
      <div className="flex-1">
        <p className="font-medium text-wa-ink">{product.name}</p>
        {product.description && (
          <p className="text-sm text-wa-muted mt-0.5">{product.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="font-semibold text-wa-dark">
            ₦{Number(product.price_naira).toLocaleString()}
          </span>
          <span className="text-xs text-wa-muted">· qty {product.quantity}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            STATUS_STYLES[product.status] || 'bg-gray-100 text-gray-600'
          }`}
        >
          {STATUS_LABELS[product.status] || product.status}
        </span>
        <button onClick={() => onEdit(product)} className="text-xs text-wa-teal font-medium">
          Edit
        </button>
      </div>
    </div>
  );
}