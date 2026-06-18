import { useEffect, useState } from 'react'
import { useLookup } from '../hooks/useLookup'
import FileUpload from './FileUpload'

function defaultFor(field) {
  if (field.default === 'today') return new Date().toISOString().slice(0, 10)
  if (field.default !== undefined) return field.default
  if (field.type === 'boolean') return false
  return ''
}

function RelationField({ field, value, onChange }) {
  const { options, loading } = useLookup(field.relation.table, `id, ${field.relation.labelKey}`)
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      required={field.required}
      className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-moto-500"
    >
      <option value="">{loading ? 'Loading…' : `Select ${field.label.toLowerCase()}`}</option>
      {options.map(opt => (
        <option key={opt.id} value={opt.id}>{opt[field.relation.labelKey]}</option>
      ))}
    </select>
  )
}

export default function ResourceForm({ config, initialValues, onSubmit, onCancel, submitLabel = 'Save' }) {
  const [values, setValues] = useState(() => {
    const base = {}
    config.fields.forEach(f => { base[f.key] = initialValues?.[f.key] ?? defaultFor(f) })
    return base
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const base = {}
    config.fields.forEach(f => { base[f.key] = initialValues?.[f.key] ?? defaultFor(f) })
    setValues(base)
  }, [initialValues, config])

  function set(key, val) {
    setValues(v => ({ ...v, [key]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = { ...values }
      config.fields.forEach(f => {
        if (f.type === 'number' && payload[f.key] === '') payload[f.key] = null
        if (f.type === 'date' && payload[f.key] === '') payload[f.key] = null
        if (f.type === 'relation' && payload[f.key] === '') payload[f.key] = null
      })
      await onSubmit(payload)
    } catch (err) {
      setError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {config.helperNote && (
        <p className="rounded-lg bg-moto-50 px-3 py-2 text-xs text-moto-700">{config.helperNote}</p>
      )}
      {config.fields.map(field => (
        <div key={field.key}>
          <label className="mb-1 block text-sm font-medium text-ink">
            {field.label}{field.required && <span className="text-rust-500"> *</span>}
          </label>

          {field.type === 'text' && (
            <input
              type="text" required={field.required} value={values[field.key] ?? ''}
              onChange={e => set(field.key, e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-moto-500"
            />
          )}

          {field.type === 'number' && (
            <input
              type="number" step="any" required={field.required} value={values[field.key] ?? ''}
              onChange={e => set(field.key, e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm font-mono text-ink focus:border-moto-500"
            />
          )}

          {field.type === 'date' && (
            <input
              type="date" required={field.required} value={values[field.key] ?? ''}
              onChange={e => set(field.key, e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-moto-500"
            />
          )}

          {field.type === 'textarea' && (
            <textarea
              rows={3} value={values[field.key] ?? ''}
              onChange={e => set(field.key, e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-moto-500"
            />
          )}

          {field.type === 'select' && (
            <select
              value={values[field.key] ?? ''} required={field.required}
              onChange={e => set(field.key, e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm capitalize text-ink focus:border-moto-500"
            >
              {field.options.map(opt => <option key={opt} value={opt} className="capitalize">{opt.replace('_', ' ')}</option>)}
            </select>
          )}

          {field.type === 'boolean' && (
            <select
              value={values[field.key] ? 'true' : 'false'}
              onChange={e => set(field.key, e.target.value === 'true')}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-moto-500"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          )}

          {field.type === 'relation' && (
            <RelationField field={field} value={values[field.key]} onChange={val => set(field.key, val)} />
          )}

          {field.type === 'file' && (
            <FileUpload folder={field.folder ?? 'files'} value={values[field.key]} onChange={url => set(field.key, url)} />
          )}
        </div>
      ))}

      {error && <p className="text-sm text-rust-500">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-paper">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="rounded-lg bg-moto-500 px-4 py-2 text-sm font-medium text-white hover:bg-moto-600 disabled:opacity-60">
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
