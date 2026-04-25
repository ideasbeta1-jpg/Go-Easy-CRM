'use client'

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  Search,
  MessageSquare,
  Send,
  Filter,
  ArrowLeft,
  ChevronRight,
  AlertCircle,
  Mic,
  Square,
  Trash2,
  Check,
  CheckCheck,
  Clock,
  ImageIcon,
  FileText,
  Video,
  ChevronUp,
  LayoutTemplate,
  X
} from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  sendManualWhatsApp,
  sendManualWhatsAppMedia,
  getLeadMessages,
  sendTemplateFromChat
} from '@/app/utils/actions/whatsapp'
import { getWABATemplatesAction, getTemplateMappingsAction } from '@/app/utils/actions/waba'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { useNotifications } from '@/app/dashboard/components/NotificationProvider'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string
  lead_id: string
  content: string
  direction: 'inbound' | 'outbound'
  media_url?: string | null
  media_type?: string | null
  is_read?: boolean
  status?: string | null
  wamid?: string | null
  created_at: string
}

interface Lead {
  id: string
  first_name: string
  last_name?: string
  phone?: string
  status?: string
  assigned_to?: string | null
  created_at: string
  profiles?: { full_name: string } | null
  [key: string]: any
}

// ─── Status Icon ─────────────────────────────────────────────────────────────

function MessageStatus({ status }: { status?: string | null }) {
  if (status === 'read') return <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
  if (status === 'delivered') return <CheckCheck className="w-3.5 h-3.5 text-white/60" />
  if (status === 'failed') return <X className="w-3.5 h-3.5 text-red-300" />
  return <Check className="w-3.5 h-3.5 text-white/60" />
}

// ─── Template Picker Modal ────────────────────────────────────────────────────

