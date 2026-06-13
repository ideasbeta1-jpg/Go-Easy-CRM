'use client'

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  Search,
  MessageSquare,
  Send,
  ArrowLeft,
  ChevronRight,
  AlertCircle,
  Mic,
  Square,
  Trash2,
  Check,
  CheckCheck,
  Clock,
  FileText,
  ChevronUp,
  LayoutTemplate,
  X,
  Paperclip,
  MoreHorizontal,
  Filter,
} from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  sendManualWhatsApp,
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

type TabFilter = 'all' | 'unread' | 'archived'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  'bg-indigo-500', 'bg-purple-500', 'bg-teal-500', 'bg-orange-500',
  'bg-emerald-500', 'bg-rose-500', 'bg-blue-500', 'bg-amber-500',
]

function getAvatarColor(name: string): string {
  const code = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return AVATAR_PALETTE[code % AVATAR_PALETTE.length]
}

function formatStatus(status?: string): string {
  if (!status) return ''
  const MAP: Record<string, string> = {
    lead_nuevo: 'Lead Nuevo',
    en_cotizacion: 'Cotización',
    reserva_confirmada: 'Confirmada',
    voucher_enviado: 'Voucher',
    cerrado_ganado: 'Ganado',
    cerrado_perdido: 'Perdido',
  }
  return MAP[status] || status.replace(/_/g, ' ')
}

// ─── Status Icon ─────────────────────────────────────────────────────────────

