const TONE_CLASSES = {
  moto: 'bg-moto-50 text-moto-700 border-moto-100',
  cash: 'bg-cash-100/60 text-cash-600 border-cash-100',
  rust: 'bg-rust-100/60 text-rust-600 border-rust-100',
  'ink-soft': 'bg-paper-raised text-ink-soft border-line'
}

const STATUS_TONE = {
  active: 'moto', paid: 'moto', completed: 'moto',
  pending: 'cash', partial: 'cash', garage: 'cash', maintenance: 'cash',
  unpaid: 'rust', overdue: 'rust',
  waived: 'ink-soft', cancelled: 'ink-soft', sold: 'ink-soft', inactive: 'ink-soft'
}

export default function StatusBadge({ status }) {
  if (!status) return null
  const tone = STATUS_TONE[status] ?? 'ink-soft'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${TONE_CLASSES[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${tone === 'moto' ? 'bg-moto-500' : tone === 'cash' ? 'bg-cash-500' : tone === 'rust' ? 'bg-rust-500' : 'bg-ink-soft'}`} />
      {status.replace('_', ' ')}
    </span>
  )
}
