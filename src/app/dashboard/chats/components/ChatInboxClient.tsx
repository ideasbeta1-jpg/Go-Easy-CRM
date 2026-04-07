'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { 
  Search, 
  MessageSquare, 
  User, 
  Send, 
  CheckCircle2, 
  Clock, 
  Filter, 
  ArrowLeft,
  ChevronRight,
  AlertCircle,
  Mic,
  Square,
  Trash2,
  X,
  PlayIcon,
  PauseIcon
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { sendManualWhatsApp } from '@/app/utils/actions/whatsapp'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

export default function ChatInboxClient({ 
  initialLeads, 
  initialMessages, 
  currentUserId,
  isAdmin = false
}: { 
  initialLeads: any[], 
  initialMessages: any[], 
  currentUserId: string,
  isAdmin?: boolean
}) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'my' | 'all'>('my')
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [chatMessage, setChatMessage] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  
  // Real-time
  const [leads, setLeads] = useState(initialLeads)
  const [messages, setMessages] = useState(initialMessages)

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Audio Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }) // Modern browsers typically use webm for native MediaRecorder
        const url = URL.createObjectURL(audioBlob)
        setAudioBlob(audioBlob)
        setAudioUrl(url)
        
        // Cleanup stream tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      timerIntervalRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000)
    } catch (err) {
      console.error('Error accessing microphone:', err)
      alert('No se pudo acceder al micrófono. Por favor, asegúrate de dar permisos.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }

  const discardAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setAudioBlob(null)
    setRecordingTime(0)
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  useEffect(() => {
    const supabase = createClient()
    
    // Subscribe to Leads (to show new chats)
    const leadsChannel = supabase
      .channel('leads-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setLeads(prev => [payload.new, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setLeads(prev => prev.map(l => l.id === payload.new.id ? { ...l, ...payload.new } : l))
        }
      })
      .subscribe()

    // Subscribe to Messages (to update conversation history/sidebar preview)
    const messagesChannel = supabase
      .channel('messages-all')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [payload.new, ...prev];
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(leadsChannel)
      supabase.removeChannel(messagesChannel)
    }
  }, [])

  // Memoize lead data for the list (with unread/pending info)
  const processedLeads = useMemo(() => {
    return leads.map(lead => {
      const leadMessages = messages.filter(m => m.lead_id === lead.id).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const lastMessage = leadMessages[0]
      const isPending = lastMessage && lastMessage.direction === 'inbound'
      
      return {
        ...lead,
        lastMessage,
        isPending,
        messageCount: leadMessages.length
      }
    }).filter(lead => {
        const matchesSearch = (lead.first_name + ' ' + lead.last_name + ' ' + lead.phone).toLowerCase().includes(searchTerm.toLowerCase())
        if (!matchesSearch) return false
        
        // Admins or 'Todos' tab: show ALL leads
        if (isAdmin || filterType === 'all') return true
        
        // 'Mis Chats' for agents: show only leads assigned to the current user
        return lead.assigned_to === currentUserId
    }).sort((a, b) => {
        // Sort by last message date, then by creation date
        const dateA = a.lastMessage?.created_at || a.created_at
        const dateB = b.lastMessage?.created_at || b.created_at
        return new Date(dateB).getTime() - new Date(dateA).getTime()
    })
  }, [leads, messages, searchTerm, filterType, currentUserId])

  const selectedLead = leads.find(l => l.id === selectedLeadId)
  const selectedMessages = messages.filter(m => m.lead_id === selectedLeadId).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || isSendingMessage || !selectedLeadId || !selectedLead) return;
    setIsSendingMessage(true);
    try {
      const ok = await sendManualWhatsApp(selectedLead.phone || '', chatMessage, selectedLeadId);
      if (ok) {
        setChatMessage('');
        // Realtime subscription will automatically pick up the inserted message
        // No need for duplicate local update or router.refresh()
      }
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSendAudio = async () => {
    if (!audioBlob || isUploadingMedia || !selectedLeadId || !selectedLead) return;
    setIsUploadingMedia(true);
    try {
      const supabase = createClient()
      const fileName = `${selectedLeadId}_${Date.now()}.webm`
      
      const { data, error } = await supabase.storage
        .from('chat_media')
        .upload(fileName, audioBlob, { contentType: 'audio/webm' })
        
      if (error) throw error

      const { data: publicData } = supabase.storage.from('chat_media').getPublicUrl(fileName)
      const publicUrl = publicData.publicUrl

      // Ensure we import sendManualWhatsAppMedia at the top, or we can use it dynamically if not imported
      const { sendManualWhatsAppMedia } = await import('@/app/utils/actions/whatsapp')
      const ok = await sendManualWhatsAppMedia(selectedLead.phone || '', publicUrl, 'audio/webm', selectedLeadId)

      if (ok) {
        discardAudio()
      }
    } catch (err) {
      console.error('Error uploading/sending audio:', err)
      alert('Error enviando el audio.')
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  useEffect(() => {
    scrollToBottom()
  }, [selectedLeadId, messages])

  return (
    <div className="h-[calc(100vh-140px)] bg-slate-50/50 rounded-[3rem] border border-slate-100 overflow-hidden flex animate-in fade-in duration-700">
      {/* Sidebar: Chat List */}
      <div className="w-[380px] border-r border-slate-100 flex flex-col bg-white">
        {/* Sidebar Header */}
        <div className="p-8 pb-4 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase font-sans">Chat Inbox</h1>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest italic">Live API</span>
            </div>
          </div>
          
          <div className="relative group/search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o celular..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
            />
          </div>

          <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl">
            <button 
              onClick={() => setFilterType('my')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filterType === 'my' ? 'bg-white text-primary shadow-sm ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Mis Chats
            </button>
            <button 
              onClick={() => setFilterType('all')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filterType === 'all' ? 'bg-white text-primary shadow-sm ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Todos
            </button>
          </div>
        </div>

        {/* Lead List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 scroll-smooth scrollbar-hide">
          {processedLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-30">
               <MessageSquare size={48} className="mb-4 text-slate-200" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">No se encontraron conversaciones</p>
            </div>
          ) : (
            processedLeads.map((lead) => (
              <button 
                key={lead.id}
                onClick={() => setSelectedLeadId(lead.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all duration-300 mb-3 text-left group box-border border ${
                  selectedLeadId === lead.id 
                    ? 'bg-primary/5 border-primary/10' 
                    : 'bg-transparent border-transparent hover:bg-slate-50/80 hover:border-slate-100'
                }`}
              >
                 <div className="relative shrink-0">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-black text-lg shadow-lg ${
                      lead.isPending ? 'bg-amber-500' : 'bg-primary'
                    }`}>
                      {lead.first_name?.[0] || '?'}{lead.last_name?.[0] || ''}
                    </div>
                    {lead.isPending && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center animate-bounce shadow-lg">
                        <AlertCircle className="w-3 h-3 text-white" />
                      </div>
                    )}
                 </div>
                 
                 <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                       <h3 className="text-sm font-black text-slate-800 truncate uppercase tracking-tight">{lead.first_name} {lead.last_name}</h3>
                       <span className="text-[9px] font-bold text-slate-400 shrink-0">
                         {lead.lastMessage ? format(new Date(lead.lastMessage.created_at), 'hh:mm a') : ''}
                       </span>
                    </div>
                    <p className={`text-[11px] truncate leading-tight ${lead.isPending ? 'font-bold text-slate-900' : 'text-slate-400 font-medium'}`}>
                      {lead.lastMessage ? lead.lastMessage.content : lead.status?.replace('_', ' ')}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                       <span className="text-[8px] font-black text-primary/40 uppercase tracking-widest truncate max-w-[120px]">
                        {lead.phone && (lead.phone.includes(':') ? 'ID: ' + lead.phone.split(':')[0] + '...' : lead.phone)}
                       </span>
                       <span className="text-[8px] font-black text-slate-300">•</span>
                       <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest truncate">{lead.profiles?.full_name || 'Sin Asignar'}</span>
                    </div>
                 </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content: Chat Pane */}
      <div className="flex-1 flex flex-col bg-white/40 backdrop-blur-xl relative">
        {selectedLead ? (
          <>
            {/* Thread Header */}
            <div className="p-8 border-b border-slate-100/50 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-black text-sm">
                  {selectedLead.first_name?.[0] || '?'}{selectedLead.last_name?.[0] || ''}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 leading-none uppercase tracking-tighter">{selectedLead.first_name} {selectedLead.last_name}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-bold text-slate-400">{selectedLead.phone}</span>
                    <span className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                    <Link href={`/dashboard/leads/${selectedLead.id}`} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1">
                      Ver Ficha Lead <ChevronRight className="w-2.5 h-2.5" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                 <div className="hidden lg:flex flex-col items-end mr-4">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Estado Lead</span>
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">{selectedLead.status?.replace('_', ' ')}</span>
                 </div>
                 {/* Quick Action Button for detail */}
                 <button onClick={() => router.push(`/dashboard/leads/${selectedLead.id}`)} className="p-3.5 bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-2xl transition-all">
                    <Filter className="w-4 h-4" />
                 </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-dots scroll-smooth">
              {selectedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-30">
                   <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                      <MessageSquare size={32} className="text-slate-200" />
                   </div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">No hay historial de mensajes</p>
                </div>
              ) : (
                selectedMessages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.direction === 'outbound' ? 'items-end' : 'items-start'} group animate-in fade-in slide-in-from-bottom-2`}>
                    <div className="flex items-end gap-3 max-w-[80%]">
                       {msg.direction === 'inbound' && (
                         <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0 mb-3 ring-4 ring-white shadow-sm">
                            {selectedLead.first_name?.[0]}
                         </div>
                       )}
                       <div className="flex flex-col gap-2">
                        <div className={`p-6 rounded-[2.5rem] text-sm font-bold leading-relaxed shadow-sm transition-all group-hover:shadow-md ${
                            msg.direction === 'outbound' 
                              ? 'bg-primary text-white rounded-br-none' 
                              : 'bg-white text-slate-700 rounded-bl-none border border-slate-100'
                        }`}>
                            {msg.media_url && msg.media_type?.startsWith('audio/') ? (
                              <div className="flex flex-col gap-2 min-w-[200px]">
                                <audio src={msg.media_url} controls className={`w-full h-8 ${msg.direction === 'outbound' ? 'brightness-200' : ''}`} />
                                {msg.content && msg.content !== `Media: ${msg.media_type}` && (
                                  <p className="mt-2">{msg.content}</p>
                                )}
                              </div>
                            ) : (
                              msg.content
                            )}
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 ${msg.direction === 'outbound' ? 'text-right' : 'text-left'} text-slate-300`}>
                            {format(new Date(msg.created_at), 'hh:mm a', { locale: es })}
                        </span>
                       </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Overlay */}
            <div className="p-8 pb-12 bg-gradient-to-t from-white via-white/80 to-transparent">
              <div className="relative group max-w-4xl mx-auto flex items-center gap-3">
                
                {isRecording ? (
                  <div className="flex-1 bg-red-50 border border-red-100 rounded-[2.5rem] px-8 py-5 flex items-center justify-between shadow-lg shadow-red-500/5 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-red-500 font-bold tracking-widest">{formatTime(recordingTime)}</span>
                      <span className="text-[10px] font-black text-red-400 uppercase tracking-widest ml-4 hidden sm:inline-block">Grabando Audio...</span>
                    </div>
                    <button onClick={stopRecording} className="p-3 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors">
                      <Square className="w-5 h-5 fill-current" />
                    </button>
                  </div>
                ) : audioUrl ? (
                  <div className="flex-1 bg-slate-50 border-none rounded-[2.5rem] px-6 py-4 flex items-center gap-4 shadow-lg shadow-primary/5 transition-all">
                    <button onClick={discardAudio} className="p-3 bg-slate-200 text-slate-500 rounded-full hover:bg-red-100 hover:text-red-500 transition-colors shrink-0">
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <audio src={audioUrl} controls className="h-10 flex-1 w-full outline-none" />
                  </div>
                ) : (
                  <input 
                    type="text" 
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Escribe tu respuesta o graba un audio..." 
                    className="flex-1 w-full bg-slate-50 border-none rounded-[2.5rem] pl-8 pr-8 py-6 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-lg shadow-primary/5"
                  />
                )}

                {!isRecording && !audioUrl && !chatMessage.trim() && (
                  <button 
                    onClick={startRecording}
                    className="w-[60px] h-[60px] shrink-0 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 active:scale-95 transition-all shadow-md group border-2 border-transparent hover:border-red-100"
                  >
                    <Mic className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  </button>
                )}

                {(!isRecording && (chatMessage.trim() || audioUrl)) && (
                   <button 
                    onClick={audioUrl ? handleSendAudio : handleSendMessage}
                    disabled={isSendingMessage || isUploadingMedia}
                    className="w-[60px] h-[60px] shrink-0 bg-primary text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 disabled:bg-slate-200 disabled:shadow-none"
                  >
                    {isSendingMessage || isUploadingMedia ? <Clock className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6 ml-1" />}
                  </button>
                )}
                
              </div>
              <p className="text-[9px] font-black text-slate-300 text-center mt-6 uppercase tracking-widest opacity-50">Pulse Enter para enviar texto • Conectado a la API Oficial</p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
            <div className="w-32 h-32 bg-primary/5 rounded-full flex items-center justify-center mb-10 animate-pulse">
              <MessageSquare size={48} className="text-primary/20" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase font-sans mb-4">Selecciona un Chat</h2>
            <p className="text-sm font-bold text-slate-400 max-w-xs leading-relaxed italic">
              Elige una conversación de la izquierda para comenzar a gestionar el lead o responder mensajes pendientes.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
