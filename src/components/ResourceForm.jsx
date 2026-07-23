import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ResourceForm({ config, initialValues, onSubmit, onCancel, submitLabel }) {
  const [formData, setFormData] = useState(initialValues || {})
  const [relationOptions, setRelationOptions] = useState({})
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    async function loadOptions() {
      const relationFields = config.fields.filter(f => f.type === 'relation' && f.relation)
      if (relationFields.length === 0) return

      setLoadingOptions(true)
      const optionsMap = {}

      for (const field of relationFields) {
        // Niba ifite custom optionsLoader muri config, nk'uko tuyishyira muri driverConfig
        if (field.optionsLoader) {
          const loaded = await field.optionsLoader()
          if (isMounted) optionsMap[field.key] = loaded
        } else {
          // Relational lookup isanzwe
          const { data } = await supabase
            .from(field.relation.table)
            .select(`id, ${field.relation.labelKey}`)
          if (data && isMounted) {
            optionsMap[field.key] = data.map(item => ({
              value: item.id,
              label: item[field.relation.labelKey]
            }))
          }
        }
      }

      if (isMounted) {
        setRelationOptions(optionsMap)
        setLoadingOptions(false)
      }
    }

    loadOptions()
    return () => { isMounted = false }
  }, [config])

  function handleChange(key, value) {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      setSubmitting(true)
      setError(null)
      await onSubmit(formData)
    } catch (err) {
      setError(err.message || 'Error occurred while saving.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingOptions) {
    return <div className="p-6 text-center text-sm text-ink-soft animate-pulse">Loading form options…</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {config.fields.map(field => {
          const value = formData[field.key] ?? field.default ?? ''

          return (
            <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                {field.label} {field.required && <span className="text-rose-500">*</span>}
              </label>

              {field.type === 'select' && (
                <select
                  value={value}
                  required={field.required}
                  onChange={e => handleChange(field.key, e.target.value)}
                  className="w-full rounded-xl border border-line bg-paper-raised p-2.5 text-sm text-ink focus:border-moto-500 focus:outline-none"
                >
                  <option value="">-- Select {field.label} --</option>
                  {field.options?.map(opt => (
                    <option key={opt} value={opt}>
                      {opt.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              )}

              {field.type === 'relation' && (
                <select
                  value={value}
                  required={field.required}
                  onChange={e => handleChange(field.key, e.target.value)}
                  className="w-full rounded-xl border border-line bg-paper-raised p-2.5 text-sm text-ink focus:border-moto-500 focus:outline-none"
                >
                  <option value="">-- Select {field.label} --</option>
                  {(relationOptions[field.key] || []).map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {field.type === 'textarea' && (
                <textarea
                  rows={3}
                  value={value}
                  required={field.required}
                  onChange={e => handleChange(field.key, e.target.value)}
                  className="w-full rounded-xl border border-line bg-paper-raised p-2.5 text-sm text-ink focus:border-moto-500 focus:outline-none"
                />
              )}

              {field.type === 'boolean' && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    checked={!!formData[field.key]}
                    onChange={e => handleChange(field.key, e.target.checked)}
                    className="w-4 h-4 rounded text-moto-600 focus:ring-moto-500 border-line"
                  />
                  <span className="text-sm font-medium text-ink">{field.label}</span>
                </div>
              )}

              {!['select', 'relation', 'textarea', 'boolean'].includes(field.type) && (
                <input
                  type={field.type || 'text'}
                  value={field.type === 'file' ? undefined : value}
                  required={field.required}
                  onChange={e => handleChange(field.key, e.target.value)}
                  className="w-full rounded-xl border border-line bg-paper-raised p-2.5 text-sm text-ink focus:border-moto-500 focus:outline-none"
                />
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-line pt-4 mt-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-xl border border-line bg-paper px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-moto-500 px-5 py-2 text-sm font-semibold text-white hover:bg-moto-600 transition-colors shadow-sm disabled:opacity-50"
        >
          {submitting ? 'Saving…' : (submitLabel || 'Save')}
        </button>
      </div>
    </form>
  )
}
