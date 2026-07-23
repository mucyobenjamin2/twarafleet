import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { LoadingSpinner } from './Feedback'

export default function ResourceForm({ config, initialValues, onSubmit, onCancel, submitLabel }) {
  const [formData, setFormData] = useState(initialValues || {})
  const [relationOptions, setRelationOptions] = useState({})
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // 1. Fetch Relation Options (Filtered strictly by Logged-in Admin's owner_id)
  useEffect(() => {
    async function loadRelationOptions() {
      try {
        setLoadingOptions(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const optionsMap = {}

        for (const field of config.fields) {
          if (field.type === 'relation' && field.relation) {
            // 🔥 ISUKU NYAYO: Filter strictly by owner_id to avoid showing other admins' data
            let query = supabase
              .from(field.relation.table)
              .select(`id, ${field.relation.labelKey}`)
              .eq('owner_id', user.id)

            // If relation is plate_number on drivers, select plate_number directly
            if (field.relation.table === 'motorcycles' && field.relation.labelKey === 'plate_number') {
              query = supabase
                .from('motorcycles')
                .select('id, plate_number')
                .eq('owner_id', user.id)
                .order('plate_number', { ascending: true })
            }

            const { data, error: fetchErr } = await query

            if (!fetchErr && data) {
              optionsMap[field.key] = data.map(item => ({
                value: field.key === 'plate_number' ? item.plate_number : item.id,
                label: item[field.relation.labelKey] || item.plate_number || item.id
              }))
            }
          }
        }

        setRelationOptions(optionsMap)
      } catch (err) {
        console.error('Error loading relation options:', err.message)
      } finally {
        setLoadingOptions(false)
      }
    }

    loadRelationOptions()
  }, [config])

  function handleChange(key, value) {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      setSubmitting(true)
      setError(null)

      // Automatically attach owner_id if creating new entry
      const { data: { user } } = await supabase.auth.getUser()
      const payload = { ...formData }
      if (user && !payload.owner_id) {
        payload.owner_id = user.id
      }

      await onSubmit(payload)
    } catch (err) {
      setError(err.message || 'An error occurred while saving.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingOptions) {
    return <div className="p-6 text-center text-sm text-ink-soft animate-pulse">Iri gukurura urutonde rw'ibinyabiziga byawe...</div>
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

              {/* RELATION FIELD (PROPERLY FILTERED) */}
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

              {/* DEFAULT INPUT (TEXT, NUMBER, DATE, EMAIL, PASSWORD) */}
              {!['select', 'relation', 'textarea', 'boolean'].includes(field.type) && (
                <input
                  type={field.type || 'text'}
                  value={value}
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
