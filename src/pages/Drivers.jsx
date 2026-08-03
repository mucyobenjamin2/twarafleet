import { useEffect, useState } from 'react'
import { Users, Plus, Search, Phone, Activity, X, Trash2, Bike, Mail, MapPin, ShieldAlert, ChevronRight, ArrowLeft, Edit3 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function Drivers() {
  const [drivers, setDrivers] = useState([])
  const [motorcycles, setMotorcycles] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [selectedDriver, setSelectedDriver] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editDriverId, setEditDriverId] = useState(null)

  const [fullName, setFullName] = useState('')
  const [selectedMoto, setSelectedMoto] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [address, setAddress] = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [status, setStatus] = useState('active')

  const fetchDriversData = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user

      if (user) {
        const { data: driverData } = await supabase.from('drivers').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
        const { data: motoData } = await supabase.from('motorcycles').select('id, plate_number').eq('owner_id', user.id)
        const { data: assignData } = await supabase.from('driver_assignments').select('*, motorcycles(id, plate_number)').eq('owner_id', user.id).eq('is_active', true)

        setDrivers(driverData || [])
        setMotorcycles(motoData || [])
        setAssignments(assignData || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDriversData()
  }, [])

  const toggleStatus = async (e, driverId, currentStatus) => {
    e.stopPropagation()
    const current = currentStatus || 'active'
    const newStatus = current === 'active' ? 'inactive' : 'active'

    setDrivers(drivers.map(d => d.id === driverId ? { ...d, status: newStatus } : d))
    if (selectedDriver && selectedDriver.id === driverId) {
      setSelectedDriver({ ...selectedDriver, status: newStatus })
    }

    const { error } = await supabase.from('drivers').update({ status: newStatus }).eq('id', driverId)
    if (error) {
      alert('Habonetse ikosa mu guhindura status: ' + error.message)
      fetchDriversData()
    }
  }

  const handleOpenEdit = (e, driver) => {
    e.stopPropagation()
    setIsEditing(true)
    setEditDriverId(driver.id)
    setFullName(driver.full_name || '')
    setNationalId(driver.national_id || '')
    setPhone(driver.phone || driver.phone_number || '')
    setEmail(driver.email || '')
    setPassword('')
    setAddress(driver.address || '')
    setEmergencyContact(driver.emergency_contact || '')
    setStatus(driver.status || 'active')

    const assign = assignments.find(a => a.driver_id === driver.id)
    setSelectedMoto(assign?.motorcycle_id || '')
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!fullName || (!isEditing && (!email || !password))) {
      alert("Nyamuneka wuzuze ibisabwa byose (Name, Email & Password)!")
      return
    }

    setSubmitting(true)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.user) {
        throw new Error("Nta mukoresha winjiye cyangwa session yarangiye. Ongera winjire.")
      }
      const user = session.user

      let rawInput = email.trim()
      let authEmail = rawInput.includes('@') ? rawInput : `${rawInput}@twarafleet.com`

      if (isEditing) {
        const { error: updateError } = await supabase.from('drivers').update({
          full_name: fullName.trim(),
          national_id: nationalId.trim() || null,
          phone_number: phone.trim() || null,
          email: rawInput || null,
          address: address.trim() || null,
          emergency_contact: emergencyContact.trim() || null,
          status: status || 'active'
        }).eq('id', editDriverId)

        if (updateError) throw updateError

        if (selectedMoto) {
          const existingAssign = assignments.find(a => a.driver_id === editDriverId)
          if (existingAssign) {
            await supabase.from('driver_assignments').update({ motorcycle_id: selectedMoto }).eq('id', existingAssign.id)
          } else {
            await supabase.from('driver_assignments').insert([{ owner_id: user.id, driver_id: editDriverId, motorcycle_id: selectedMoto, is_active: true }])
          }
        }

        alert("Amakuru y'umushoferi yavuguruwe neza! 🎯")
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: authEmail,
          password: password.trim(),
          options: { data: { full_name: fullName.trim(), role: 'driver' } }
        })

        if (authError) throw authError
        const driverUserId = authData.user?.id

        const { data: newDriver, error: driverError } = await supabase.from('drivers').insert([{
          id: driverUserId || undefined,
          owner_id: user.id,
          full_name: fullName.trim(),
          national_id: nationalId.trim() || null,
          phone_number: phone.trim() || null,
          email: rawInput || null,
          address: address.trim() || null,
          emergency_contact: emergencyContact.trim() || null,
          status: status || 'active'
        }]).select().single()

        if (driverError) throw driverError

        if (selectedMoto && newDriver) {
          await supabase.from('driver_assignments').insert([{ owner_id: user.id, driver_id: newDriver.id, motorcycle_id: selectedMoto, is_active: true }])
        }

        alert("Umushoferi yashinzwe neza kandi konti ye yaremwe! 🎉")
      }

      setShowModal(false)
      setIsEditing(false)
      setEditDriverId(null)
      setFullName('')
      setSelectedMoto('')
      setNationalId('')
      setPhone('')
      setEmail('')
      setPassword('')
      setAddress('')
      setEmergencyContact('')
      setStatus('active')

      fetchDriversData()
      if (selectedDriver) setSelectedDriver(null)
    } catch (error) {
      alert("Ikosa: " + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm("Ushaka gusiba uyu mushoferi burundu?")) return
    const { error } = await supabase.from('drivers').delete().eq('id', id)
    if (!error) {
      if (selectedDriver?.id === id) setSelectedDriver(null)
      fetchDriversData()
    }
  }

  const filteredDrivers = drivers.filter(d =>
    d.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.phone || d.phone_number)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.national_id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-3 sm:p-4 md:p-6">
      {selectedDriver ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedDriver(null)}
              className="inline-flex items-center gap-2 text-xs font-black text-sky-600 dark:text-sky-400 bg-paper border border-line px-3.5 py-1.5 rounded-xl hover:bg-paper-raised transition shadow-sm active:scale-95"
            >
              <ArrowLeft size={16} /> Subira ku Bashoferi Bose
            </button>
            <button
              onClick={(e) => handleOpenEdit(e, selectedDriver)}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black px-4 py-2 rounded-xl shadow-sm transition"
            >
              <Edit3 size={15} /> Hindura Amakuru
            </button>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl border-2 border-sky-500/40 bg-sky-500/10 dark:bg-sky-950/20 backdrop-blur-md shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-sky-500/20 pb-4">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-sky-700 dark:text-sky-400">Driver Profile</span>
                <h1 className="font-display text-2xl sm:text-4xl font-black text-ink">{selectedDriver.full_name}</h1>
              </div>
              <button
                onClick={(e) => toggleStatus(e, selectedDriver.id, selectedDriver.status)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-sm ${
                  (!selectedDriver.status || selectedDriver.status === 'active')
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                }`}
              >
                Status: {(!selectedDriver.status || selectedDriver.status === 'active') ? 'Active' : 'Inactive'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-paper border border-line shadow-sm space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-ink-soft">National ID</p>
                <p className="font-mono font-black text-sm text-ink">{selectedDriver.national_id || 'N/A'}</p>
              </div>
              <div className="p-4 rounded-xl bg-paper border border-line shadow-sm space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-ink-soft">Phone Number</p>
                <p className="font-mono font-black text-sm text-ink flex items-center gap-1.5">
                  <Phone size={14} className="text-sky-600" /> {selectedDriver.phone || selectedDriver.phone_number || 'N/A'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-paper border border-line shadow-sm space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-ink-soft">Login ID / Phone</p>
                <p className="font-mono font-black text-sm text-ink flex items-center gap-1.5 truncate">
                  <Mail size={14} className="text-sky-600" /> {selectedDriver.email || 'N/A'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-paper border border-line shadow-sm space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-ink-soft">Address</p>
                <p className="font-bold text-sm text-ink flex items-center gap-1.5">
                  <MapPin size={14} className="text-sky-600" /> {selectedDriver.address || 'N/A'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-paper border border-line shadow-sm space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-ink-soft">Emergency Contact</p>
                <p className="font-mono font-black text-sm text-rose-600 flex items-center gap-1.5">
                  <ShieldAlert size={14} /> {selectedDriver.emergency_contact || 'N/A'}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-paper border border-line shadow-sm space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-ink-soft">Assigned Motorcycle</p>
                <p className="font-mono font-black text-sm text-emerald-600 flex items-center gap-1.5">
                  <Bike size={14} /> {assignments.find(a => a.driver_id === selectedDriver.id)?.motorcycles?.plate_number || 'Nta moto yagenewe'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-black text-ink flex items-center gap-2">
                <Users className="text-sky-600 dark:text-sky-400" size={26} /> Bashoferi (Drivers)
              </h1>
              <p className="text-xs sm:text-sm font-bold text-ink-soft">Kanda kuri card y'umushoferi urebe amakuru ye yose.</p>
            </div>
            <button
              onClick={() => {
                setIsEditing(false)
                setEditDriverId(null)
                setFullName('')
                setSelectedMoto('')
                setNationalId('')
                setPhone('')
                setEmail('')
                setPassword('')
                setAddress('')
                setEmergencyContact('')
                setStatus('active')
                setShowModal(true)
              }}
              className="flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition w-full sm:w-auto"
            >
              <Plus size={18} /> Ongera Umushoferi
            </button>
          </div>

          <div className="relative w-full sm:max-w-md">
            <Search size={18} className="absolute left-3.5 top-3 text-ink-soft" />
            <input
              type="text"
              placeholder="Shaka umushoferi (Name, Phone, Email...)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-line bg-paper text-sm text-ink font-bold focus:outline-none focus:border-sky-500 shadow-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {loading ? (
              <div className="col-span-full p-8 text-center text-ink-soft font-bold animate-pulse">Iri gushaka abashoferi...</div>
            ) : filteredDrivers.length === 0 ? (
              <div className="col-span-full p-8 text-center text-ink-soft font-bold">Nta mushoferi ubonetse.</div>
            ) : (
              filteredDrivers.map(driver => {
                const isActive = !driver.status || driver.status === 'active'
                const assignedMoto = assignments.find(a => a.driver_id === driver.id)?.motorcycles?.plate_number

                return (
                  <div
                    key={driver.id}
                    onClick={() => setSelectedDriver(driver)}
                    className="p-5 sm:p-6 rounded-2xl border-2 border-sky-500/30 bg-sky-500/10 dark:bg-sky-950/20 hover:border-sky-500 transition-all shadow-sm cursor-pointer space-y-4 flex flex-col justify-between backdrop-blur-md group hover:scale-105"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        {/* 🎯 IZINA RY'UMUSHOFERI RIRYANGOJE / RIRININI CYANE (TEXT-XL / FONT-EXTRABOLD) */}
                        <h3 className="font-display text-xl sm:text-2xl font-black text-ink tracking-tight group-hover:text-sky-600 transition" title={driver.full_name}>
                          {driver.full_name}
                        </h3>
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => handleOpenEdit(e, driver)} className="text-sky-600 hover:text-sky-800 p-1.5 rounded-lg hover:bg-sky-500/10 transition" title="Hindura">
                            <Edit3 size={16} />
                          </button>
                          <button onClick={(e) => handleDelete(e, driver.id)} className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-500/10 transition" title="Siba">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <p className="text-xs font-bold text-ink-soft flex items-center gap-2">
                          <Phone size={14} className="text-sky-600" /> {driver.phone || driver.phone_number || 'Nta nimero'}
                        </p>
                        {driver.email && (
                          <p className="text-xs font-bold text-ink-soft flex items-center gap-2 truncate">
                            <Mail size={14} className="text-sky-600" /> {driver.email}
                          </p>
                        )}
                        {assignedMoto && (
                          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 font-mono">
                            <Bike size={14} /> Moto: {assignedMoto}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-sky-500/20 flex items-center justify-between">
                      <button
                        onClick={(e) => toggleStatus(e, driver.id, driver.status)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${
                          isActive ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 border border-rose-500/30'
                        }`}
                      >
                        <Activity size={12} className={isActive ? "animate-pulse" : ""} />
                        {isActive ? 'Active' : 'Inactive'}
                      </button>
                      <span className="text-xs font-black text-sky-600 dark:text-sky-400 flex items-center gap-1 group-hover:translate-x-1 transition">
                        Amakuru <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-paper rounded-2xl border border-line w-full max-w-lg p-4 sm:p-6 space-y-4 shadow-xl my-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="text-base sm:text-lg font-black text-ink flex items-center gap-2">
                <Users className="text-sky-600 dark:text-sky-400" size={20} /> {isEditing ? 'Edit Driver' : 'Add Driver'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-ink-soft hover:text-ink"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">Full name *</label>
                <input
                  type="text"
                  placeholder="Kamali John"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm font-bold text-ink focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">Select Motorcycle Plate</label>
                <select value={selectedMoto} onChange={e => setSelectedMoto(e.target.value)} className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm font-bold text-ink focus:outline-none focus:border-sky-500">
                  <option value="">-- Hitamo Moto --</option>
                  {motorcycles.map(m => (<option key={m.id} value={m.id}>{m.plate_number}</option>))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">National ID</label>
                <input type="text" value={nationalId} onChange={e => setNationalId(e.target.value)} className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm font-bold text-ink focus:outline-none focus:border-sky-500" />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">Phone number</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm font-bold text-ink focus:outline-none focus:border-sky-500" />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">Driver Login ID or Phone *</label>
                <input type="text" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm font-bold text-ink focus:outline-none focus:border-sky-500" required />
              </div>

              {!isEditing && (
                <div>
                  <label className="block text-xs font-black uppercase text-ink-soft mb-1">Temporary Password *</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm font-bold text-ink focus:outline-none focus:border-sky-500" required />
                </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">Address</label>
                <textarea value={address} onChange={e => setAddress(e.target.value)} className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm font-bold text-ink focus:outline-none focus:border-sky-500" rows={2} />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">Emergency contact</label>
                <input type="text" value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm font-bold text-ink focus:outline-none focus:border-sky-500" />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-ink-soft mb-1">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full p-3 rounded-xl border border-line bg-paper-raised text-sm font-bold text-ink focus:outline-none focus:border-sky-500">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-line font-bold text-ink-soft hover:bg-paper-raised transition">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-sky-600 font-bold text-white hover:bg-sky-700 transition disabled:opacity-50">{submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}