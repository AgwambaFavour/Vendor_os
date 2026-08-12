import StatusTicks from './StatusTicks';

const BORDER_COLOR = {
  new: 'border-l-wa-green',
  processing: 'border-l-amber-400',
  packed: 'border-l-blue-400',
  shipped: 'border-l-wa-teal',
  delivered: 'border-l-wa-dark',
  cancelled: 'border-l-red-300',
};

export default function OrderCard({ order }) {
  const itemCount = order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border-l-4 ${
        BORDER_COLOR[order.status] || 'border-l-gray-300'
      } p-4 flex flex-col gap-2`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium text-wa-ink">
            {order.customers?.display_name || order.customers?.whatsapp_jid || 'Customer'}
          </p>
          <p className="text-sm text-wa-muted">
            {itemCount} item{itemCount === 1 ? '' : 's'}
          </p>
        </div>
        <p className="font-semibold text-wa-dark">
          ₦{Number(order.total_naira).toLocaleString()}
        </p>
      </div>
      <StatusTicks status={order.status} />
    </div>
  );
}