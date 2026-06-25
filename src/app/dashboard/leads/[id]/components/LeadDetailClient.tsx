'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, ArrowRight, MessageSquare, Send, Users, User, Car, Clock, DollarSign,
  CheckCircle2, AlertCircle, Zap, X, Trash2, Calculator, Mic, Volume2,
  Hash, FileText, ChevronDown, ChevronUp, Phone, Mail, MoreHorizontal,
  Check, Paperclip, UserCheck, Pencil, StickyNote
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { calcTotal } from '@/lib/leads/calculations'
import { updateLead, deleteLead } from '@/app/utils/actions/leads'
import { addLeadNote, deleteLeadNote } from '@/app/utils/actions/lead-notes'
import { generateQuoteForLead } from '@/app/utils/actions/quotes'
import { generateVoucherForLead, updateProviderConfirmation, saveVoucherDraft } from '@/app/utils/actions/vouchers'
import { simulatePayment } from '@/app/utils/actions/simulate-payment'
import { sendManualWhatsApp, sendManualWhatsAppMedia } from '@/app/utils/actions/whatsapp'
import { uploadChatMedia } from '@/app/utils/actions/storage'
import { fetchMoreMessages } from '@/app/utils/actions/messages'
import CallLogPanel from './CallLogPanel'
import { ActivityTimeline } from './sections/ActivityTimeline'
import TasksPanel from './sections/TasksPanel'
import type { Task } from '@/app/utils/actions/tasks'

// ─── Types & Constants ────────────────────────────────────────────────────────

type TabId = 'info' | 'cotizacion' | 'voucher' | 'historial' | 'tareas' | 'chat'

const STATUS_MAP: Record<string, string> = {
  lead_nuevo: 'Lead Nuevo',
  en_cotizacion: 'En Cotización',
  reserva_confirmada: 'Confirmada',
  voucher_enviado: 'Voucher',
  cerrado_ganado: 'Ganado',
  cerrado_perdido: 'Perdido',
}

const STATUS_PILL: Record<string, string> = {
  lead_nuevo: 'bg-blue-50 text-blue-600 border-blue-100',
  en_cotizacion: 'bg-amber-50 text-amber-600 border-amber-100',
  reserva_confirmada: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  voucher_enviado: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  cerrado_ganado: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  cerrado_perdido: 'bg-red-50 text-red-600 border-red-100',
}

const STATUS_DOT: Record<string, string> = {
  lead_nuevo: 'bg-blue-500',
  en_cotizacion: 'bg-amber-500',
  reserva_confirmada: 'bg-emerald-500',
  voucher_enviado: 'bg-indigo-500',
  cerrado_ganado: 'bg-emerald-600',
  cerrado_perdido: 'bg-red-500',
}

