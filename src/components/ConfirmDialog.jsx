import Modal from './Modal'

export default function ConfirmDialog({ open, title = 'Are you sure?', message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <p className="text-sm text-ink-soft">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-paper">
          Cancel
        </button>
        <button onClick={onConfirm} className="rounded-lg bg-rust-500 px-4 py-2 text-sm font-medium text-white hover:bg-rust-600">
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
