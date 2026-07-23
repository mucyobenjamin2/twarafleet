import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ResourceForm({ config, initialValues, onSubmit, onCancel, submitLabel }) {
  const [formData, setFormData] = useState(initialValues || {})
  const [relationOptions, setRelationOptions] = useState({})
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Load relation options ONLY when the form component is explicitly rendered inside Modal
  useEffect(() => {
    let isMounted = true

    async function loadRelationOptions() {
      const relationFields = config.fields.filter(f => f.type === 'relation' && f.relation)
      if (relationFields.length === 0) return

      try {
        setLoadingOptions(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const optionsMap = {}

        for (const field of relationFields) {
          // 🔥 ISUKU NYAYO: Fetch strictly options belonging to currently logged-in Admin
          let query = supabase
            .from(field.relation.table)
            .select(`id, ${field.relation.labelKey}`)
            .eq('owner_id', user.id)

          const { data, error: fetchErr } = await query

          if (!fetchErr && data && isMounted) {
            optionsMap[field.key] = data.map(item => ({
              value: item.id,
              label: item[field.relation.labelKey] || item.id
            }))
          }
        }

        if (isMounted) setRelationOptions(optionsMap)
      } catch (err) {
        console.error('Error loading relation options:', err.message)
      } finally {
        if (isMounted) setLoadingOptions(false)
      }
    }

    loadRelationOptions()

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
      setError(err.message || 'An error occurred while saving.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingOptions) {
    return <div className="p-6 text-center text-sm text-ink-soft animate-pulse">Iri gukurura urutonde...</div>
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

              {/* SELECT FIELD */}
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

              {/* RELATION FIELD */}
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

              {/* TEXTAREA FIELD */}
              {field.type === 'textarea' && (
                <textarea
                  rows={3}
                  value={value}
                  required={field.required}
                  onChange={e => handleChange(field.key, e.target.value)}
                  className="w-full rounded-xl border border-line bg-paper-raised p-2.5 text-sm text-ink focus:border-moto-500 focus:outline-none"
                />
              )}

              {/* BOOLEAN FIELD */}
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

              {/* DEFAULT INPUT TYPES (TEXT, NUMBER, DATE, EMAIL, PASSWORD, FILE) */}
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

      {/* ACTION BUTTONS */}
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