function MessageStatus({ status }: { status?: string | null }) {
  if (status === 'read') return <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
  if (status === 'delivered') return <CheckCheck className="w-3.5 h-3.5 text-slate-300" />
  if (status === 'failed') return <X className="w-3.5 h-3.5 text-red-400" />
  return <Check className="w-3.5 h-3.5 text-slate-300" />
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
      const result = await sendTemplateFromChat(lead.id, lead.phone || '', template.name, langCode, components)
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

  const filtered = templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center bg-black/30 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-0">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Enviar Plantilla</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{lead.first_name} {lead.last_name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
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
                  className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-primary/20 hover:bg-primary/5 transition-all disabled:opacity-50"
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
  initialUnreadByLead = {},
  currentUserId,
  isAdmin = false
}: {
  initialLeads: Lead[]
  initialMessages: Message[]
  initialUnreadByLead?: Record<string, number>
  currentUserId: string
  isAdmin?: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshUnreadCount } = useNotifications()

  const [searchTerm, setSearchTerm] = useState('')
  const [tabFilter, setTabFilter] = useState<TabFilter>('all')
  const [filterType, setFilterType] = useState<'my' | 'all' | 'unassigned'>('my')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [chatMessage, setChatMessage] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [msgSearch, setMsgSearch] = useState('')
  const [showMsgSearch, setShowMsgSearch] = useState(false)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)

  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [previewMessages, setPreviewMessages] = useState<Message[]>(initialMessages)
  // Conteo real de no-leídos por conversación (sembrado desde el servidor). Se
  // incrementa con realtime y se limpia al abrir el chat.
  const [unreadByLead, setUnreadByLead] = useState<Record<string, number>>(initialUnreadByLead)
  const selectedLeadIdRef = useRef<string | null>(null)

  // Render progresivo de la barra lateral: se muestran SIDEBAR_PAGE conversaciones
  // y se renderizan más al hacer scroll (no se montan cientos de filas de golpe).
  const SIDEBAR_PAGE = 20
  const [visibleCount, setVisibleCount] = useState(SIDEBAR_PAGE)
  const listRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const [convMessages, setConvMessages] = useState<Record<string, Message[]>>({})
  const [convPage, setConvPage] = useState<Record<string, number>>({})
  const [convHasMore, setConvHasMore] = useState<Record<string, boolean>>({})
  const [loadingConv, setLoadingConv] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

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

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Load conversation ─────────────────────────────────────────────────────
  const loadConversation = useCallback(async (leadId: string, page = 0) => {
    if (page === 0) setLoadingConv(true)
    else setLoadingMore(true)
    try {
      const { messages, hasMore } = await getLeadMessages(leadId, page)
      setConvMessages(prev => {
        const existing = page === 0 ? [] : (prev[leadId] || [])
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
    if (!convMessages[leadId]) loadConversation(leadId, 0)
  }, [convMessages, loadConversation])

  const handleLoadMore = () => {
    if (!selectedLeadId || loadingMore) return
    loadConversation(selectedLeadId, (convPage[selectedLeadId] ?? 0) + 1)
  }

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    // Los agentes solo escuchan cambios de SUS leads; antes cada cliente recibía
    // todos los cambios de leads de toda la empresa.
    const leadsFilter = isAdmin ? {} : { filter: `assigned_to=eq.${currentUserId}` }
    const leadsChannel = supabase
      .channel('leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', ...leadsFilter }, (payload) => {
        if (payload.eventType === 'INSERT') setLeads(prev => [payload.new as Lead, ...prev])
        else if (payload.eventType === 'UPDATE') setLeads(prev => prev.map(l => l.id === payload.new.id ? { ...l, ...payload.new } : l))
      })
      .subscribe()

    const messagesChannel = supabase
      .channel('messages-all')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as Message
        setPreviewMessages(prev => prev.some(m => m.id === msg.id) ? prev : [msg, ...prev])
        setConvMessages(prev => {
          const existing = prev[msg.lead_id]
          if (!existing || existing.some(m => m.id === msg.id)) return prev
          return { ...prev, [msg.lead_id]: [...existing, msg] }
        })
        // Incrementar no-leídos si el mensaje entrante no es del chat abierto.
        if (msg.direction === 'inbound' && !msg.is_read && msg.lead_id !== selectedLeadIdRef.current) {
          setUnreadByLead(prev => ({ ...prev, [msg.lead_id]: (prev[msg.lead_id] || 0) + 1 }))
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as Message
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
  }, [currentUserId, isAdmin])

  useEffect(() => {
    const leadId = searchParams.get('leadId')
    if (leadId && leads.some(l => l.id === leadId)) handleSelectLead(leadId)
  }, [searchParams, leads, handleSelectLead])

  useEffect(() => {
    selectedLeadIdRef.current = selectedLeadId
    if (!selectedLeadId) return
    // Limpiar el badge de no-leídos de la conversación abierta de inmediato.
    setUnreadByLead(prev => (prev[selectedLeadId] ? { ...prev, [selectedLeadId]: 0 } : prev))
    const markAsRead = async () => {
      const supabase = createClient()
      const { error } = await supabase.from('messages').update({ is_read: true })
        .eq('lead_id', selectedLeadId).eq('direction', 'inbound').eq('is_read', false)
      if (!error) {
        setConvMessages(prev => {
          const existing = prev[selectedLeadId]
          if (!existing) return prev
          return { ...prev, [selectedLeadId]: existing.map(m => m.direction === 'inbound' ? { ...m, is_read: true } : m) }
        })
        refreshUnreadCount()
      }
    }
    markAsRead()
  }, [selectedLeadId, refreshUnreadCount])

  useEffect(() => {
    if (!loadingConv) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedLeadId, convMessages, loadingConv])

  // ── Audio helpers ─────────────────────────────────────────────────────────
  const getBestAudioMime = (): string => {
    const candidates = ['audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    setImageFile(file)
    setImagePreviewUrl(URL.createObjectURL(file))
    e.target.value = ''
  }

  const discardImage = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    setImageFile(null)
    setImagePreviewUrl(null)
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
    setUploadStatus('Enviando audio...')
    try {
      const ext = recordedMimeType.includes('ogg') ? 'ogg' : recordedMimeType.includes('mp4') ? 'mp4' : 'webm'
      const fd = new FormData()
      fd.append('audio', audioBlob, `audio.${ext}`)
      fd.append('phone', selectedLead.phone || '')
      fd.append('leadId', selectedLeadId)
      const res = await fetch('/api/audio/send', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.ok) {
        if (data.message) {
          setConvMessages(prev => {
            const existing = prev[selectedLeadId] || []
            if (existing.some((m: Message) => m.id === data.message.id)) return prev
            return { ...prev, [selectedLeadId]: [...existing, data.message] }
          })
        }
        discardAudio()
        setUploadStatus(null)
      } else {
        alert(`No se pudo enviar el audio.\n\nError: ${data.error || 'Error desconocido'}`)
        setUploadStatus(null)
      }
    } catch (err: any) {
      alert(`Error: ${err?.message || 'Error enviando el audio.'}`)
      setUploadStatus(null)
    } finally {
      setIsUploadingMedia(false)
    }
  }

  const handleSendImage = async () => {
    if (!imageFile || isUploadingMedia || !selectedLeadId || !selectedLead) return
    setIsUploadingMedia(true)
    setUploadStatus('Enviando imagen...')
    try {
      const fd = new FormData()
      fd.append('media', imageFile)
      fd.append('phone', selectedLead.phone || '')
      fd.append('leadId', selectedLeadId)
      const res = await fetch('/api/media/send', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.ok) {
        if (data.message) {
          setConvMessages(prev => {
            const existing = prev[selectedLeadId] || []
            if (existing.some((m: Message) => m.id === data.message.id)) return prev
            return { ...prev, [selectedLeadId]: [...existing, data.message] }
          })
        }
        discardImage()
        setUploadStatus(null)
      } else {
        alert(`No se pudo enviar la imagen.\n\nError: ${data.error || 'Error desconocido'}`)
        setUploadStatus(null)
      }
    } catch (err: any) {
      alert(`Error: ${err?.message || 'Error enviando la imagen.'}`)
      setUploadStatus(null)
    } finally {
      setIsUploadingMedia(false)
    }
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const processedLeads = useMemo(() => {
    return leads.map(lead => {
      const leadMsgs = previewMessages
        .filter(m => m.lead_id === lead.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const lastMessage = leadMsgs[0]
      const isPending = (unreadByLead[lead.id] || 0) > 0
      return { ...lead, lastMessage, isPending }
    })
    .filter(lead => {
      const matchesSearch = `${lead.first_name} ${lead.last_name} ${lead.phone}`.toLowerCase().includes(searchTerm.toLowerCase())
      if (!matchesSearch) return false

      // Assignment Filter
      if (filterType === 'my') {
        if (lead.assigned_to !== currentUserId) return false
      } else if (filterType === 'unassigned') {
        if (lead.assigned_to) return false
      }

      // Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'active') {
          if (lead.status === 'cerrado_ganado' || lead.status === 'cerrado_perdido') return false
        } else if (lead.status !== statusFilter) {
          return false
        }
      }

      return true
    })
    .sort((a, b) => {
      const da = a.lastMessage?.created_at || a.created_at
      const db = b.lastMessage?.created_at || b.created_at
      return new Date(db).getTime() - new Date(da).getTime()
    })
  }, [leads, previewMessages, unreadByLead, searchTerm, filterType, statusFilter, currentUserId, isAdmin])

  const totalUnread = useMemo(() => processedLeads.filter(l => l.isPending).length, [processedLeads])

  const displayedLeads = useMemo(() => {
    if (tabFilter === 'unread') return processedLeads.filter(l => l.isPending)
    if (tabFilter === 'archived') return []
    return processedLeads
  }, [processedLeads, tabFilter])

  // Solo se renderizan las primeras visibleCount conversaciones.
  const visibleLeads = useMemo(() => displayedLeads.slice(0, visibleCount), [displayedLeads, visibleCount])

  // Al cambiar de filtro/búsqueda/pestaña, volver a la primera página de render.
  useEffect(() => { setVisibleCount(SIDEBAR_PAGE) }, [searchTerm, filterType, statusFilter, tabFilter])

  // Cargar más filas cuando el centinela entra en viewport (scroll infinito cliente).
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setVisibleCount(c => c + SIDEBAR_PAGE) },
      { root: listRef.current, rootMargin: '300px' }
    )
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [displayedLeads.length, visibleCount])

  const selectedLead = leads.find(l => l.id === selectedLeadId)

  const selectedMessages = useMemo(() => {
    if (!selectedLeadId) return []
    const msgs = convMessages[selectedLeadId] || []
    if (!msgSearch.trim()) return msgs
    return msgs.filter(m => m.content?.toLowerCase().includes(msgSearch.toLowerCase()))
  }, [selectedLeadId, convMessages, msgSearch])

  const { isWindowOpen, lastInboundAt } = useMemo(() => {
    if (!selectedLeadId) return { isWindowOpen: false, lastInboundAt: null }
    const msgs = convMessages[selectedLeadId] || []
    const lastInbound = [...msgs].reverse().find(m => m.direction === 'inbound')
    if (!lastInbound) return { isWindowOpen: false, lastInboundAt: null }
    const diff = Date.now() - new Date(lastInbound.created_at).getTime()
    return { isWindowOpen: diff < 24 * 60 * 60 * 1000, lastInboundAt: new Date(lastInbound.created_at) }
  }, [selectedLeadId, convMessages])

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-100px)] md:h-[calc(100vh-140px)] flex overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm animate-in fade-in duration-500">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div className={`${selectedLeadId ? 'hidden md:flex' : 'flex'} w-full md:w-[320px] flex-col border-r border-slate-100 bg-white shrink-0`}>

        {/* Sidebar header */}
        <div className="px-5 pt-5 pb-0">
          <h1 className="text-xl font-black text-slate-900 mb-4">Conversaciones</h1>

          {/* Segmented Control for Assignment */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100/80 rounded-xl mb-4 text-[11px] font-bold text-slate-500 shrink-0">
            <button
              type="button"
              onClick={() => setFilterType('my')}
              className={`py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                filterType === 'my'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Mis chats
            </button>
            <button
              type="button"
              onClick={() => setFilterType('unassigned')}
              className={`py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                filterType === 'unassigned'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Sin asignar
            </button>
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Todos
            </button>
          </div>

          {/* Search & Status Filter Button */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-600 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:bg-white border border-transparent focus:border-primary/10 transition-all font-semibold"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(v => !v)}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                showFilters || statusFilter !== 'all'
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : 'bg-slate-50 text-slate-400 border-slate-100 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title="Filtros de estado"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>

          {/* Collapsible Advanced Filters */}
          {showFilters && (
            <div className="mb-4 p-3 bg-slate-50 rounded-2xl border border-slate-100/50 space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                  Estado del Lead
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    { id: 'all', label: 'Todos' },
                    { id: 'active', label: 'Activos' },
                    { id: 'lead_nuevo', label: 'Nuevo' },
                    { id: 'en_cotizacion', label: 'Cotización' },
                    { id: 'reserva_confirmada', label: 'Confirmada' },
                    { id: 'voucher_enviado', label: 'Voucher' },
                    { id: 'cerrado_ganado', label: 'Ganado' },
                    { id: 'cerrado_perdido', label: 'Perdido' },
                  ]).map(status => (
                    <button
                      key={status.id}
                      type="button"
                      onClick={() => setStatusFilter(status.id)}
                      className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-bold transition-all border cursor-pointer ${
                        statusFilter === status.id
                          ? 'bg-white text-primary border-primary/20 shadow-xs'
                          : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-700'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {statusFilter !== 'all' && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline cursor-pointer"
                  >
                    Limpiar filtros
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            {([
              { id: 'all', label: 'Todos', count: null },
              { id: 'unread', label: 'Sin leer', count: totalUnread },
              { id: 'archived', label: 'Archivados', count: null },
            ] as { id: TabFilter; label: string; count: number | null }[]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setTabFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-3 text-[13px] font-bold border-b-2 -mb-px transition-all ${
                  tabFilter === tab.id
                    ? 'text-primary border-primary'
                    : 'text-slate-400 border-transparent hover:text-slate-600'
                }`}
              >
                {tab.label}
                {tab.count != null && tab.count > 0 && (
                  <span className="bg-primary text-white text-[9px] font-black rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-hide">
          {displayedLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-40">
              <MessageSquare size={36} className="mb-3 text-slate-300" />
              <p className="text-xs font-bold text-slate-400">
                {tabFilter === 'archived' ? 'Sin conversaciones archivadas' : 'Sin conversaciones'}
              </p>
            </div>
          ) : (
            visibleLeads.map(lead => {
              const msgUnread = unreadByLead[lead.id] || 0
              const avatarColor = getAvatarColor(`${lead.first_name}${lead.last_name}`)
              const lastMsgDate = lead.lastMessage ? new Date(lead.lastMessage.created_at) : null
              const timeStr = lastMsgDate
                ? isToday(lastMsgDate)
                  ? format(lastMsgDate, 'HH:mm')
                  : isYesterday(lastMsgDate)
                    ? 'ayer'
                    : format(lastMsgDate, 'd MMM', { locale: es })
                : ''

              return (
                <button
                  key={lead.id}
                  onClick={() => handleSelectLead(lead.id)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors border-b border-slate-50 ${
                    selectedLeadId === lead.id ? 'bg-primary/5' : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-full ${avatarColor} flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm`}>
                    {lead.first_name?.[0] || '?'}{lead.last_name?.[0] || ''}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <span className={`text-[13px] truncate ${msgUnread > 0 ? 'font-black text-slate-900' : 'font-semibold text-slate-700'}`}>
                        {lead.first_name} {lead.last_name}
                      </span>
                      <span className={`text-[11px] shrink-0 ${msgUnread > 0 ? 'text-primary font-bold' : 'text-slate-400'}`}>
                        {timeStr}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[12px] truncate leading-snug ${msgUnread > 0 ? 'font-semibold text-slate-700' : 'text-slate-400 font-normal'}`}>
                        {lead.lastMessage?.content || lead.status?.replace(/_/g, ' ') || ''}
                      </p>
                      {msgUnread > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center shrink-0">
                          {msgUnread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
          {displayedLeads.length > visibleLeads.length && (
            <div ref={sentinelRef} className="flex items-center justify-center py-4">
              <div className="w-5 h-5 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* ── Chat Pane ────────────────────────────────────────────────────── */}
      <div className={`${!selectedLeadId ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-slate-50/40`}>
        {selectedLead ? (
          <>
            {/* Chat header */}
            <div className="px-5 py-4 bg-white border-b border-slate-100 flex items-center gap-3 shrink-0">
              <button onClick={() => setSelectedLeadId(null)} className="md:hidden p-1.5 -ml-1 text-slate-400 hover:text-primary transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className={`w-10 h-10 rounded-full ${getAvatarColor(`${selectedLead.first_name}${selectedLead.last_name}`)} flex items-center justify-center text-white font-black text-sm shrink-0`}>
                {selectedLead.first_name?.[0]}{selectedLead.last_name?.[0] || ''}
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-black text-slate-900 leading-none truncate">
                  {selectedLead.first_name} {selectedLead.last_name}
                </h2>
                <p className="text-[12px] text-slate-400 mt-0.5 truncate">
                  {selectedLead.phone}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {selectedLead.status && (
                  <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-primary/8 text-primary text-[11px] font-bold rounded-full border border-primary/10">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                    {formatStatus(selectedLead.status)}
                  </span>
                )}
                <Link
                  href={`/dashboard/leads/${selectedLead.id}`}
                  className="hidden sm:flex items-center gap-0.5 text-[12px] font-bold text-slate-500 hover:text-primary transition-colors"
                >
                  Ver lead <ChevronRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => { setShowMsgSearch(v => !v); setMsgSearch('') }}
                  className={`p-2 rounded-xl transition-colors ${showMsgSearch ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                  title="Buscar en conversación"
                >
                  <Search className="w-4 h-4" />
                </button>
                <button
                  onClick={() => router.push(`/dashboard/leads/${selectedLead.id}`)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                  title="Opciones"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Message search bar */}
            {showMsgSearch && (
              <div className="px-5 py-3 border-b border-slate-100 bg-white animate-in slide-in-from-top-2 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Buscar en esta conversación..."
                    value={msgSearch}
                    onChange={e => setMsgSearch(e.target.value)}
                    className="w-full bg-slate-50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
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
            <div className="flex-1 overflow-y-auto px-5 py-5 scroll-smooth">
              {selectedLeadId && convHasMore[selectedLeadId] && (
                <div className="flex justify-center mb-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-full text-xs font-bold hover:bg-slate-50 transition-all disabled:opacity-50 shadow-sm"
                  >
                    <ChevronUp className="w-3 h-3" />
                    {loadingMore ? 'Cargando...' : 'Ver mensajes anteriores'}
                  </button>
                </div>
              )}

              {loadingConv ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3 opacity-40">
                    <Clock className="w-7 h-7 text-slate-300 animate-spin" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando conversación...</p>
                  </div>
                </div>
              ) : selectedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-30">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare size={24} className="text-slate-300" />
                  </div>
                  <p className="text-xs font-bold text-slate-400">
                    {msgSearch ? 'Sin resultados' : 'No hay mensajes aún'}
                  </p>
                </div>
              ) : (
                <>
                  {selectedMessages.map((msg, idx) => {
                    const currentDate = new Date(msg.created_at)
                    const prevDate = idx > 0 ? new Date(selectedMessages[idx - 1].created_at) : null
                    const isNewDay = !prevDate || currentDate.toDateString() !== prevDate.toDateString()
                    let dateLabel = ''
                    if (isNewDay) {
                      if (isToday(currentDate)) dateLabel = 'Hoy'
                      else if (isYesterday(currentDate)) dateLabel = 'Ayer'
                      else dateLabel = format(currentDate, "d 'de' MMMM", { locale: es })
                    }
                    const isHighlighted = !!(msgSearch && msg.content?.toLowerCase().includes(msgSearch.toLowerCase()))
                    const isOut = msg.direction === 'outbound'

                    return (
                      <React.Fragment key={msg.id || idx}>
                        {isNewDay && (
                          <div className="flex justify-center my-4">
                            <span className="px-4 py-1 bg-slate-200/70 text-slate-500 rounded-full text-[11px] font-semibold">
                              {dateLabel}
                            </span>
                          </div>
                        )}
                        <div className={`flex flex-col ${isOut ? 'items-end' : 'items-start'} mb-1.5 ${isHighlighted ? 'opacity-100' : msgSearch ? 'opacity-25' : ''}`}>
                          <div className={`max-w-[65%] px-4 py-2.5 text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap break-words ${
                            isOut
                              ? 'bg-primary text-white rounded-2xl rounded-tr-sm font-medium'
                              : 'bg-white text-slate-700 rounded-2xl rounded-tl-sm border border-slate-100 font-normal'
                          }`}>
                            <MessageContent msg={msg} />
                          </div>
                          <div className={`flex items-center gap-1 mt-1 px-1`}>
                            {isOut && <MessageStatus status={msg.status} />}
                            <span className="text-[10px] text-slate-400">
                              {format(currentDate, 'HH:mm')}
                            </span>
                          </div>
                        </div>
                      </React.Fragment>
                    )
                  })}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="px-5 py-4 bg-white border-t border-slate-100 shrink-0">
              {/* 24h window closed banner */}
              {!isWindowOpen && selectedLeadId && (
                <div className="mb-3 flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-amber-700">Ventana de 24h cerrada</p>
                    <p className="text-[11px] text-amber-500 mt-0.5">
                      {lastInboundAt
                        ? `Último mensaje: ${format(lastInboundAt, "d MMM, HH:mm", { locale: es })}`
                        : 'El cliente aún no ha enviado mensajes'
                      }{' · '}Usa una plantilla para reactivar.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowTemplatePicker(true)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-all"
                  >
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    Plantilla
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                {isRecording ? (
                  <div className="flex-1 bg-red-50 border border-red-100 rounded-2xl px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-red-500 font-bold tracking-widest text-sm">{formatTime(recordingTime)}</span>
                      <span className="text-xs font-bold text-red-400 hidden sm:inline">Grabando...</span>
                    </div>
                    <button onClick={stopRecording} className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors">
                      <Square className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                ) : audioUrl ? (
                  <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <button onClick={discardAudio} disabled={isUploadingMedia} className="p-2 bg-slate-200 text-slate-500 rounded-full hover:bg-red-100 hover:text-red-500 transition-colors shrink-0 disabled:opacity-40">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex-1">
                      <audio src={audioUrl} controls className="h-8 w-full outline-none" />
                      {uploadStatus && <p className="text-[9px] font-black text-primary uppercase tracking-widest animate-pulse mt-1">{uploadStatus}</p>}
                    </div>
                  </div>
                ) : imagePreviewUrl ? (
                  <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <button onClick={discardImage} disabled={isUploadingMedia} className="p-2 bg-slate-200 text-slate-500 rounded-full hover:bg-red-100 hover:text-red-500 transition-colors shrink-0 disabled:opacity-40">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex-1 flex items-center gap-3 min-w-0">
                      <img src={imagePreviewUrl} alt="Preview" className="h-10 w-10 rounded-lg object-cover shrink-0 ring-2 ring-slate-200" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-700 truncate">{imageFile?.name}</p>
                        <p className="text-[10px] text-slate-400">{imageFile ? `${(imageFile.size / 1024).toFixed(0)} KB` : ''}</p>
                        {uploadStatus && <p className="text-[9px] font-black text-primary animate-pulse mt-0.5">{uploadStatus}</p>}
                      </div>
                    </div>
                    <button
                      onClick={handleSendImage}
                      disabled={isUploadingMedia}
                      className="w-10 h-10 shrink-0 bg-primary text-white rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-lg shadow-primary/20 disabled:bg-slate-200 disabled:shadow-none"
                    >
                      {isUploadingMedia ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={e => isWindowOpen && setChatMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && isWindowOpen && handleSendMessage()}
                    placeholder={isWindowOpen ? 'Escribe un mensaje...' : 'Ventana cerrada — envía una plantilla para reactivar'}
                    disabled={!isWindowOpen}
                    className={`flex-1 rounded-2xl px-5 py-3.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 border ${
                      isWindowOpen
                        ? 'bg-slate-50 text-slate-700 focus:ring-primary/15 border-slate-100 focus:border-primary/20'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-100'
                    }`}
                  />
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleImageSelect}
                />

                {!isRecording && !audioUrl && !imageFile && !chatMessage.trim() && (
                  <>
                    <button
                      onClick={() => setShowTemplatePicker(true)}
                      className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all ${
                        isWindowOpen
                          ? 'bg-slate-100 text-slate-500 hover:bg-primary/10 hover:text-primary'
                          : 'bg-primary/10 text-primary hover:bg-primary/20'
                      }`}
                      title="Enviar plantilla"
                    >
                      <LayoutTemplate className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => isWindowOpen && fileInputRef.current?.click()}
                      disabled={!isWindowOpen}
                      className="w-10 h-10 shrink-0 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center hover:bg-sky-50 hover:text-sky-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Enviar imagen"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => isWindowOpen && startRecording()}
                      disabled={!isWindowOpen}
                      className="w-10 h-10 shrink-0 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Grabar audio"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  </>
                )}

                {!isRecording && !imageFile && (chatMessage.trim() || audioUrl) && (
                  <button
                    onClick={audioUrl ? handleSendAudio : handleSendMessage}
                    disabled={isSendingMessage || isUploadingMedia || !isWindowOpen}
                    className="w-10 h-10 shrink-0 bg-primary text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:bg-slate-200 disabled:shadow-none"
                  >
                    {isSendingMessage || isUploadingMedia
                      ? <Clock className="w-4 h-4 animate-spin" />
                      : <Send className="w-4 h-4 ml-0.5" />
                    }
                  </button>
                )}
              </div>

              <p className="text-[10px] text-slate-300 text-center mt-3 hidden sm:block">
                {isWindowOpen
                  ? 'Enter para enviar · Imagen, plantilla o audio · API Oficial'
                  : 'Ventana de 24h cerrada · Solo se pueden enviar plantillas de WhatsApp'
                }
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6">
              <MessageSquare size={32} className="text-primary/20" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-3">Selecciona un Chat</h2>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
              Elige una conversación de la izquierda para comenzar a gestionar el lead.
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
            className="rounded-xl max-w-[240px] max-h-[280px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
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
          <video src={msg.media_url} controls className="rounded-xl max-w-[240px] max-h-[280px]" />
          {msg.content && !msg.content.startsWith('[Video]') && !msg.content.startsWith('Media:') && (
            <p className="mt-1 text-sm">{msg.content}</p>
          )}
        </div>
      )
    }

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
