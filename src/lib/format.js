import { supabase } from './supabaseClient'

export function formatRWF(amount) {
  const n = Number(amount ?? 0)
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' RWF'
}

export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86400000)
}

export function isSaturday(dateStr) {
  const d = new Date(dateStr)
  return d.getDay() === 6
}

export async function logActivity({ userId, action, entityType, entityId, details }) {
  try {
    await supabase.from('activity_logs').insert({
      user_id: userId ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      details: details ?? {}
    })
  } catch (err) {
    console.warn('activity log failed', err)
  }
}

export const STATUS_COLORS = {
  active: 'moto', paid: 'moto', completed: 'moto', pending: 'cash', partial: 'cash',
  unpaid: 'rust', overdue: 'rust', waived: 'ink-soft', cancelled: 'ink-soft',
  garage: 'cash', maintenance: 'cash', sold: 'ink-soft', inactive: 'ink-soft'
}
