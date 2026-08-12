const STATUS_TICKS = {
  new: 'single',
  processing: 'double-gray',
  packed: 'double-gray',
  shipped: 'double-blue',
  delivered: 'double-blue',
  cancelled: 'none',
};

const STATUS_LABELS = {
  new: 'New',
  processing: 'Processing',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function Tick({ color }) {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
      <path
        d="M1 5.5L5 9.5L15 1"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function StatusTicks({ status }) {
  const kind = STATUS_TICKS[status] || 'none';
  const color = kind === 'double-blue' ? '#53BDEB' : '#8696A0';

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-2">
        {kind === 'single' && <Tick color={color} />}
        {(kind === 'double-gray' || kind === 'double-blue') && (
          <>
            <Tick color={color} />
            <Tick color={color} />
          </>
        )}
      </div>
      <span className="text-xs text-wa-muted">{STATUS_LABELS[status] || status}</span>
    </div>
  );
}