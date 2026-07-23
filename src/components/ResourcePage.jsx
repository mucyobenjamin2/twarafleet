import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useTable } from '../hooks/useTable'
import DataTable from './DataTable'
import ResourceForm from './ResourceForm'
import Modal from './Modal'
import ConfirmDialog from './ConfirmDialog'
import { EmptyState, LoadingSpinner } from './Feedback'

function getNested(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj)
}

export default function ResourcePage({ config }) {
  const { rows, loading, error, create, update, remove } = useTable(config.table, { select: config.select })
  const [modal, setModal] = useState(null) // { mode: 'create' | 'edit', row: null }
  const [pendingDelete, setPendingDelete] = useState(null)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query || config.searchKeys.length === 0) return rows
    const q = query.toLowerCase()
    return rows.filter(row => config.searchKeys.some(key => String(getNested(row, key) ?? '').toLowerCase().includes(q)))
  }, [rows, query, config.searchKeys])

  async function handleSubmit(values) {
    if (modal?.mode === 'edit') await update(modal.row.id, values)
    else await create(values)
    setModal(null)
  }

  async function handleDelete() {
    await remove(pendingDelete.id)
    setPendingDelete(null)
  }

  return (
    <div className="space-y-4">
      {/* HEADER SECTION */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{config.titlePlural}</h1>
          <p className="text-sm text-ink-soft">{rows.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          {config.searchKeys.length > 0 && (
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input
                value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…"
                className="w-44 rounded-lg border border-line bg-paper-raised py-2 pl-8 pr-3 text-sm focus:border-moto-500 sm:w-56"
              />
            </div>
          )}
          <button
            onClick={() => setModal({ mode: 'create', row: null })}
            className="flex items-center gap-1.5 rounded-lg bg-moto-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-moto-600 shadow-sm transition-all"
          >
            <Plus size={16} /> Add {config.titleSingular}
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-rust-100/60 px-3 py-2 text-sm text-rust-600">{error}</p>}

      {/* TABLE LIST DISPLAY */}
      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={`No ${config.titlePlural.toLowerCase()} yet`}
          message={`Add your first ${config.titleSingular.toLowerCase()} to start tracking it here.`}
          action={
            <button onClick={() => setModal({ mode: 'create', row: null })} className="rounded-lg bg-moto-500 px-4 py-2 text-sm font-medium text-white hover:bg-moto-600">
              Add {config.titleSingular}
            </button>
          }
        />
      ) : (
        <DataTable
          columns={config.columns}
          rows={filtered}
          onEdit={row => setModal({ mode: 'edit', row })}
          onDelete={row => setPendingDelete(row)}
        />
      )}

      {/* MODAL ALWAYS RENDERS RESOURCEFORM ON TOP */}
      <Modal 
        open={Boolean(modal)} 
        title={modal?.mode === 'edit' ? `Edit ${config.titleSingular}` : `Add ${config.titleSingular}`} 
        onClose={() => setModal(null)} 
        wide
      >
        {modal && (
          <ResourceForm
            config={config}
            initialValues={modal.row || {}}
            onSubmit={handleSubmit}
            onCancel={() => setModal(null)}
            submitLabel={modal.mode === 'edit' ? 'Save changes' : 'Add'}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        message={`This will permanently delete this ${config.titleSingular.toLowerCase()} record.`}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
