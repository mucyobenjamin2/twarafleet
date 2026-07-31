import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, User, Search, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function Messages() {
  const [drivers, setDrivers] = useState([])
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [currentAdminId, setCurrentAdminId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [unreadCounts, setUnreadCounts] = useState({})
  const [lastMessages, setLastMessages] = useState({})
  
  const messagesEndRef = useRef(null)
  const selectedDriverRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    selectedDriverRef.current = selectedDriver
  }, [selectedDriver])

  // 1. Kurura Abashoferi, Unread Counts, n'Ubutumwa bwa Nyuma
  useEffect(() => {
    async function fetchAdminAndDrivers() {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setCurrentAdminId(user.id)

        const { data: driverData, error } = await supabase
          .from('drivers')
          .select('*')
          .eq('owner_id', user.id)
          .order('full_name', { ascending: true })

        if (!error && driverData) {
          setDrivers(driverData)

          const { data: allMsgs } = await supabase
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .order('created_at', { ascending: true })

          let countsMap = {}
          let lastMsgMap = {}

          if (allMsgs) {
            allMsgs.forEach(m => {
              const driverAuthId = m.sender_id === user.id ? m.receiver_id : m.sender_id
              lastMsgMap[driverAuthId] = m.message

              if (m.receiver_id === user.id && !m.is_read) {
                countsMap[m.sender_id] = (countsMap[m.sender_id] || 0) + 1
              }
            })
          }

          setUnreadCounts(countsMap)
          setLastMessages(lastMsgMap)

          if (driverData.length > 0) {
            setSelectedDriver(driverData[0])
          }
        }
      } catch (err) {
        console.error('Error fetching drivers for chat:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAdminAndDrivers()

    const globalChannel = supabase
      .channel('admin_global_last_message')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new
          const driverAuthId = newMsg.sender_id === currentAdminId ? newMsg.receiver_id : newMsg.sender_id

          setLastMessages(prev => ({
            ...prev,
            [driverAuthId]: newMsg.message
          }))

          if (newMsg.receiver_id === currentAdminId && !newMsg.is_read) {
            if (selectedDriverRef.current?.auth_user_id === newMsg.sender_id) {
              supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id).then()
            } else {
              setUnreadCounts(prev => ({
                ...prev,
                [newMsg.sender_id]: (prev[newMsg.sender_id] || 0) + 1
              }))
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(globalChannel)
    }
  }, [currentAdminId])

  // 2. Guhindura Chat no Gusiba akamenyetso burundu
  useEffect(() => {
    if (!selectedDriver || !selectedDriver.auth_user_id || !currentAdminId) return

    async function fetchMessagesAndMarkRead() {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentAdminId},receiver_id.eq.${selectedDriver.auth_user_id}),and(sender_id.eq.${selectedDriver.auth_user_id},receiver_id.eq.${currentAdminId})`)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setMessages(data)
        setTimeout(scrollToBottom, 50)

        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('sender_id', selectedDriver.auth_user_id)
          .eq('receiver_id', currentAdminId)
          .eq('is_read', false)

        setUnreadCounts(prev => ({ ...prev, [selectedDriver.auth_user_id]: 0 }))
      }
    }

    fetchMessagesAndMarkRead()

    const channel = supabase
      .channel(`chat_${selectedDriver.auth_user_id}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new
          if (
            (newMsg.sender_id === currentAdminId && newMsg.receiver_id === selectedDriver.auth_user_id) ||
            (newMsg.sender_id === selectedDriver.auth_user_id && newMsg.receiver_id === currentAdminId)
          ) {
            setMessages((prev) => {
              const exists = prev.some(m => m.id === newMsg.id || (m.tempId && m.message === newMsg.message))
              if (exists) return prev.map(m => m.tempId && m.message === newMsg.message ? newMsg : m)
              return [...prev, newMsg]
            })
            setTimeout(scrollToBottom, 50)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedDriver, currentAdminId])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedDriver?.auth_user_id || !currentAdminId) return

    const messageText = newMessage.trim()
    setNewMessage('')

    const tempMessage = {
      id: 'temp_' + Date.now(),
      tempId: true,
      sender_id: currentAdminId,
      receiver_id: selectedDriver.auth_user_id,
      message: messageText,
      created_at: new Date().toISOString(),
      is_read: true
    }

    setMessages(prev => [...prev, tempMessage])
    setTimeout(scrollToBottom, 50)
    
    setUnreadCounts(prev => ({ ...prev, [selectedDriver.auth_user_id]: 0 }))
    
    setLastMessages(prev => ({
      ...prev,
      [selectedDriver.auth_user_id]: messageText
    }))

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', selectedDriver.auth_user_id)
      .eq('receiver_id', currentAdminId)

    const { error } = await supabase.from('messages').insert([
      {
        sender_id: currentAdminId,
        receiver_id: selectedDriver.auth_user_id,
        message: messageText,
        is_read: true 
      },
    ])

    if (error) {
      console.error('Ikosa mu kohereza ubutumwa:', error.message)
      alert('Ntibyashoboye koherezwa: ' + error.message)
    }
  }

  const filteredDrivers = drivers.filter(d =>
    d.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 h-[calc(100vh-6rem)] flex flex-col">
      <div className="mb-4 shrink-0">
        <h1 className="font-display text-2xl font-black text-ink flex items-center gap-2">
          <MessageSquare className="text-teal-600 dark:text-teal-400" size={28} /> Admin & Drivers Chat Center
        </h1>
        <p className="text-sm font-bold text-ink-soft">Vugana n'abashoferi bawe mu gihe nyacyo (Realtime messaging).</p>
      </div>

      {/* CHAT CONTAINER GRID */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 bg-paper-raised border border-line rounded-3xl overflow-hidden shadow-sm relative">
        
        {/* SIDEBAR: DRIVERS LIST */}
        <div className={`border-r border-line flex flex-col bg-paper/40 ${selectedDriver ? 'hidden md:flex' : 'flex'} h-full min-h-0`}>
          <div className="p-4 border-b border-line space-y-3 shrink-0">
            <h3 className="text-xs font-black uppercase tracking-wider text-ink">Abashoferi ({drivers.length})</h3>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-ink-soft" />
              <input
                type="text"
                placeholder="Shaka umushoferi..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-line bg-paper text-xs font-bold text-ink focus:outline-none focus:border-teal-500 shadow-sm"
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-line">
            {loading ? (
              <div className="p-6 text-center text-xs font-bold text-ink-soft animate-pulse">Iri gushaka abashoferi...</div>
            ) : filteredDrivers.length === 0 ? (
              <div className="p-6 text-center text-xs font-bold text-ink-soft">Nta mushoferi ubonetse.</div>
            ) : (
              filteredDrivers.map(driver => {
                const isSelected = selectedDriver?.id === driver.id
                const unreadCount = (driver.auth_user_id && unreadCounts[driver.auth_user_id]) || 0
                const lastMsgText = (driver.auth_user_id && lastMessages[driver.auth_user_id]) || 'Nta butumwa burabaho'

                return (
                  <div
                    key={driver.id}
                    onClick={() => setSelectedDriver(driver)}
                    className={`p-4 flex items-center justify-between cursor-pointer transition ${
                      isSelected ? 'bg-teal-500/10 border-l-4 border-teal-600' : 'hover:bg-paper/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 shrink-0 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black shadow-sm relative">
                        <User size={18} />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600 border-2 border-white"></span>
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-xs truncate ${unreadCount > 0 ? 'font-black text-slate-900 dark:text-white' : 'font-black text-ink'}`}>
                          {driver.full_name}
                        </h4>
                        <p className={`text-[10px] truncate ${unreadCount > 0 ? 'font-black text-rose-600 dark:text-rose-400' : 'text-ink-soft font-medium'}`}>
                          {lastMsgText}
                        </p>
                      </div>
                    </div>

                    {unreadCount > 0 && (
                      <span className="shrink-0 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md animate-pulse ml-2">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* MAIN CHAT WINDOW */}
        <div className={`col-span-2 flex flex-col bg-paper h-full min-h-0 ${selectedDriver ? 'flex' : 'hidden md:flex'}`}>
          {selectedDriver ? (
            <>
              {/* 🟡 FREEZED / FIXED HEADER (Aho nashyize umuhondo wo hejuru) */}
              <div className="p-4 border-b border-line bg-paper-raised flex items-center gap-3 shrink-0 z-10 shadow-sm">
                <button
                  onClick={() => setSelectedDriver(null)}
                  className="md:hidden p-2 rounded-xl bg-paper border border-line text-ink hover:bg-paper-raised transition mr-1"
                  title="Subira ku rutonde"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black shadow-sm">
                  <User size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-ink">{selectedDriver.full_name}</h3>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">● Active Driver Chat</span>
                </div>
              </div>

              {/* 🔴 SCROLLED MESSAGES CONTAINER (Aho wazengurukije umutuku) */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-paper/30 scrollbar-thin">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-ink-soft text-xs font-bold space-y-1">
                    <MessageSquare size={32} className="opacity-20" />
                    <p>Nta butumwa buraba hagati yawe na {selectedDriver.full_name}.</p>
                    <p className="text-[10px]">Andika ubutumwa munsi aha kugira ngo mutangire!</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.sender_id === currentAdminId
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[75%] p-3 rounded-2xl text-xs font-bold shadow-sm ${
                          isMe 
                            ? 'bg-teal-600 text-white rounded-br-none' 
                            : 'bg-paper-raised text-ink border border-line rounded-bl-none'
                        }`}>
                          <p>{msg.message}</p>
                        </div>
                        <span className="text-[9px] font-mono text-ink-soft mt-1 px-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 🟡 FREEZED / FIXED FOOTER FORM (Aho nashyize umuhondo wo hasi) */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-line bg-paper-raised flex items-center gap-2 shrink-0 z-10 shadow-sm">
                <input
                  type="text"
                  placeholder={`Andikira ${selectedDriver.full_name}...`}
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-line bg-paper text-xs font-bold text-ink focus:outline-none focus:border-teal-500 shadow-sm"
                />
                <button
                  type="submit"
                  className="p-3 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition shadow-md flex items-center justify-center"
                >
                  <Send size={18} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-ink-soft text-xs font-bold space-y-2">
              <MessageSquare size={40} className="opacity-20" />
              <p>Hitamo umushoferi ibumoso kugira ngo utangire kuganira nawe.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}