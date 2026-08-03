import { useEffect, useState } from 'react'
import { Bike, Plus, Search, Activity, X, Trash2, Edit3, ChevronRight, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { formatRWF, formatDate } from '../lib/format'

export default function Motorcycles() {
  const [motorcycles, setMotorcycles] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [selectedMoto, setSelectedMoto] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editMotoId, setEditMotoId] = useState(null)

  const [plateNumber, setPlateNumber] = useState('')
  const [brand, setBrand] = useState('Spiro')
  const [model, setModel] = useState('M2')
  const [engineNumber, setEngineNumber] = useState('')
  const [chassisNumber, setChassisNumber] = useState('')
  const [motorcyclePhone, setMotorcyclePhone] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [dailyTarget, setDailyTarget] = useState('6000')
  const [status, setStatus] = useState('active')

  const fetchMotorcycles = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('motorcycles')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
        setMotorcycles(data || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMotorcycles()
  }, [])

  const handleOpenEdit = (e, moto) => {
    e.stopPropagation()
    setIsEditing(true)
    setEditMotoId(moto.id)
    setPlateNumber(moto.plate_number || '')
    setBrand(moto.brand || 'Spiro')
    setModel(moto.model || 'M2')
    setEngineNumber(moto.engine_number || '')
    setChassisNumber(moto.chassis_number || '')
    setMotorcyclePhone(moto.motorcycle_phone || '')
    setPurchasePrice(moto.purchase_price || '')
    setPurchaseDate(moto.purchase_date || '')
    setDailyTarget(moto.daily_target || '6000')
    setStatus(moto.status || 'active')
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!plateNumber) {
      alert("Nyamuneka shyiramo nimero ya plaque!")
      return
    }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Nta mukoresha winjiye.")

      const payload = {
        owner_id: user.id,
        plate_number: plateNumber.trim().toUpperCase(),
        brand: brand.trim() || 'Spiro',
        model: model.trim() || 'M2',
        engine_number: engineNumber.trim() || null,
        chassis_number: chassisNumber.trim() || null,
        motorcycle_phone: motorcyclePhone.trim() || null,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
        purchase_date: purchaseDate || null,
        daily_target: dailyTarget ? parseFloat(dailyTarget) : 6000,
        status: status || 'active'
      }

      if (isEditing) {
        const { error } = await supabase.from('motorcycles').update(payload).eq('id', editMotoId)
        if (error) throw error
        alert("Amakuru ya moto yavuguruwe neza! 🎯")
      } else {
        const { error } = await supabase.from('motorcycles').insert([payload])
        if (error) throw error
        alert("Moto yashinzwe neza! 🎉")
      }

      setShowModal(false)
      setIsEditing(false)
      setEditMotoId(null)
      setPlateNumber('')
      setBrand('Spiro')
      setModel('M2')
      setEngineNumber('')
      setChassisNumber('')
      setMotorcyclePhone('')
      setPurchasePrice('')
      setPurchaseDate('')
      setDailyTarget('6000')
      setStatus('active')

      fetchMotorcycles()
      if (selectedMoto) setSelectedMoto(null)
    } catch (error) {
      alert("Ikosa: " + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm("Ushaka gusiba iyi moto burundu?")) return
    const { error } = await supabase.from('motorcycles').delete().eq('id', id)
    if (!error) {
      if (selectedMoto?.id === id) setSelectedMoto(null)
      fetchMotorcycles()
    }
  }

  const filteredMotos = motorcycles.filter(m =>
    m.plate_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.model?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (st) => {
    const statusVal = st || 'active'
    switch (statusVal) {
      case 'active': return <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">Active</span>
      case 'garage': return <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/30">Garage</span>
      case 'maintenance': return <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/10 text-sky-600 border border-sky-500/30">Maintenance</span>
      case 'sold': return <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 border border-purple-500/30">Sold</span>
      default: return <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-500/10 text-gray-600 border border-gray-500/30">{statusVal}</span>
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-3 sm:p-4 md:p-6">
      {selectedMoto ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedMoto(null)}
              className="inline-flex items-center gap-2 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-paper border border-line px-3.5 py-1.5 rounded-xl hover:bg-paper-raised transition shadow-sm active:scale-95"
            >
              <ArrowLeft size={16} /> Subira kuri Moto Zose
            </button>
            <button
              onClick={(e) => handleOpenEdit(e, selectedMoto)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2 rounded-xl shadow-sm transition"
            >
              <Edit3 size={15} /> Hindura Amakuru
            </button>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/20 backdrop-blur-md shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-emerald-500/20 pb-4">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Motorcycle Profile</span>
                <h1 className="font-display text-2xl sm:text-3xl font-black text-ink plate">{selectedMoto.plate_number}</h1>
              </div>
              <div>{getStatusBadge(selectedMoto.status)}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-paper border border-line shadow-sm space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-ink-soft">Brand & Model</p>
                <p className="font-bold text-sm text-ink">{selectedMoto.brand || 'Spiro'} {selectedMoto.model ? `- ${selectedMoto.model}` : 'M2'}</p>
              </div>
              <div className="p-4 rounded-xl bg-paper border border-line shadow-sm space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-ink-soft">Engine Number</p>
                <p className="font-mono font-black text-sm text-ink">{selectedMoto.engine_number || 'N/A'}</p>
              </div>
              <div className="p-4 rounded-xl bg-paper border border-line shadow-sm space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-ink-soft">Chassis Number</p>
                <p className="font-mono font-black text-sm text-ink">{selectedMoto.chassis_number || 'N/A'}</p>
              </div>
              <div className="p-4 rounded-xl bg-paper border border-line shadow-sm space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-ink-soft">Motorcycle Phone</p>
                <p className="font-mono font-black text-sm text-ink">{selectedMoto.motorcycle_phone || 'N/A'}</p>
              </div>
              <div className="p-4 rounded-xl bg-paper border border-line shadow-sm space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-ink-soft">Purchase Price</p>
                <p className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">{selectedMoto.purchase_price ? formatRWF(selectedMoto.purchase_price) : 'N/A'}</p>
              </div>
              <div className="p-4 rounded-xl bg-paper border border-line shadow-sm space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-ink-soft">Purchase Date</p>
                <p className="font-mono font-black text-sm text-ink">{selectedMoto.purchase_date ? formatDate(selectedMoto.purchase_date) : 'N/A'}</p>
              </div>
              <div className="p-4 rounded-xl bg-paper border border-line shadow-sm space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-ink-soft">Daily Target</p>
                <p className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">{selectedMoto.daily_target ? formatRWF(selectedMoto.daily_target) : formatRWF(6000)}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-black text-ink flex items-center gap-2">
                <Bike className="text-emerald-600 dark:text-emerald-400" size={26} /> Motorcycles Fleet ({motorcycles.length})
              </h1>
              <p className="text-xs sm:text-sm font-bold text-ink-soft">Kanda kuri card ya moto urebe amakuru yayo yose.</p>
            </div>
            <button
              onClick={() => {
                setIsEditing(false)
                setEditMotoId(null)
                setPlateNumber('')
                setBrand('Spiro')
                setModel('M2')
                setEngineNumber('')
                setChassisNumber('')
                setMotorcyclePhone('')
                setPurchasePrice('')
                setPurchaseDate('')
                setDailyTarget('6000')
                setStatus('active')
                setShowModal(true)
              }}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition w-full sm:w-auto"
            >
              <Plus size={18} /> Add Motorcycle
            </button>
          </div>

          <div className="relative w-full sm:max-w-md">
            <Search size={18} className="absolute left-3.5 top-3 text-ink-soft" />
            <input
              type="text"
              placeholder="Shaka moto (Plate, Brand, Model...)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-line bg-paper text-sm text-ink font-bold focus:outline-none focus:border-emerald-500 shadow-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {loading ? (
              <div className="col-span-full p-8 text-center text-ink-soft font-bold animate-pulse">Iri gushaka amakuru ya moto...</div>
            ) : filteredMotos.length === 0 ? (
              <div className="col-span-full p-8 text-center text-ink-soft font-bold">Nta moto ibonetse.</div>
            ) : (
              filteredMotos.map(moto => (
                <div
                  key={moto.id}
                  onClick={() => setSelectedMoto(moto)}
                  className="p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 hover:border-emerald-500 transition-all shadow-sm cursor-pointer space-y-4 flex flex-col justify-between backdrop-blur-md group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="plate text-base sm:text-lg font-mono font-black border border-emerald-500/30 bg-paper text-ink px-3 py-1 rounded-xl uppercase tracking-wider shadow-sm">
                        {moto.plate_number}
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => handleOpenEdit(e, moto)} className="text-emerald-600 hover:text-emerald-800 p-1.5 rounded-lg hover:bg-emerald-500/10 transition" title="Hindura">
                          <Edit3 size={15} />
                        </button>
                        <button onClick={(e) => handleDelete(e, moto.id)} className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-500/10 transition" title="Siba">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-ink-soft">
                        Model: <span className="text-ink font-black">{moto.brand || 'Spiro'} {moto.model || 'M2'}</span>
                      </p>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        Target: {formatRWF(moto.daily_target || 6000)}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-emerald-500/20 flex items-center justify-between">
                    <div>{getStatusBadge(moto.status)}</div>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      Amakuru <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-paper rounded-2xl border border-line w-full max-w-lg p-4 sm:p-6 space-y-4 shadow-2xl my-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="text-base sm:text-lg font-black text-ink flex items-center gap-2">
                <Bike className="text-emerald-600 dark:text-emerald-400" size={20} /> {isEditing ? 'Edit Motorcycle' : 'Add Motorcycle'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-ink-soft hover:text-ink"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">Plate number *</label>
                <input
                  type="text"
                  placeholder="RA 123 A"
                  value={plateNumber}
                  onChange={e => setPlateNumber(e.target.value)}
                  className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm font-bold text-ink uppercase focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-ink-soft mb-1">Brand</label>
                  <input type="text" value={brand} onChange={e => setBrand(e.target.value)} className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm font-bold text-ink focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-ink-soft mb-1">Model</label>
                  <input type="text" value={model} onChange={e => setModel(e.target.value)} className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm font-bold text-ink focus:outline-none focus:border-emerald-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">Engine number</label>
                <input type="text" value={engineNumber} onChange={e => setEngineNumber(e.target.value)} className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm font-bold text-ink focus:outline-none focus:border-emerald-500" />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">Chassis number</label>
                <input type="text" value={chassisNumber} onChange={e => setChassisNumber(e.target.value)} className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm font-bold text-ink focus:outline-none focus:border-emerald-500" />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">Motorcycle phone</label>
                <input type="text" value={motorcyclePhone} onChange={e => setMotorcyclePhone(e.target.value)} className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm font-bold text-ink focus:outline-none focus:border-emerald-500" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-ink-soft mb-1">Purchase price (RWF)</label>
                  <input type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm font-bold text-ink focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-ink-soft mb-1">Purchase date</label>
                  <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm font-bold text-ink focus:outline-none focus:border-emerald-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">Daily target (RWF)</label>
                <input type="number" value={dailyTarget} onChange={e => setDailyTarget(e.target.value)} className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm font-bold text-ink focus:outline-none focus:border-emerald-500" />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm font-bold text-ink focus:outline-none focus:border-emerald-500">
                  <option value="active">Active</option>
                  <option value="garage">Garage</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="sold">Sold</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-line font-bold text-ink-soft hover:bg-paper-raised transition">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50">{submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}