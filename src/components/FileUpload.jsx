import { useState } from 'react'
import { Upload, CheckCircle2, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const BUCKET = 'twarafleet'

export default function FileUpload({ folder, value, onChange }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const path = `${folder}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
      if (upErr) throw upErr
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      onChange(data.publicUrl)
    } catch (err) {
      setError('Upload failed — check the "twarafleet" storage bucket exists and is public.')
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line-strong bg-paper px-3 py-2 text-sm text-ink-soft hover:bg-moto-50">
        {busy ? <Loader2 size={16} className="animate-spin" /> : value ? <CheckCircle2 size={16} className="text-moto-500" /> : <Upload size={16} />}
        <span>{busy ? 'Uploading…' : value ? 'File attached — tap to replace' : 'Choose a file'}</span>
        <input type="file" className="hidden" onChange={handleFile} />
      </label>
      {error && <p className="mt-1 text-xs text-rust-500">{error}</p>}
      {value && !busy && (
        <a href={value} target="_blank" rel="noreferrer" className="mt-1 inline-block truncate text-xs text-moto-600 underline">
          View current file
        </a>
      )}
    </div>
  )
}