const STATUS_FLOW = ['lead_nuevo', 'en_cotizacion', 'reserva_confirmada', 'voucher_enviado', 'cerrado_ganado']

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LeadDetailClient({
  lead,
  activeQuote,
  allQuotes,
  activeVoucher,
  categories,
  providers,
  agents,
  locations,
  providerOffices: _providerOffices,
  messages: initialMessages,
  totalMessages,
  leadNotes,
  leadEvents = [],
  allVouchers = [],
  tasks: initialTasks,
  notesError,
  currentUser
}: {
  lead: any
  activeQuote?: any
  allQuotes: any[]
  activeVoucher?: any
  categories: any[]
  providers: any[]
  agents: any[]
  locations: any[]
  providerOffices: any[]
  messages: any[]
  totalMessages: number
  leadNotes: any[]
  leadEvents?: any[]
  allVouchers?: any[]
  tasks: Task[]
  notesError?: any
  currentUser?: any
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ─── UI State ──────────────────────────────────────────────────────────────
  const initialTab = (searchParams.get('tab') as TabId) || 'info'
  const [activeTab, setActiveTab] = useState<TabId>(
    ['info', 'cotizacion', 'voucher', 'historial', 'tareas', 'chat'].includes(initialTab) ? initialTab : 'info'
  )
  const [showNegotiationCalc, setShowNegotiationCalc] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingCotizacion, setIsSavingCotizacion] = useState(false)
  const [cotizacionSaved, setCotizacionSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [chatMessage, setChatMessage] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [messages, setMessages] = useState<any[]>(initialMessages)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const hasMoreMessages = messages.length < totalMessages
  const [providerConfirmation, setProviderConfirmation] = useState(activeVoucher?.provider_confirmation || '')
  const [conductorNombre, setConductorNombre] = useState(activeVoucher?.conductor_nombre || `${lead.first_name} ${lead.last_name}`.trim())
  const [conductorTelefono, setConductorTelefono] = useState(activeVoucher?.conductor_telefono || lead.phone || '')
  const [isUpdatingConfirmation, setIsUpdatingConfirmation] = useState(false)
  const [ctaProviderId, setCtaProviderId] = useState(lead.provider_id || '')
  const [ctaProviderConfirmation, setCtaProviderConfirmation] = useState(lead.draft_provider_confirmation || '')
  const [ctaConductorNombre, setCtaConductorNombre] = useState(lead.draft_conductor_nombre || `${lead.first_name} ${lead.last_name}`.trim())
  const [ctaConductorTelefono, setCtaConductorTelefono] = useState(lead.draft_conductor_telefono || lead.phone || '')
  const [ctaError, setCtaError] = useState<string | null>(null)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ─── Form State ────────────────────────────────────────────────────────────
  const [rentalDays, setRentalDays] = useState<number | null>(() => {
    if (lead.pickup_date && lead.return_date) {
      const p = new Date(lead.pickup_date)
      const r = new Date(lead.return_date)
      if (r > p) return Math.ceil((r.getTime() - p.getTime()) / (1000 * 60 * 60 * 24))
    }
    return null
  })

  const initialFormData = {
    first_name: lead.first_name || '',
    last_name: lead.last_name || '',
    email: lead.email || '',
    phone: lead.phone || '',
    pickup_location: lead.pickup_location || '',
    return_location: lead.return_location || '',
    pickup_location_id: lead.pickup_location_id || '',
    return_location_id: lead.return_location_id || '',
    pickup_date: lead.pickup_date ? lead.pickup_date.slice(0, 16) : '',
    return_date: lead.return_date ? lead.return_date.slice(0, 16) : '',
    category_id: lead.category_id || '',
    provider_id: lead.provider_id || '',
    assigned_to: lead.assigned_to || '',
    total_amount: lead.total_amount || 0,
    status: lead.status || 'lead_nuevo',
    deposit_paid: lead.deposit_paid || false,
    notes: lead.notes || '',
    agreed_daily_price: lead.agreed_daily_price || null,
    rate_plan: lead.rate_plan || 'base'
  }

  const [formData, setFormData] = useState(initialFormData)
  const selectedCategory = categories.find(c => c.id === formData.category_id)

  // ─── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedCategory && formData.pickup_date && formData.return_date) {
      const pickup = new Date(formData.pickup_date)
      const dropoff = new Date(formData.return_date)
      if (pickup < dropoff) {
        const diffInDays = Math.ceil((dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24))
        if (formData.total_amount === 0) {
          const defaultTotal = (parseFloat(selectedCategory.base_daily_cost) || 0) + (parseFloat(selectedCategory.daily_price) || 0)
          setFormData(prev => ({ ...prev, total_amount: defaultTotal * diffInDays }))
        } else if (rentalDays !== null && diffInDays !== rentalDays) {
          const dailyRate = formData.total_amount / rentalDays
          const newTotal = Number((diffInDays * dailyRate).toFixed(2))
          if (newTotal !== formData.total_amount) setFormData(prev => ({ ...prev, total_amount: newTotal }))
        }
        setRentalDays(diffInDays)
      }
    }
  }, [formData.pickup_date, formData.return_date, selectedCategory?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── Audio Recording ───────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const recordingInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isRecording) {
      recordingInterval.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000)
    } else {
      if (recordingInterval.current) clearInterval(recordingInterval.current)
      setRecordingTime(0)
    }
    return () => { if (recordingInterval.current) clearInterval(recordingInterval.current) }
  }, [isRecording])

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleRegenerateQuote = async () => {
    const priceChanged = activeQuote && Math.abs(Number(activeQuote.total_amount) - formData.total_amount) > 0.01
    const hasExistingQuote = !!activeQuote

    if (hasExistingQuote) {
      const msg = priceChanged
        ? `¿Regenerar cotización?\n\nEl precio cambió de $${Number(activeQuote.total_amount).toFixed(2)} → $${formData.total_amount.toFixed(2)}.\n\nEl enlace anterior quedará invalidado y el cliente recibirá uno nuevo.`
        : `¿Regenerar cotización con el mismo precio ($${formData.total_amount.toFixed(2)})?\n\nEl enlace anterior quedará invalidado y se creará uno nuevo.`
      if (!confirm(msg)) return
    }

    startTransition(async () => {
      try {
        // Save lead with current form data first so generateQuoteForLead reads fresh dates/prices
        await updateLead(lead.id, {
          ...formData,
          category_id: formData.category_id || null,
          provider_id: formData.provider_id || null,
          assigned_to: formData.assigned_to || null,
          pickup_location_id: formData.pickup_location_id || null,
          return_location_id: formData.return_location_id || null,
          pickup_date: formData.pickup_date || null,
          return_date: formData.return_date || null,
          total_amount: parseFloat(formData.total_amount as any) || 0,
          agreed_daily_price: formData.agreed_daily_price !== null ? parseFloat(formData.agreed_daily_price as any) : null,
          deposit_paid: !!formData.deposit_paid,
          notes: formData.notes || '',
        })
        await generateQuoteForLead(lead.id, formData.total_amount)
        setFormData(prev => ({ ...prev, status: 'en_cotizacion' }))
        router.refresh()
      } catch (e: any) {
        alert('Error al generar la cotización: ' + (e?.message || 'Error desconocido'))
      }
    })
  }

  const handleRegenerateVoucher = async () => {
    if (!confirm('¿Anular el voucher anterior y generar uno nuevo?')) return
    startTransition(async () => {
      try {
        await generateVoucherForLead(lead.id, formData.provider_id || ctaProviderId, providerConfirmation || ctaProviderConfirmation, conductorNombre || ctaConductorNombre, conductorTelefono || ctaConductorTelefono)
        router.refresh()
      } catch {
        alert('Error al regenerar voucher')
      }
    })
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      setMediaRecorder(recorder)
      setAudioChunks([])
      recorder.ondataavailable = (e) => { if (e.data.size > 0) setAudioChunks(prev => [...prev, e.data]) }
      recorder.start()
      setIsRecording(true)
    } catch {
      alert('No se pudo acceder al micrófono.')
    }
  }

  const stopRecordingAndSend = async () => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/ogg; codecs=opus' })
      if (audioBlob.size < 1000) { setIsRecording(false); return }
      setIsSendingMessage(true)
      try {
        const arrayBuffer = await audioBlob.arrayBuffer()
        const buffer = Array.from(new Uint8Array(arrayBuffer))
        const { publicUrl, error } = await uploadChatMedia({ name: `audio-${Date.now()}.ogg`, type: 'audio/ogg', buffer })
        if (error) throw new Error(error)
        if (publicUrl) { await sendManualWhatsAppMedia(formData.phone || '', publicUrl, 'audio/ogg', lead.id); router.refresh() }
      } catch (err: any) {
        alert('Error al enviar el audio: ' + err.message)
      } finally {
        setIsSendingMessage(false)
        setIsRecording(false)
      }
    }
    mediaRecorder.stop()
    mediaRecorder.stream.getTracks().forEach(t => t.stop())
  }

  const cancelRecording = () => {
    if (mediaRecorder) { mediaRecorder.stop(); mediaRecorder.stream.getTracks().forEach(t => t.stop()) }
    setIsRecording(false)
    setAudioChunks([])
  }

  const handleLoadMoreMessages = async () => {
    setIsLoadingMore(true)
    try {
      const older = await fetchMoreMessages(lead.id, messages.length)
      setMessages(prev => [...older, ...prev])
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || isSendingMessage) return
    const text = chatMessage
    const optimistic = { id: `opt-${Date.now()}`, direction: 'outbound', content: text, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic])
    setChatMessage('')
    setIsSendingMessage(true)
    try {
      await sendManualWhatsApp(formData.phone || '', text, lead.id)
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setChatMessage(text)
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    setFormData(prev => ({ ...prev, status: newStatus }))
    try {
      await updateLead(lead.id, { status: newStatus })
      router.refresh()
    } catch (err: any) {
      setFormData(prev => ({ ...prev, status: lead.status }))
      alert('Error al actualizar el estado: ' + (err.message || 'Error desconocido'))
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim() || isAddingNote) return
    setIsAddingNote(true)
    try {
      await addLeadNote(lead.id, newNote.trim())
      setNewNote('')
      router.refresh()
    } finally {
      setIsAddingNote(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('¿Eliminar esta nota?')) return
    try { await deleteLeadNote(noteId, lead.id) } catch {}
  }

  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)
    const updates = {
      ...formData,
      category_id: formData.category_id || null,
      provider_id: formData.provider_id || null,
      assigned_to: formData.assigned_to || null,
      pickup_location_id: formData.pickup_location_id || null,
      return_location_id: formData.return_location_id || null,
      total_amount: parseFloat(formData.total_amount as any) || 0,
      pickup_date: formData.pickup_date || null,
      return_date: formData.return_date || null,
      deposit_paid: !!formData.deposit_paid,
      notes: formData.notes || '',
      agreed_daily_price: formData.agreed_daily_price !== null ? parseFloat(formData.agreed_daily_price as any) : null,
    }
    try {
      await updateLead(lead.id, updates)
      router.refresh()
    } catch (error: any) {
      alert(`Error al guardar: ${error.message || 'Error desconocido'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveCotizacion = async () => {
    if (isSavingCotizacion) return
    setIsSavingCotizacion(true)
    try {
      await updateLead(lead.id, {
        category_id: formData.category_id || null,
        pickup_location_id: formData.pickup_location_id || null,
        return_location_id: formData.return_location_id || null,
        pickup_location: formData.pickup_location || null,
        return_location: formData.return_location || null,
        pickup_date: formData.pickup_date || null,
        return_date: formData.return_date || null,
        total_amount: parseFloat(formData.total_amount as any) || 0,
        agreed_daily_price: formData.agreed_daily_price !== null ? parseFloat(formData.agreed_daily_price as any) : null,
        rate_plan: formData.rate_plan,
      })
      setCotizacionSaved(true)
      setTimeout(() => setCotizacionSaved(false), 2500)
      router.refresh()
    } catch (error: any) {
      alert(`Error al guardar: ${error.message || 'Error desconocido'}`)
    } finally {
      setIsSavingCotizacion(false)
    }
  }

  const handleRatePlanChange = (newPlan: string) => {
    const days = rentalDays || 1
    if (formData.agreed_daily_price === null && selectedCategory) {
      setFormData(prev => ({ ...prev, rate_plan: newPlan, total_amount: calcTotal(selectedCategory, days, newPlan) }))
    } else {
      setFormData(prev => ({ ...prev, rate_plan: newPlan }))
    }
  }

  const handleDeleteLead = async () => {
    if (!confirm('¿Archivar este lead? Quedará oculto del pipeline.')) return
    try {
      await deleteLead(lead.id)
      router.push('/dashboard/leads')
    } catch (error: any) {
      alert(`Error al archivar: ${error.message || 'Unknown error'}`)
    }
  }

  // ─── Computed ──────────────────────────────────────────────────────────────
  const selectedProvider = providers.find(p => p.id === formData.provider_id)
  const selectedAgent = agents.find(a => a.id === formData.assigned_to)
  // Solo los administradores pueden reasignar el responsable; los agentes lo ven en solo lectura.
  const isAdmin = currentUser?.role === 'admin'
  const daysForCalc = rentalDays || 1
  const categoryBaseCost = parseFloat(selectedCategory?.base_daily_cost || 0)
  const categoryDefaultMargin = parseFloat(selectedCategory?.daily_price || 0)
  const currentMargin = formData.agreed_daily_price !== null ? parseFloat(formData.agreed_daily_price as any) : categoryDefaultMargin
  const currentTotalDaily = formData.total_amount > 0 ? (formData.total_amount / daysForCalc) : (categoryBaseCost + categoryDefaultMargin)
  const currentVehicleCost = currentTotalDaily - currentMargin

  // Desglose de cobro mostrado al cliente (mismo cálculo que la cotización pública):
  // el depósito online = margen diario × días; el saldo en counter = total − depósito.
  const depositTotal = currentMargin * daysForCalc
  const balanceAtCounter = Math.max(0, formData.total_amount - depositTotal)

  const shortId = `GE-${lead.id.slice(-4).toUpperCase()}`
  const currentStatusIdx = STATUS_FLOW.indexOf(formData.status)
  const nextStatus = currentStatusIdx >= 0 && currentStatusIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentStatusIdx + 1] : null
  const prevStatus = currentStatusIdx > 0 ? STATUS_FLOW[currentStatusIdx - 1] : null
  const hoursOld = (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60)
  const isUrgent = ['lead_nuevo', 'en_cotizacion'].includes(formData.status) && hoursOld > 48

  // Timeline events
  interface TimelineEvent { id: string; title: string; date: string | any; icon: any; color: string; desc: string; isMismatch?: boolean; quoteId?: string; actor?: string; href?: string; linkLabel?: string }
  const timelineEvents: TimelineEvent[] = [
    { id: 'created', title: 'Lead Capturado', date: lead.created_at || new Date().toISOString(), icon: User, color: 'bg-primary text-white', desc: 'Registro inicial creado en el CRM' }
  ]

  // Helpers de presentación para los eventos del registro de auditoría
  const agentNameById = (id: string | null) => agents.find((a: any) => a.id === id)?.full_name || (id ? 'Agente' : 'Sin asignar')
  const categoryNameById = (id: string | null) => categories.find((c: any) => c.id === id)?.name || '—'
  const statusLabel = (s: string | null) => (s ? STATUS_MAP[s] || s : '—')
  const fmtDateValue = (v: any) => { try { return v ? format(new Date(v), 'dd MMM yyyy', { locale: es }) : '—' } catch { return String(v ?? '—') } }
  const fieldChangeDesc = (m: any) => {
    const label = m.label || m.field
    let oldV = m.old_value, newV = m.new_value
    if (m.field === 'category_id') { oldV = categoryNameById(oldV); newV = categoryNameById(newV) }
    else if (m.field === 'total_amount') { oldV = `$${Number(oldV || 0).toFixed(2)}`; newV = `$${Number(newV || 0).toFixed(2)}` }
    else if (typeof m.field === 'string' && m.field.includes('date')) { oldV = fmtDateValue(oldV); newV = fmtDateValue(newV) }
    return `${label}: ${oldV ?? '—'} → ${newV ?? '—'}`
  }
  // Notas manuales del agente (excluye marcadores legacy como [VOUCHER_GENERATED])
  const manualNotes = (leadNotes || []).filter((n: any) => !n.content?.trim().startsWith('['))

  // Build quote history events from all quotes (sorted oldest first)
  const sortedQuotes = [...allQuotes].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  sortedQuotes.forEach((q, idx) => {
    const isFirst = idx === 0
    const prevQuote = sortedQuotes[idx - 1]
    const priceChanged = prevQuote && Math.abs(Number(q.total_amount) - Number(prevQuote.total_amount)) > 0.01

    if (isFirst) {
      timelineEvents.push({
        id: `quote-${q.id}`,
        title: 'Cotización Generada',
        date: q.created_at,
        icon: Zap,
        color: q.is_active ? 'bg-amber-400 text-white' : 'bg-amber-100 text-amber-500',
        desc: q.expires_at
          ? `$${Number(q.total_amount).toFixed(2)} · Oferta válida hasta ${format(new Date(q.expires_at), 'dd MMM')}`
          : `$${Number(q.total_amount).toFixed(2)} · Cotización enviada al cliente`,
        quoteId: q.id,
      })
    } else {
      timelineEvents.push({
        id: `quote-${q.id}`,
        title: 'Cotización Regenerada',
        date: q.created_at,
        icon: Zap,
        color: q.is_active ? 'bg-amber-400 text-white' : 'bg-amber-100 text-amber-500',
        desc: priceChanged
          ? `Precio actualizado: $${Number(prevQuote.total_amount).toFixed(2)} → $${Number(q.total_amount).toFixed(2)}${q.is_active ? ' · Enlace activo' : ' · Enlace invalidado'}`
          : `Mismo precio ($${Number(q.total_amount).toFixed(2)}) · Nuevo enlace generado${q.is_active ? '' : ' · Invalidado'}`,
        quoteId: q.id,
      })
    }
  })

  // Mismatch warning if active quote price differs from current form total
  if (activeQuote && Math.abs(parseFloat(activeQuote.total_amount || 0) - formData.total_amount) > 0.01 && lead.status === 'en_cotizacion') {
    timelineEvents.push({
      id: 'quote-mismatch',
      title: 'Precio Modificado sin Regenerar',
      date: lead.updated_at || new Date().toISOString(),
      icon: AlertCircle,
      color: 'bg-red-500 text-white',
      desc: `El formulario tiene $${formData.total_amount.toFixed(2)} pero la cotización activa es $${Number(activeQuote.total_amount).toFixed(2)}. Regenera para actualizar el enlace del cliente.`,
      isMismatch: true,
    })
  }

  // Vouchers (todos, no solo el activo) — append-only desde la tabla vouchers
  ;(allVouchers || []).forEach((v: any) => {
    timelineEvents.push({
      id: `voucher-${v.id}`,
      title: 'Voucher Enviado',
      date: v.created_at,
      icon: FileText,
      color: 'bg-indigo-600 text-white',
      desc: `Voucher (${v.confirmation_number}) enviado al cliente.`,
      href: `/v/${v.id}`,
      linkLabel: 'Ver Voucher',
    })
  })

  // Eventos del registro de auditoría (lead_events): etapa, pago, reasignación,
  // edición de datos. Cotización/voucher se reconstruyen desde sus tablas arriba.
  const hasPaymentEvent = (leadEvents || []).some((e: any) => e.event_type === 'payment_confirmed')
  ;(leadEvents || []).forEach((ev: any) => {
    const actor = ev.actor?.full_name || ev.actor_label || 'Sistema'
    const m = ev.metadata || {}
    switch (ev.event_type) {
      case 'stage_change':
        timelineEvents.push({
          id: `event-${ev.id}`, title: 'Cambio de Etapa', date: ev.created_at, icon: ArrowRight,
          color: 'bg-slate-700 text-white', actor,
          desc: `${statusLabel(ev.from_status)} → ${statusLabel(ev.to_status)}${m.lost_reason ? ` · Motivo: ${m.lost_reason}` : ''}`,
        })
        break
      case 'payment_confirmed':
        timelineEvents.push({
          id: `event-${ev.id}`, title: 'Pago Confirmado', date: ev.created_at, icon: DollarSign,
          color: 'bg-emerald-600 text-white', actor,
          desc: m.amount
            ? `Depósito de $${Number(m.amount).toFixed(2)} ${m.currency || ''} recibido${m.stripe_payment_id ? ` · Ref: ${m.stripe_payment_id}` : ''}`
            : `Pago del cliente confirmado${m.simulated ? ' (simulación)' : ''}`,
        })
        break
      case 'agent_assigned':
        timelineEvents.push({
          id: `event-${ev.id}`, title: 'Reasignación de Agente', date: ev.created_at, icon: UserCheck,
          color: 'bg-purple-600 text-white', actor,
          desc: `${agentNameById(m.from_agent)} → ${agentNameById(m.to_agent)}`,
        })
        break
      case 'field_changed':
        timelineEvents.push({
          id: `event-${ev.id}`, title: 'Dato Actualizado', date: ev.created_at, icon: Pencil,
          color: 'bg-slate-500 text-white', actor, desc: fieldChangeDesc(m),
        })
        break
      // quote_generated / voucher_generated: ya reconstruidos desde quotes/vouchers
    }
  })

  // Respaldo: leads viejos ya pagados sin evento de pago registrado
  if (lead.deposit_paid && !hasPaymentEvent) {
    timelineEvents.push({ id: 'payment', title: 'Depósito Recibido', date: lead.updated_at, icon: DollarSign, color: 'bg-emerald-600 text-white', desc: `Pago confirmado (Ref: ${lead.stripe_payment_id || 'Manual'})` })
  }

  // Notas internas manuales (excluye marcadores legacy tipo [VOUCHER_GENERATED])
  manualNotes.forEach((n: any) => {
    timelineEvents.push({
      id: `note-${n.id}`, title: 'Nota Interna', date: n.created_at, icon: StickyNote,
      color: 'bg-slate-400 text-white', actor: n.profiles?.full_name || 'Agente', desc: n.content,
    })
  })

  timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Shared style helpers
  const fieldCls = "w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
  const labelCls = "block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5"

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="bg-white -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 flex flex-col"
      style={{ height: 'calc(100vh - 72px)' }}
    >

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="border-b border-slate-100 px-6 py-3.5 flex items-center justify-between shrink-0">
        <Link
          href="/dashboard/leads"
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al pipeline
        </Link>

        <div className="flex items-center gap-2">
          {formData.phone && (
            <a
              href={`tel:${formData.phone}`}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:text-primary hover:border-primary/20 transition-all"
              title="Llamar"
            >
              <Phone className="w-4 h-4" />
            </a>
          )}
          {formData.email && (
            <a
              href={`mailto:${formData.email}`}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:text-primary hover:border-primary/20 transition-all"
              title="Enviar email"
            >
              <Mail className="w-4 h-4" />
            </a>
          )}
          {prevStatus && (
            <button
              onClick={() => handleStatusChange(prevStatus)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-sm font-bold hover:text-primary hover:border-primary/20 transition-all"
              title={`Regresar a ${STATUS_MAP[prevStatus] || prevStatus}`}
            >
              ←<span className="hidden sm:inline"> Regresar etapa</span>
            </button>
          )}
          {nextStatus && (
            <button
              onClick={() => handleStatusChange(nextStatus)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dim transition-all shadow-lg shadow-primary/20"
            >
              <span className="hidden sm:inline">Avanzar etapa </span>→
            </button>
          )}
          <button
            onClick={handleDeleteLead}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition-all"
            title="Archivar lead"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Lead Title Row ──────────────────────────────────────────────── */}
      <div className="px-6 py-3.5 border-b border-slate-100 flex items-center gap-3 flex-wrap shrink-0">
        <span className="text-slate-400 font-black text-sm">{shortId}</span>
        <h1 className="text-xl font-black text-slate-900">
          {formData.first_name} {formData.last_name}
        </h1>
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${STATUS_PILL[formData.status] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[formData.status] || 'bg-slate-400'}`} />
          {STATUS_MAP[formData.status] || formData.status}
        </span>
        {isUrgent && (
          <span className="flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-500 border border-orange-100 rounded-full text-[11px] font-bold">
            <Zap className="w-3 h-3" /> Urgente
          </span>
        )}
        {selectedCategory && (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[11px] font-bold">
            {selectedCategory.name}
          </span>
        )}
      </div>

      {/* ── Tabs (desktop only) ─────────────────────────────────────── */}
      <div className="hidden lg:block border-b border-slate-100 px-6 shrink-0">
        <div className="flex">
          {([
            { id: 'info', label: 'Información' },
            { id: 'cotizacion', label: 'Cotización' },
            { id: 'voucher', label: 'Voucher' },
            { id: 'historial', label: 'Historial' },
            { id: 'tareas', label: 'Tareas' },
          ] as { id: TabId; label: string }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-bold border-b-2 -mb-px transition-all ${
                activeTab === tab.id
                  ? 'text-primary border-primary'
                  : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Two-Column Content ──────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: tab content — hidden on mobile when chat tab is active */}
        <div className={`flex-1 overflow-y-auto scrollbar-hide pb-20 lg:pb-0${activeTab === 'chat' ? ' hidden lg:block' : ''}`}>

          {/* INFORMACIÓN */}
          {activeTab === 'info' && (
            <div className="p-6 max-w-2xl">
              <h2 className="text-[15px] font-bold text-slate-900 mb-5">Datos del cliente</h2>

              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                {/* Nombre Completo */}
                <div className="col-span-2 sm:col-span-1">
                  <label className={labelCls}>Nombre Completo</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="Nombre"
                      className={fieldCls}
                    />
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="Apellido"
                      className={fieldCls}
                    />
                  </div>
                </div>

                {/* Teléfono */}
                <div>
                  <label className={labelCls}>Teléfono</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className={fieldCls}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className={labelCls}>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className={fieldCls}
                  />
                </div>

                {/* Ciudad de Origen */}
                <div>
                  <label className={labelCls}>Ciudad de Origen</label>
                  <input
                    type="text"
                    value={formData.pickup_location}
                    onChange={e => setFormData({ ...formData, pickup_location: e.target.value })}
                    className={fieldCls}
                  />
                </div>

                {/* Fecha de Recogida */}
                <div>
                  <label className={labelCls}>Fecha de Recogida</label>
                  <input
                    type="date"
                    value={formData.pickup_date?.slice(0, 10) || ''}
                    onChange={e => setFormData({ ...formData, pickup_date: e.target.value })}
                    className={fieldCls}
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label className={labelCls}>Categoría de Vehículo</label>
                  <select
                    value={formData.category_id}
                    onChange={e => setFormData({ ...formData, category_id: e.target.value, agreed_daily_price: null })}
                    className={fieldCls}
                  >
                    <option value="">Sin categoría</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* Agente asignado — editable solo para administradores */}
                <div>
                  <label className={labelCls}>Agente Asignado</label>
                  {isAdmin ? (
                    <select
                      value={formData.assigned_to}
                      onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
                      className={fieldCls}
                    >
                      <option value="">Sin agente</option>
                      {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={selectedAgent?.full_name || 'Sin agente'}
                      disabled
                      className={fieldCls}
                    />
                  )}
                </div>
              </div>

              {/* Resumen de cobro */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Renta</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">${Number(formData.total_amount).toFixed(2)}</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Depósito a cobrar</p>
                  <p className="text-lg font-black text-indigo-700 mt-0.5">${depositTotal.toFixed(2)}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Pago en counter</p>
                  <p className="text-lg font-black text-emerald-700 mt-0.5">${balanceAtCounter.toFixed(2)}</p>
                </div>
              </div>

              {/* Notas internas */}
              <div className="mt-5">
                <label className={labelCls}>Notas Internas</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  placeholder="Preferencias del cliente, notas de negociación..."
                  className={`${fieldCls} resize-none`}
                />
              </div>

              {/* Deposit toggle */}
              <div className="mt-4 flex items-center gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!formData.deposit_paid}
                    onChange={e => setFormData({ ...formData, deposit_paid: e.target.checked })}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span className="text-sm font-bold text-slate-700">Depósito recibido</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setFormData(initialFormData)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dim transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          )}

          {/* COTIZACIÓN */}
          {activeTab === 'cotizacion' && (
            <div className="p-6 space-y-5 max-w-2xl">
              {/* Vehicle + dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Vehicle dark card */}
                <div className="bg-slate-900 rounded-2xl p-5 flex flex-col gap-4">
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Vehículo</p>
                  <select
                    value={formData.category_id}
                    onChange={e => setFormData({ ...formData, category_id: e.target.value, agreed_daily_price: null })}
                    className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none"
                  >
                    <option value="" className="text-slate-900">Sin categoría</option>
                    {categories.map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>)}
                  </select>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/8 rounded-xl p-2.5 text-center border border-white/8">
                      <div className="font-black text-white text-sm">{rentalDays ?? '—'}</div>
                      <div className="text-[9px] text-white/40 uppercase">Días</div>
                    </div>
                    <div className="bg-white/8 rounded-xl p-2.5 text-center border border-white/8">
                      <div className="font-black text-white text-sm">${((formData.total_amount / (rentalDays || 1)) || 0).toFixed(0)}</div>
                      <div className="text-[9px] text-white/40 uppercase">/día</div>
                    </div>
                    <div className="bg-primary/20 border border-primary/30 rounded-xl p-2.5 text-center">
                      <div className="font-black text-primary text-sm">${formData.total_amount.toLocaleString()}</div>
                      <div className="text-[9px] text-primary/50 uppercase">Total</div>
                    </div>
                  </div>
                  {/* Rate plan */}
                  <div className="p-1 bg-white/5 rounded-xl flex relative overflow-hidden text-[10px] font-black uppercase tracking-widest">
                    <div className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-lg transition-all duration-300 bg-white shadow-sm ${formData.rate_plan === 'premium' ? 'left-[calc(50%+2px)]' : 'left-1'}`} />
                    <button onClick={() => handleRatePlanChange('base')}
                      className={`relative flex-1 py-2 transition-colors ${formData.rate_plan === 'base' ? 'text-slate-900' : 'text-white/50'}`}>
                      Base
                    </button>
                    <button onClick={() => handleRatePlanChange('premium')}
                      className={`relative flex-1 py-2 transition-colors flex items-center justify-center gap-1 ${formData.rate_plan === 'premium' ? 'text-indigo-900' : 'text-white/50'}`}>
                      <Zap className="w-3 h-3" /> Premium
                    </button>
                  </div>
                </div>

                {/* Logistics */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logística</p>
                  <div>
                    <label className={labelCls}>Recogida</label>
                    <input
                      type="datetime-local"
                      value={formData.pickup_date}
                      onChange={e => setFormData({ ...formData, pickup_date: e.target.value })}
                      className={`${fieldCls} mb-2`}
                    />
                    <select
                      value={formData.pickup_location_id}
                      onChange={e => {
                        const loc = locations.find(l => l.id === e.target.value)
                        setFormData({ ...formData, pickup_location_id: e.target.value, pickup_location: loc?.name || formData.pickup_location })
                      }}
                      className={fieldCls}
                    >
                      <option value="">— Sin ubicación —</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}{l.code ? ` (${l.code})` : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Devolución</label>
                    <input
                      type="datetime-local"
                      value={formData.return_date}
                      onChange={e => setFormData({ ...formData, return_date: e.target.value })}
                      className={`${fieldCls} mb-2`}
                    />
                    <select
                      value={formData.return_location_id}
                      onChange={e => {
                        const loc = locations.find(l => l.id === e.target.value)
                        setFormData({ ...formData, return_location_id: e.target.value, return_location: loc?.name || formData.return_location })
                      }}
                      className={fieldCls}
                    >
                      <option value="">— Sin ubicación —</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}{l.code ? ` (${l.code})` : ''}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Save cotización fields */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    category_id: lead.category_id || '',
                    pickup_date: lead.pickup_date ? lead.pickup_date.slice(0, 16) : '',
                    return_date: lead.return_date ? lead.return_date.slice(0, 16) : '',
                    pickup_location: lead.pickup_location || '',
                    return_location: lead.return_location || '',
                    pickup_location_id: lead.pickup_location_id || '',
                    return_location_id: lead.return_location_id || '',
                    total_amount: lead.total_amount || 0,
                    agreed_daily_price: lead.agreed_daily_price || null,
                    rate_plan: lead.rate_plan || 'base',
                  }))}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveCotizacion}
                  disabled={isSavingCotizacion}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dim transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {isSavingCotizacion ? 'Guardando...' : cotizacionSaved ? '¡Guardado!' : 'Guardar cambios'}
                </button>
              </div>

              {/* Total + Generate Quote */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de la Renta</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-black">$</span>
                    <input
                      type="number"
                      value={formData.total_amount}
                      onChange={e => setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })}
                      className="text-2xl font-black text-primary w-36 text-right outline-none border-b-2 border-primary/20 focus:border-primary bg-transparent"
                    />
                  </div>
                </div>

                {/* Negotiation calc */}
                {selectedCategory?.base_daily_cost && (
                  <>
                    <button onClick={() => setShowNegotiationCalc(prev => !prev)}
                      className="flex items-center gap-2 text-amber-500 hover:text-amber-400 text-[10px] font-black uppercase tracking-widest transition-colors py-1 mb-3">
                      <Calculator className="w-3.5 h-3.5" />
                      Ajustar Negociación
                      {showNegotiationCalc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {showNegotiationCalc && (
                      <div className="grid grid-cols-3 gap-3 mb-4 p-4 bg-slate-50 rounded-xl">
                        <div>
                          <label className={labelCls}>Costo Veh.</label>
                          <input type="number" value={Number(currentVehicleCost.toFixed(2))}
                            onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setFormData({ ...formData, total_amount: (v + currentMargin) * daysForCalc }) }}
                            className={fieldCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Ganancia</label>
                          <input type="number" value={Number(currentMargin.toFixed(2))}
                            onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setFormData({ ...formData, total_amount: (currentVehicleCost + v) * daysForCalc, agreed_daily_price: v }) }}
                            className={fieldCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Total/día</label>
                          <input type="number" value={Number(currentTotalDaily.toFixed(2))}
                            onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setFormData({ ...formData, total_amount: v * daysForCalc }) }}
                            className={fieldCls} />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Price change warning banner */}
                {activeQuote && Math.abs(Number(activeQuote.total_amount) - formData.total_amount) > 0.01 && (
                  <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-bold text-amber-800">Precio modificado</p>
                      <p className="text-[10px] text-amber-600 mt-0.5">
                        La cotización activa es <span className="font-black">${Number(activeQuote.total_amount).toFixed(2)}</span>.
                        Al regenerar, el cliente recibirá un enlace nuevo con <span className="font-black">${formData.total_amount.toFixed(2)}</span> y el anterior quedará invalidado.
                      </p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleRegenerateQuote}
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dim transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  {isPending ? 'Generando...' : (activeQuote ? 'Regenerar Cotización' : 'Generar Cotización')}
                </button>
                {activeQuote && (
                  <Link
                    href={`/cotizacion/${activeQuote.id}`}
                    target="_blank"
                    className="mt-2 w-full flex items-center justify-center py-2.5 text-primary border border-primary/20 rounded-xl text-sm font-bold hover:bg-primary/5 transition-all"
                  >
                    Ver Propuesta Activa →
                  </Link>
                )}
              </div>

              {/* Desglose de cobro: depósito online + saldo en counter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Depósito total a cobrar</p>
                  <p className="text-2xl font-black text-indigo-700 mt-1">${depositTotal.toFixed(2)}</p>
                  <p className="text-[11px] text-indigo-400 font-medium mt-0.5">Pago online del cliente para confirmar la reserva</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Pago en counter</p>
                  <p className="text-2xl font-black text-emerald-700 mt-1">${balanceAtCounter.toFixed(2)}</p>
                  <p className="text-[11px] text-emerald-500 font-medium mt-0.5">Lo paga el cliente al recibir el vehículo en el destino</p>
                </div>
              </div>

              <CallLogPanel leadId={lead.id} leadPhone={formData.phone || ''} agentId={currentUser?.id || ''} agentSip={currentUser?.zadarma_sip || null} />

              {/* Simulación de pago — solo para pruebas */}
              {(lead.status === 'en_cotizacion' || lead.status === 'lead_nuevo') && (
                <div className="border border-dashed border-amber-300 bg-amber-50 rounded-2xl p-4 space-y-3">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">⚡ Modo prueba</p>
                  <p className="text-xs text-amber-700 font-medium leading-relaxed">
                    Simula el pago del cliente. Si el tab Voucher tiene proveedor y n° de confirmación guardados, el voucher se generará y enviará automáticamente. Si no, pasará a Reserva Confirmada.
                  </p>
                  <button
                    onClick={async () => {
                      if (!confirm('¿Simular pago del cliente?')) return
                      startTransition(async () => {
                        try {
                          const result = await simulatePayment(lead.id)
                          router.refresh()
                          alert(result.stage === 'voucher_enviado'
                            ? '✅ Voucher generado y enviado automáticamente.'
                            : '✅ Lead pasó a Reserva Confirmada.')
                        } catch (e: any) {
                          alert(`Error: ${e.message}`)
                        }
                      })
                    }}
                    disabled={isPending}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-all disabled:opacity-50"
                  >
                    {isPending ? 'Procesando...' : '💳 Simular cotización pagada'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* VOUCHER */}
          {activeTab === 'voucher' && (
            <div className="p-6 max-w-lg">
              <div className="bg-slate-900 rounded-2xl p-6 space-y-5">
                <div>
                  <h3 className="text-xl font-black text-white">¿Reserva Confirmada?</h3>
                  <p className="text-white/40 text-sm mt-1">Genera el Voucher oficial para el cliente.</p>
                </div>

                <div className="space-y-3">
                  {/* Proveedor */}
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                      <Users className="w-3 h-3" /> Proveedor
                    </label>
                    <select
                      value={activeVoucher ? formData.provider_id : ctaProviderId}
                      onChange={e => activeVoucher
                        ? setFormData({ ...formData, provider_id: e.target.value })
                        : setCtaProviderId(e.target.value)
                      }
                      className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none"
                    >
                      <option value="" className="text-slate-900">Seleccionar rentadora...</option>
                      {providers.map(p => <option key={p.id} value={p.id} className="text-slate-900">{p.name}</option>)}
                    </select>
                  </div>

                  {/* N° Confirmación */}
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                      <Hash className="w-3 h-3" /> N° Confirmación
                    </label>
                    <input
                      type="text"
                      value={activeVoucher ? providerConfirmation : ctaProviderConfirmation}
                      onChange={e => activeVoucher ? setProviderConfirmation(e.target.value) : setCtaProviderConfirmation(e.target.value)}
                      placeholder="RC-20240412-001"
                      className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white placeholder:text-white/20 outline-none"
                    />
                  </div>

                  {/* Conductor Principal */}
                  <div className="pt-1 border-t border-white/10">
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                      <User className="w-3 h-3" /> Conductor Principal
                    </label>
                    <input
                      type="text"
                      value={activeVoucher ? conductorNombre : ctaConductorNombre}
                      onChange={e => activeVoucher ? setConductorNombre(e.target.value) : setCtaConductorNombre(e.target.value)}
                      placeholder="Nombre del conductor"
                      className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white placeholder:text-white/20 outline-none"
                    />
                  </div>

                  {/* Teléfono del conductor */}
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                      <Phone className="w-3 h-3" /> Teléfono del Conductor
                    </label>
                    <input
                      type="text"
                      value={activeVoucher ? conductorTelefono : ctaConductorTelefono}
                      onChange={e => activeVoucher ? setConductorTelefono(e.target.value) : setCtaConductorTelefono(e.target.value)}
                      placeholder="+1 305 000 0000"
                      className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white placeholder:text-white/20 outline-none"
                    />
                  </div>
                </div>

                {ctaError && (
                  <p className="text-red-400 text-xs font-bold">{ctaError}</p>
                )}

                {activeVoucher ? (
                  <div className="space-y-3">
                    {/* Guardar cambios del voucher existente */}
                    <button
                      onClick={async () => {
                        setIsUpdatingConfirmation(true)
                        try { await updateProviderConfirmation(activeVoucher.id, providerConfirmation, conductorNombre, conductorTelefono, lead.id) }
                        finally { setIsUpdatingConfirmation(false) }
                      }}
                      disabled={isUpdatingConfirmation}
                      className="w-full py-3 bg-white/10 text-white border border-white/20 rounded-xl font-bold text-sm hover:bg-white/20 transition-all disabled:opacity-50"
                    >
                      {isUpdatingConfirmation ? 'Guardando...' : 'Guardar Información de Voucher'}
                    </button>
                    <div className="flex gap-3">
                      <Link href={`/voucher/${activeVoucher.id}`} target="_blank"
                        className="flex-1 text-center py-3 bg-white/5 text-white/60 border border-white/10 rounded-xl font-bold text-sm hover:bg-white/10 transition-all">
                        Ver Voucher
                      </Link>
                      <button
                        onClick={handleRegenerateVoucher}
                        disabled={isPending}
                        className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50"
                      >
                        Regenerar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Guardar sin generar */}
                    <button
                      onClick={async () => {
                        setIsSavingDraft(true)
                        setDraftSaved(false)
                        setCtaError(null)
                        try {
                          await saveVoucherDraft(lead.id, ctaProviderId, ctaProviderConfirmation, ctaConductorNombre, ctaConductorTelefono)
                          setDraftSaved(true)
                          setTimeout(() => setDraftSaved(false), 3000)
                        } catch {
                          setCtaError('Error al guardar la información.')
                        } finally {
                          setIsSavingDraft(false)
                        }
                      }}
                      disabled={isSavingDraft}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-white/10 text-white border border-white/20 rounded-xl font-bold text-sm hover:bg-white/20 transition-all disabled:opacity-50"
                    >
                      {isSavingDraft
                        ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /><span>Guardando...</span></>
                        : draftSaved
                          ? <><Check className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400">Información guardada</span></>
                          : <span>Guardar Información de Voucher</span>
                      }
                    </button>

                    {/* Generar voucher oficial */}
                    <button
                      onClick={async () => {
                        if (!ctaProviderId) { setCtaError('Debes seleccionar un proveedor.'); return }
                        if (!ctaProviderConfirmation) { setCtaError('El n° de confirmación es obligatorio.'); return }
                        setCtaError(null)
                        startTransition(async () => {
                          try {
                            await generateVoucherForLead(lead.id, ctaProviderId, ctaProviderConfirmation, ctaConductorNombre, ctaConductorTelefono)
                            router.refresh()
                          } catch {
                            alert('Error al generar voucher')
                          }
                        })
                      }}
                      disabled={isPending}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-white text-primary rounded-xl font-black text-sm hover:opacity-90 transition-all shadow-lg shadow-black/20 disabled:opacity-50"
                    >
                      {isPending
                        ? <><div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /><span>Generando...</span></>
                        : <><CheckCircle2 className="w-4 h-4" /><span>Generar Voucher Oficial</span></>
                      }
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* HISTORIAL */}
          {activeTab === 'historial' && (
            <div className="p-6">
              <ActivityTimeline
                events={timelineEvents}
                activeQuote={activeQuote}
                onRegenerateQuote={handleRegenerateQuote}
              />
            </div>
          )}

          {/* TAREAS */}
          {activeTab === 'tareas' && (
            <TasksPanel
              leadId={lead.id}
              initialTasks={initialTasks}
              agents={agents}
              currentUserId={currentUser?.id}
            />
          )}
        </div>

        {/* ── Right sidebar: WhatsApp + Notes — shown on mobile via chat tab ── */}
        <div className={`border-l border-slate-100 flex-col shrink-0 overflow-hidden ${activeTab === 'chat' ? 'flex flex-1 lg:flex-none' : 'hidden lg:flex'} lg:w-[380px]`}>

          {/* WhatsApp Chat */}
          <div className="flex flex-col overflow-hidden" style={{ flex: '1 1 0' }}>

            {/* Chat header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-[#25D366] rounded-full flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="white" className="w-4.5 h-4.5">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">WhatsApp · {formData.phone || 'Sin teléfono'}</p>
                  <p className="text-[11px] text-emerald-500 font-medium">● en línea ahora</p>
                </div>
              </div>
              <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-hide" style={{ background: '#f8fafc' }}>
              {hasMoreMessages && (
                <div className="flex justify-center">
                  <button
                    onClick={handleLoadMoreMessages}
                    disabled={isLoadingMore}
                    className="text-[10px] font-bold text-slate-400 hover:text-primary px-3 py-1.5 rounded-full bg-white border border-slate-200 transition-colors disabled:opacity-50"
                  >
                    {isLoadingMore ? 'Cargando...' : 'Ver anteriores'}
                  </button>
                </div>
              )}
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-30 py-8">
                  <MessageSquare size={28} className="mb-2 text-slate-200" />
                  <p className="text-xs text-slate-400 font-bold">Sin mensajes</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={msg.id || i} className={`flex flex-col ${msg.direction === 'outbound' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[80%] px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap break-words ${
                      msg.direction === 'outbound'
                        ? 'bg-primary text-white rounded-2xl rounded-tr-sm font-medium'
                        : 'bg-white text-slate-700 rounded-2xl rounded-tl-sm border border-slate-100'
                    }`}>
                      {msg.media_type?.startsWith('audio/') ? (
                        <div className="min-w-[160px]">
                          <audio controls src={msg.media_url} className="w-full h-7" />
                        </div>
                      ) : msg.content}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 px-1">
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </span>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-slate-100 bg-white shrink-0">
              {isRecording ? (
                <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-2xl px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-500 font-bold text-sm font-mono">
                      {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={cancelRecording} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={stopRecordingAndSend}
                      disabled={isSendingMessage}
                      className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:scale-105 transition-all"
                    >
                      {isSendingMessage ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-primary transition-colors shrink-0">
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={e => setChatMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 bg-slate-50 rounded-full px-4 py-2 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/15 border border-slate-100"
                  />
                  {chatMessage ? (
                    <button
                      onClick={handleSendMessage}
                      disabled={isSendingMessage}
                      className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-md shadow-primary/20 disabled:opacity-50 shrink-0"
                    >
                      {isSendingMessage ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </button>
                  ) : (
                    <button
                      onClick={startRecording}
                      className="w-8 h-8 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all shrink-0"
                    >
                      <Mic className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notes panel */}
          <div className="border-t border-slate-100 flex flex-col shrink-0" style={{ height: '260px' }}>
            <div className="px-5 py-3.5 flex items-center gap-2 shrink-0">
              <h3 className="text-sm font-bold text-slate-900">Notas internas</h3>
              {manualNotes.length > 0 && (
                <span className="bg-slate-100 text-slate-500 text-[10px] font-black rounded-full px-2 py-0.5 leading-none">
                  {manualNotes.length}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-5 space-y-3 scrollbar-hide">
              {manualNotes.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">Sin notas aún</p>
              )}
              {manualNotes.map((note: any) => {
                const noteAge = formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: es })
                const name = note.profiles?.full_name || 'Agente'
                const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                const colors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500']
                const colorIdx = initials.charCodeAt(0) % colors.length
                return (
                  <div key={note.id} className="flex gap-2.5 group">
                    <div className={`w-7 h-7 rounded-full ${colors[colorIdx]} text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-[12px] font-bold text-slate-900 truncate">{name}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">· {noteAge}</span>
                      </div>
                      <p className="text-[12px] text-slate-600 leading-relaxed">{note.content}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="px-5 pb-4 pt-3 flex items-center gap-2 shrink-0 border-t border-slate-50">
              <input
                type="text"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                placeholder="Añadir nota..."
                className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={handleAddNote}
                disabled={isAddingNote || !newNote.trim()}
                className="px-3.5 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-dim transition-all disabled:opacity-50"
              >
                {isAddingNote ? '...' : 'Añadir'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile: bottom tab bar ───────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-100 flex items-center justify-around px-1 pt-2 pb-4">
        {([
          { id: 'info', label: 'Info', icon: User },
          { id: 'cotizacion', label: 'Cotiza', icon: Zap },
          { id: 'voucher', label: 'Voucher', icon: FileText },
          { id: 'tareas', label: 'Tareas', icon: CheckCircle2 },
          { id: 'chat', label: 'Chat', icon: MessageSquare },
        ] as { id: TabId; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all ${isActive ? 'text-primary' : 'text-slate-400'}`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
              <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