function TemplatePicker({
  lead,
  onClose,
  onSent
}: {
  lead: Lead
  onClose: () => void
  onSent: (msg: Message) => void
}) {
  const [templates, setTemplates] = useState<any[]>([])
  const [mappings, setMappings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([getWABATemplatesAction(), getTemplateMappingsAction()]).then(([tRes, mRes]) => {
      setTemplates(tRes.data?.filter((t: any) => t.status === 'APPROVED') || [])
      setMappings(mRes.data || [])
      setLoading(false)
    })
  }, [])

  const buildComponents = (template: any, mapping: any) => {
    const components: any[] = []
    const bodyComp = template.components?.find((c: any) => c.type === 'BODY')
    if (!bodyComp) return components

    const paramCount = (bodyComp.text?.match(/\{\{(\d+)\}\}/g) || []).length
    if (paramCount === 0) return components

    const fieldMap = mapping?.mappings || {}
    const params = Array.from({ length: paramCount }, (_, i) => {
      const fieldKey = fieldMap[String(i + 1)]
      const value = fieldKey ? (lead[fieldKey] ?? `{{${i + 1}}}`) : `{{${i + 1}}}`
      return { type: 'text', text: String(value) }
    })

    components.push({ type: 'body', parameters: params })
    return components
  }

  const handleSend = async (template: any) => {
    setSending(template.name)
    try {
      const mapping = mappings.find(m => m.template_name === template.name)
      const components = buildComponents(template, mapping)
      const langCode = mapping?.language_code || template.language || 'es'
      const result = await sendTemplateFromChat(
        lead.id,
        lead.phone || '',
        template.name,
        langCode,
        components
      )
      if (result.ok) {
        const newMsg: Message = {
          id: crypto.randomUUID(),
          lead_id: lead.id,
          content: `[Plantilla: ${template.name}]`,
          direction: 'outbound',
          status: 'sent',
          created_at: new Date().toISOString()
        }
        onSent(newMsg)
        onClose()
      } else {
        alert(`Error al enviar plantilla: ${result.error}`)
      }
    } finally {
      setSending(null)
    }
  }

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center bg-black/30 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-0">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Enviar Plantilla</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{lead.first_name} {lead.last_name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input
              type="text"
              placeholder="Buscar plantilla..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto max-h-[50vh] p-4 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-slate-300 text-xs font-black uppercase tracking-widest">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-300 text-xs font-black uppercase tracking-widest">Sin plantillas aprobadas</div>
          ) : (
            filtered.map(t => {
              const bodyComp = t.components?.find((c: any) => c.type === 'BODY')
              const hasMappings = mappings.some(m => m.template_name === t.name)
              return (
                <button
                  key={t.name}
                  onClick={() => handleSend(t)}
                  disabled={sending === t.name}
                  className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-primary/20 hover:bg-primary/5 transition-all group disabled:opacity-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">{t.name}</p>
                      {bodyComp?.text && (
                        <p className="text-[10px] text-slate-400 font-medium mt-1 line-clamp-2 leading-relaxed">{bodyComp.text}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Aprobada</span>
                      {hasMappings && <span className="text-[8px] font-black uppercase tracking-widest text-primary/60">Variables OK</span>}
                    </div>
                  </div>
                  {sending === t.name && (
                    <p className="text-[9px] font-black text-primary uppercase tracking-widest mt-2">Enviando...</p>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChatInboxClient({
  initialLeads,
  initialMessages,
  currentUserId,
  isAdmin = false
}: {
  initialLeads: Lead[]
  initialMessages: Message[]
  currentUserId: string
  isAdmin?: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshUnreadCount } = useNotifications()

  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'my' | 'all'>('my')
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [chatMessage, setChatMessage] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [msgSearch, setMsgSearch] = useState('')
  const [showMsgSearch, setShowMsgSearch] = useState(false)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)

  // Realtime global state
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [previewMessages, setPreviewMessages] = useState<Message[]>(initialMessages)

  // Per-conversation lazy-loaded messages
  const [convMessages, setConvMessages] = useState<Record<string, Message[]>>({})
  const [convPage, setConvPage] = useState<Record<string, number>>({})
  const [convHasMore, setConvHasMore] = useState<Record<string, boolean>>({})
  const [loadingConv, setLoadingConv] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Audio Recording
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [recordedMimeType, setRecordedMimeType] = useState('audio/webm')
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesTopRef = useRef<HTMLDivElement>(null)

  // ── Load conversation messages on lead select ─────────────────────────────
  const loadConversation = useCallback(async (leadId: string, page = 0) => {
    if (page === 0) setLoadingConv(true)
    else setLoadingMore(true)
    try {
      const { messages, hasMore } = await getLeadMessages(leadId, page)
      setConvMessages(prev => {
        const existing = page === 0 ? [] : (prev[leadId] || [])
        // Merge avoiding duplicates
        const ids = new Set(existing.map(m => m.id))
        const merged = [...messages.filter(m => !ids.has(m.id)), ...existing]
        return { ...prev, [leadId]: merged }
      })
      setConvPage(prev => ({ ...prev, [leadId]: page }))
      setConvHasMore(prev => ({ ...prev, [leadId]: hasMore }))
    } finally {
      setLoadingConv(false)
      setLoadingMore(false)
    }
  }, [])

  const handleSelectLead = useCallback((leadId: string) => {
    setSelectedLeadId(leadId)
    setMsgSearch('')
    setShowMsgSearch(false)
    if (!convMessages[leadId]) {
      loadConversation(leadId, 0)
    }
  }, [convMessages, loadConversation])

  const handleLoadMore = () => {
    if (!selectedLeadId || loadingMore) return
    const nextPage = (convPage[selectedLeadId] ?? 0) + 1
    loadConversation(selectedLeadId, nextPage)
  }

  // ── Realtime subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()

    const leadsChannel = supabase
      .channel('leads-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setLeads(prev => [payload.new as Lead, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setLeads(prev => prev.map(l => l.id === payload.new.id ? { ...l, ...payload.new } : l))
        }
      })
      .subscribe()

    const messagesChannel = supabase
      .channel('messages-all')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as Message
        // Update preview messages (sidebar)
        setPreviewMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [msg, ...prev]
        })
        // Update per-conversation messages if loaded
        setConvMessages(prev => {
          const existing = prev[msg.lead_id]
          if (!existing) return prev
          if (existing.some(m => m.id === msg.id)) return prev
          return { ...prev, [msg.lead_id]: [...existing, msg] }
        })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as Message
        // Update delivery status in conv messages
        setConvMessages(prev => {
          const existing = prev[msg.lead_id]
          if (!existing) return prev
          return { ...prev, [msg.lead_id]: existing.map(m => m.id === msg.id ? { ...m, ...msg } : m) }
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(leadsChannel)
      supabase.removeChannel(messagesChannel)
    }
  }, [])

  // ── Auto-select from URL ──────────────────────────────────────────────────
  useEffect(() => {
    const leadId = searchParams.get('leadId')
    if (leadId && leads.some(l => l.id === leadId)) {
      handleSelectLead(leadId)
    }
  }, [searchParams, leads, handleSelectLead])

  // ── Mark as read ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedLeadId) return
    const markAsRead = async () => {
      const supabase = createClient()
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('lead_id', selectedLeadId)
        .eq('direction', 'inbound')
        .eq('is_read', false)
      if (!error) {
        setConvMessages(prev => {
          const existing = prev[selectedLeadId]
          if (!existing) return prev
          return {
            ...prev,
            [selectedLeadId]: existing.map(m =>
              m.direction === 'inbound' ? { ...m, is_read: true } : m
            )
          }
        })
        refreshUnreadCount()
      }
    }
    markAsRead()
  }, [selectedLeadId, refreshUnreadCount])

  // ── Scroll to bottom on new messages ─────────────────────────────────────
  useEffect(() => {
    if (!loadingConv) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [selectedLeadId, convMessages, loadingConv])

  // ── Audio helpers ─────────────────────────────────────────────────────────

  // Pick the best MIME type the browser supports, preferring Meta-compatible formats
  const getBestAudioMime = (): string => {
    const candidates = [
      'audio/ogg;codecs=opus', // Firefox — ideal, Meta accepts natively
      'audio/mp4',             // Safari — Meta accepts natively
      'audio/webm;codecs=opus',// Chrome — needs server conversion
      'audio/webm',            // Chrome fallback
    ]
    return candidates.find(t => MediaRecorder.isTypeSupported(t)) ?? ''
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getBestAudioMime()
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      const actualMime = mediaRecorder.mimeType || mimeType || 'audio/webm'
      setRecordedMimeType(actualMime)

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: actualMime })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      timerIntervalRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000)
    } catch {
      alert('No se pudo acceder al micrófono.')
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

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  // ── Send handlers ─────────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    if (!chatMessage.trim() || isSendingMessage || !selectedLeadId || !selectedLead) return
    setIsSendingMessage(true)
    try {
      const ok = await sendManualWhatsApp(selectedLead.phone || '', chatMessage, selectedLeadId)
      if (ok) setChatMessage('')
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleSendAudio = async () => {
    if (!audioBlob || isUploadingMedia || !selectedLeadId || !selectedLead) return
    setIsUploadingMedia(true)
    setUploadStatus(null)

    try {
      const supabase = createClient()
      let finalBlob = audioBlob
      let finalMime = recordedMimeType
      const timestamp = Date.now()

      // If the browser only supports WebM (Chrome), convert to OGG server-side
      const needsConversion = recordedMimeType.startsWith('audio/webm')
      if (needsConversion) {
        setUploadStatus('Convirtiendo audio...')
        const fd = new FormData()
        fd.append('audio', audioBlob, 'audio.webm')
        const res = await fetch('/api/audio/convert', { method: 'POST', body: fd })

        if (res.ok) {
          finalBlob = await res.blob()
          finalMime = 'audio/ogg'
        } else {
          const errData = await res.json().catch(() => ({}))
          if (errData.error === 'ffmpeg_not_installed') {
            // ffmpeg not on server — upload WebM as document fallback
            console.warn('[handleSendAudio] ffmpeg not available, uploading WebM as document')
            finalMime = 'audio/webm'
          } else {
            throw new Error(errData.detail || 'Audio conversion failed')
          }
        }
      }

      setUploadStatus('Subiendo audio...')
      const ext = finalMime.includes('ogg') ? 'ogg' : finalMime.includes('mp4') ? 'mp4' : 'webm'
      const fileName = `${selectedLeadId}_${timestamp}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('chat_media')
        .upload(fileName, finalBlob, { contentType: finalMime })
      if (uploadError) throw uploadError

      const { data: publicData } = supabase.storage.from('chat_media').getPublicUrl(fileName)

      setUploadStatus('Enviando por WhatsApp...')
      const result = await sendManualWhatsAppMedia(
        selectedLead.phone || '',
        publicData.publicUrl,
        finalMime,
        selectedLeadId
      )

      if (result.ok) {
        discardAudio()
        setUploadStatus(null)
      } else {
        const detail = result.error || 'Error desconocido de Meta'
        alert(`No se pudo enviar el audio a WhatsApp.\n\nError de Meta: ${detail}`)
        setUploadStatus(null)
      }
    } catch (err: any) {
      console.error('[handleSendAudio]', err)
      alert(`Error: ${err?.message || 'Error subiendo o enviando el audio.'}`)
      setUploadStatus(null)
    } finally {
      setIsUploadingMedia(false)
    }
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const processedLeads = useMemo(() => {
    return leads.map(lead => {
      // Use preview messages for sidebar (performance)
      const leadMsgs = previewMessages
        .filter(m => m.lead_id === lead.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const lastMessage = leadMsgs[0]
      const isPending = !!lastMessage && lastMessage.direction === 'inbound' && !lastMessage.is_read
      return { ...lead, lastMessage, isPending }
    })
    .filter(lead => {
      const matchesSearch = `${lead.first_name} ${lead.last_name} ${lead.phone}`.toLowerCase().includes(searchTerm.toLowerCase())
      if (!matchesSearch) return false
      if (isAdmin || filterType === 'all') return true
      return lead.assigned_to === currentUserId
    })
    .sort((a, b) => {
      const da = a.lastMessage?.created_at || a.created_at
      const db = b.lastMessage?.created_at || b.created_at
      return new Date(db).getTime() - new Date(da).getTime()
    })
  }, [leads, previewMessages, searchTerm, filterType, currentUserId, isAdmin])

  const selectedLead = leads.find(l => l.id === selectedLeadId)

  const selectedMessages = useMemo(() => {
    if (!selectedLeadId) return []
    const msgs = convMessages[selectedLeadId] || []
    if (!msgSearch.trim()) return msgs
    return msgs.filter(m => m.content?.toLowerCase().includes(msgSearch.toLowerCase()))
  }, [selectedLeadId, convMessages, msgSearch])

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-100px)] md:h-[calc(100vh-140px)] bg-slate-50/50 rounded-2xl md:rounded-[3rem] border border-slate-100 overflow-hidden flex animate-in fade-in duration-700">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div className={`${selectedLeadId ? 'hidden md:flex' : 'flex'} w-full md:w-[380px] border-r border-slate-100 flex-col bg-white`}>
        <div className="p-8 pb-4 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase font-sans">Chat Inbox</h1>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest italic">Live API</span>
            </div>
          </div>

          <div className="relative">
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
            {(['my', 'all'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filterType === type ? 'bg-white text-primary shadow-sm ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {type === 'my' ? 'Mis Chats' : 'Todos'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 scroll-smooth scrollbar-hide">
          {processedLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-30">
              <MessageSquare size={48} className="mb-4 text-slate-200" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Sin conversaciones</p>
            </div>
          ) : (
            processedLeads.map(lead => (
              <button
                key={lead.id}
                onClick={() => handleSelectLead(lead.id)}
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

      {/* ── Chat Pane ────────────────────────────────────────────────────── */}
      <div className={`${!selectedLeadId ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-white/40 backdrop-blur-xl relative`}>
        {selectedLead ? (
          <>
            {/* Header */}
            <div className="p-4 md:p-8 border-b border-slate-100/50 flex items-center justify-between">
              <div className="flex items-center gap-3 md:gap-5">
                <button onClick={() => setSelectedLeadId(null)} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-primary transition-colors">
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary flex items-center justify-center text-white font-black text-xs md:text-sm">
                  {selectedLead.first_name?.[0] || '?'}{selectedLead.last_name?.[0] || ''}
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-black text-slate-900 leading-none uppercase tracking-tighter truncate max-w-[150px] md:max-w-none">
                    {selectedLead.first_name} {selectedLead.last_name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 md:mt-2">
                    <span className="text-[10px] font-bold text-slate-400 hidden sm:inline-block">{selectedLead.phone}</span>
                    <span className="w-1.5 h-1.5 bg-slate-200 rounded-full hidden sm:inline-block" />
                    <Link href={`/dashboard/leads/${selectedLead.id}`} className="text-[9px] md:text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1">
                      <span className="hidden md:inline">Ver Ficha Lead</span>
                      <span className="md:hidden">Ficha</span>
                      <ChevronRight className="w-2.5 h-2.5" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Search messages toggle */}
                <button
                  onClick={() => { setShowMsgSearch(v => !v); setMsgSearch('') }}
                  className={`p-2.5 rounded-2xl transition-all ${showMsgSearch ? 'bg-primary/10 text-primary' : 'bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/5'}`}
                  title="Buscar en conversación"
                >
                  <Search className="w-4 h-4" />
                </button>
                <div className="hidden lg:flex flex-col items-end mr-2">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Estado Lead</span>
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">{selectedLead.status?.replace('_', ' ')}</span>
                </div>
                <button onClick={() => router.push(`/dashboard/leads/${selectedLead.id}`)} className="p-2.5 md:p-3.5 bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-2xl transition-all">
                  <Filter className="w-3.5 h-3.5 md:w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Message search bar */}
            {showMsgSearch && (
              <div className="px-6 py-3 border-b border-slate-100/50 bg-white/80 animate-in slide-in-from-top-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Buscar en esta conversación..."
                    value={msgSearch}
                    onChange={e => setMsgSearch(e.target.value)}
                    className="w-full bg-slate-50 rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {msgSearch && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300 uppercase">
                      {selectedMessages.length} resultados
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-10 bg-dots scroll-smooth">
              {/* Load more button */}
              {selectedLeadId && convHasMore[selectedLeadId] && (
                <div className="flex justify-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50"
                  >
                    <ChevronUp className="w-3 h-3" />
                    {loadingMore ? 'Cargando...' : 'Ver mensajes anteriores'}
                  </button>
                </div>
              )}

              {loadingConv ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3 opacity-30">
                    <Clock className="w-8 h-8 text-slate-300 animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cargando conversación...</p>
                  </div>
                </div>
              ) : selectedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-30">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <MessageSquare size={32} className="text-slate-200" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
                    {msgSearch ? 'Sin resultados' : 'No hay historial de mensajes'}
                  </p>
                </div>
              ) : (
                selectedMessages.map((msg, idx) => {
                  const currentDate = new Date(msg.created_at)
                  const prevDate = idx > 0 ? new Date(selectedMessages[idx - 1].created_at) : null
                  const isNewDay = !prevDate || currentDate.toDateString() !== prevDate.toDateString()
                  let dateLabel = ''
                  if (isNewDay) {
                    if (isToday(currentDate)) dateLabel = 'Hoy'
                    else if (isYesterday(currentDate)) dateLabel = 'Ayer'
                    else dateLabel = format(currentDate, "d 'de' MMMM", { locale: es })
                  }

                  const isHighlighted = msgSearch && msg.content?.toLowerCase().includes(msgSearch.toLowerCase())

                  return (
                    <React.Fragment key={msg.id || idx}>
                      {isNewDay && (
                        <div className="flex justify-center my-6">
                          <span className="px-4 py-1.5 bg-slate-100/80 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm backdrop-blur-sm">
                            {dateLabel}
                          </span>
                        </div>
                      )}
                      <div className={`flex flex-col ${msg.direction === 'outbound' ? 'items-end' : 'items-start'} group animate-in fade-in slide-in-from-bottom-2 ${isHighlighted ? 'opacity-100' : msgSearch ? 'opacity-30' : ''}`}>
                        <div className="flex items-end gap-3 max-w-[80%]">
                          {msg.direction === 'inbound' && (
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0 mb-3 ring-4 ring-white shadow-sm">
                              {selectedLead.first_name?.[0]}
                            </div>
                          )}
                          <div className="flex flex-col gap-1.5">
                            <div className={`p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] text-sm font-bold leading-relaxed shadow-sm transition-all group-hover:shadow-md whitespace-pre-wrap break-words ${
                              msg.direction === 'outbound'
                                ? 'bg-primary text-white rounded-br-none'
                                : 'bg-white text-slate-700 rounded-bl-none border border-slate-100'
                            }`}>
                              <MessageContent msg={msg} />
                            </div>
                            {/* Timestamp + status */}
                            <div className={`flex items-center gap-1.5 px-2 ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                              <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">
                                {format(currentDate, 'hh:mm a', { locale: es })}
                              </span>
                              {msg.direction === 'outbound' && <MessageStatus status={msg.status} />}
                            </div>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 md:p-8 pb-8 md:pb-12 bg-gradient-to-t from-white via-white/80 to-transparent">
              <div className="relative max-w-4xl mx-auto flex items-center gap-2 md:gap-3">

                {isRecording ? (
                  <div className="flex-1 bg-red-50 border border-red-100 rounded-[2.5rem] px-8 py-5 flex items-center justify-between shadow-lg shadow-red-500/5">
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
                  <div className="flex-1 bg-slate-50 rounded-[2.5rem] px-6 py-4 flex items-center gap-4 shadow-lg shadow-primary/5">
                    <button onClick={discardAudio} disabled={isUploadingMedia} className="p-3 bg-slate-200 text-slate-500 rounded-full hover:bg-red-100 hover:text-red-500 transition-colors shrink-0 disabled:opacity-40">
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <div className="flex-1 flex flex-col gap-1">
                      <audio src={audioUrl} controls className="h-10 w-full outline-none" />
                      {uploadStatus && (
                        <p className="text-[9px] font-black text-primary uppercase tracking-widest animate-pulse">{uploadStatus}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={e => setChatMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Escribe tu respuesta o graba un audio..."
                    className="flex-1 w-full bg-slate-50 border-none rounded-[2rem] md:rounded-[2.5rem] pl-6 md:pl-8 pr-6 md:pr-8 py-4 md:py-6 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-lg shadow-primary/5"
                  />
                )}

                {/* Template button — only when input is empty */}
                {!isRecording && !audioUrl && !chatMessage.trim() && (
                  <button
                    onClick={() => setShowTemplatePicker(true)}
                    className="w-[60px] h-[60px] shrink-0 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center hover:bg-primary/10 hover:text-primary active:scale-95 transition-all shadow-md border-2 border-transparent hover:border-primary/10"
                    title="Enviar plantilla"
                  >
                    <LayoutTemplate className="w-5 h-5" />
                  </button>
                )}

                {/* Mic button */}
                {!isRecording && !audioUrl && !chatMessage.trim() && (
                  <button
                    onClick={startRecording}
                    className="w-[60px] h-[60px] shrink-0 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 active:scale-95 transition-all shadow-md border-2 border-transparent hover:border-red-100"
                  >
                    <Mic className="w-6 h-6" />
                  </button>
                )}

                {/* Send button */}
                {!isRecording && (chatMessage.trim() || audioUrl) && (
                  <button
                    onClick={audioUrl ? handleSendAudio : handleSendMessage}
                    disabled={isSendingMessage || isUploadingMedia}
                    className="w-12 h-12 md:w-[60px] md:h-[60px] shrink-0 bg-primary text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 disabled:bg-slate-200 disabled:shadow-none"
                  >
                    {isSendingMessage || isUploadingMedia
                      ? <Clock className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
                      : <Send className="w-5 h-5 md:w-6 md:h-6 ml-0.5 md:ml-1" />
                    }
                  </button>
                )}
              </div>
              <p className="text-[9px] font-black text-slate-300 text-center mt-3 md:mt-6 uppercase tracking-widest opacity-50 hidden sm:block">
                Enter para enviar • Ícono de plantilla para mensajes predefinidos • Conectado a la API Oficial
              </p>
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

      {/* Template Picker Modal */}
      {showTemplatePicker && selectedLead && (
        <TemplatePicker
          lead={selectedLead}
          onClose={() => setShowTemplatePicker(false)}
          onSent={(msg) => {
            setConvMessages(prev => {
              const existing = prev[selectedLead.id] || []
              return { ...prev, [selectedLead.id]: [...existing, msg] }
            })
          }}
        />
      )}
    </div>
  )
}

// ─── Message Content Renderer ─────────────────────────────────────────────────

function MessageContent({ msg }: { msg: Message }) {
  if (msg.media_url) {
    const type = msg.media_type || ''

    if (type.startsWith('audio/')) {
      return (
        <div className="flex flex-col gap-2 min-w-[200px]">
          <audio src={msg.media_url} controls className={`w-full h-8 ${msg.direction === 'outbound' ? 'brightness-200' : ''}`} />
          {msg.content && !msg.content.startsWith('Media:') && !msg.content.startsWith('[Audio]') && (
            <p className="mt-1">{msg.content}</p>
          )}
        </div>
      )
    }

    if (type.startsWith('image/')) {
      return (
        <div className="flex flex-col gap-2">
          <img
            src={msg.media_url}
            alt="Imagen"
            className="rounded-xl max-w-[260px] max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(msg.media_url!, '_blank')}
          />
          {msg.content && !msg.content.startsWith('[Imagen]') && !msg.content.startsWith('Media:') && (
            <p className="mt-1 text-sm">{msg.content}</p>
          )}
        </div>
      )
    }

    if (type.startsWith('video/')) {
      return (
        <div className="flex flex-col gap-2">
          <video src={msg.media_url} controls className="rounded-xl max-w-[260px] max-h-[300px]" />
          {msg.content && !msg.content.startsWith('[Video]') && !msg.content.startsWith('Media:') && (
            <p className="mt-1 text-sm">{msg.content}</p>
          )}
        </div>
      )
    }

    // Document / generic media
    return (
      <a
        href={msg.media_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        <div className={`p-2 rounded-xl ${msg.direction === 'outbound' ? 'bg-white/20' : 'bg-slate-100'}`}>
          <FileText className="w-5 h-5" />
        </div>
        <span className="text-sm font-bold underline underline-offset-2">
          {msg.content || 'Documento'}
        </span>
      </a>
    )
  }

  // Plain text (including template labels)
  if (msg.content?.startsWith('[Plantilla:')) {
    return (
      <div className="flex items-center gap-2">
        <LayoutTemplate className="w-4 h-4 opacity-70 shrink-0" />
        <span className="text-sm font-bold opacity-90">{msg.content.replace('[Plantilla: ', '').replace(']', '')}</span>
      </div>
    )
  }

  return <>{msg.content}</>
}
