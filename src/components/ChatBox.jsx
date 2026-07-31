import { useState, useEffect, useRef } from 'react'
import { Send, MessageSquare, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function ChatBox({ recipientId, recipientName, onClose }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [currentUserId, setCurrentUserId] = useState(null)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    async function initChat() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      // 1. Gukurura ubutumwa bwose hagati y'aba bombi
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setMessages(data)
        scrollToBottom()

        // 2. Mark as read
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('sender_id', recipientId)
          .eq('receiver_id', user.id)
          .eq('is_read', false)
      }
    }

    initChat()

    // 3. Realtime Subscription muri ChatBox
    const channel = supabase
      .channel(`chatbox_driver_live_${recipientId}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new
          if (
            (newMsg.sender_id === currentUserId && newMsg.receiver_id === recipientId) ||
            (newMsg.sender_id === recipientId && newMsg.receiver_id === currentUserId)
          ) {
            setMessages((prev) => {
              const exists = prev.some(m => m.id === newMsg.id || (m.tempId && m.message === newMsg.message))
              if (exists) {
                return prev.map(m => m.tempId && m.message === newMsg.message ? newMsg : m)
              }
              return [...prev, newMsg]
            })
            scrollToBottom()

            if (newMsg.sender_id === recipientId) {
              supabase
                .from('messages')
                .update({ is_read: true })
                .eq('id', newMsg.id)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [recipientId])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUserId) return

    const messageText = newMessage.trim()
    setNewMessage('')

    const tempMsg = {
      id: 'temp_' + Date.now(),
      tempId: true,
      sender_id: currentUserId,
      receiver_id: recipientId,
      message: messageText,
      created_at: new Date().toISOString(),
      is_read: false
    }

    setMessages(prev => [...prev, tempMsg])
    scrollToBottom()

    const { error } = await supabase.from('messages').insert([
      {
        sender_id: currentUserId,
        receiver_id: recipientId,
        message: messageText,
        is_read: false,
      },
    ])

    if (error) {
      console.error('Ikosa mu kohereza ubutumwa:', error.message)
      alert('Ntibyashoboye koherezwa: ' + error.message)
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-[#0f172a] border-l border-slate-800 shadow-2xl flex flex-col transition-all text-slate-100">
      {/* HEADER */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#1e293b] shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <MessageSquare size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">{recipientName || 'Ikiganiro'}</h3>
            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
              ● Live / Online
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X size={18} />
        </button>
      </div>

      {/* MESSAGES LIST (SCROLLED) */}
      <div className="flex-1 min-h-0 p-4 overflow-y-auto space-y-3 bg-[#0f172a]/80 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs font-bold space-y-1">
            <MessageSquare size={32} className="opacity-20" />
            <p>Nta butumwa burabaho hagati yanyu.</p>
            <p className="text-[10px]">Tangira wandike ubutumwa hepfo!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-xs font-bold shadow-sm ${
                    isMe
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-[#1e293b] text-slate-100 border border-slate-800 rounded-bl-none'
                  }`}
                >
                  <p>{msg.message}</p>
                </div>
                <span className="text-[9px] font-mono text-slate-400 mt-1 px-1">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT FORM (FREEZED) */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-[#1e293b] flex items-center gap-2 shrink-0">
        <input
          type="text"
          placeholder="Andika ubutumwa..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 bg-[#0f172a] text-xs font-bold text-white focus:outline-none focus:border-emerald-500 shadow-sm"
        />
        <button
          type="submit"
          className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-md flex items-center justify-center"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}