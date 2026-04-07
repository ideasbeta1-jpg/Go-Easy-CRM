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
  AlertCircle
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
        setMessages(prev => [payload.new, ...prev])
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
        // Local update for immediate feedback
        const newMsg = {
           lead_id: selectedLeadId,
           content: chatMessage,
           direction: 'outbound',
           created_at: new Date().toISOString()
        }
        setMessages([newMsg, ...messages])
        router.refresh()
      }
    } finally {
      setIsSendingMessage(false);
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
                            {msg.content}
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
              <div className="relative group max-w-4xl mx-auto">
                <input 
                  type="text" 
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Escribe tu respuesta de WhatsApp..." 
                  className="w-full bg-slate-50 border-none rounded-[2.5rem] pl-8 pr-20 py-6 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-lg shadow-primary/5"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={isSendingMessage || !chatMessage.trim()}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 disabled:bg-slate-200 disabled:shadow-none"
                >
                  {isSendingMessage ? <Clock className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
                </button>
              </div>
              <p className="text-[9px] font-black text-slate-300 text-center mt-6 uppercase tracking-widest opacity-50">Pulse Enter para enviar • Conectado a la API Oficial</p>
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
