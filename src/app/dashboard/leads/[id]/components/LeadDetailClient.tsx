'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  MessageSquare,
  Send,
  Users,
  MapPin,
  User,
  Car,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Zap,
  Edit2,
  X,
  Trash2,
  Calculator,
  Mic,
  Volume2,
  Hash,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { calcTotal } from '@/lib/leads/calculations'
import { updateLead, deleteLead } from '@/app/utils/actions/leads'
import { addLeadNote, deleteLeadNote } from '@/app/utils/actions/lead-notes'
import { generateQuoteForLead } from '@/app/utils/actions/quotes'
import { generateVoucherForLead, updateProviderConfirmation } from '@/app/utils/actions/vouchers'
import { sendManualWhatsApp, sendManualWhatsAppMedia } from '@/app/utils/actions/whatsapp'
import { uploadChatMedia } from '@/app/utils/actions/storage'
import { fetchMoreMessages } from '@/app/utils/actions/messages'
import CallLogPanel from './CallLogPanel'
import { ActivityTimeline } from './sections/ActivityTimeline'
import { NotesPanel } from './sections/NotesPanel'
import { PipelineStatusBar } from './sections/PipelineStatusBar'

type TabId = 'info' | 'pipeline' | 'chat' | 'notas'

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'info',     label: 'Info',     icon: User         },
  { id: 'pipeline', label: 'Pipeline', icon: Zap          },
  { id: 'chat',     label: 'Chat',     icon: MessageSquare },
  { id: 'notas',    label: 'Notas',    icon: FileText     },
]

export default function LeadDetailClient({
  lead,
  activeQuote,
  activeVoucher,
  categories,
  providers,
  agents,
  locations,
  providerOffices: _providerOffices,
  messages: initialMessages,
  totalMessages,
  leadNotes,
  notesError,
  currentUser
}: {
  lead: any,
  activeQuote?: any,
  activeVoucher?: any,
  categories: any[],
  providers: any[],
  agents: any[],
  locations: any[],
  providerOffices: any[],
  messages: any[],
  totalMessages: number,
  leadNotes: any[],
  notesError?: any,
  currentUser?: any
}) {
  const router = useRouter()

  // ─── UI State ──────────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('info')
  const [showNegotiationCalc, setShowNegotiationCalc] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [chatMessage, setChatMessage] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [messages, setMessages] = useState<any[]>(initialMessages)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const hasMoreMessages = messages.length < totalMessages
  const [providerConfirmation, setProviderConfirmation] = useState(activeVoucher?.provider_confirmation || '')
  const [isUpdatingConfirmation, setIsUpdatingConfirmation] = useState(false)
  const [ctaProviderId, setCtaProviderId] = useState(lead.provider_id || '')
  const [ctaProviderConfirmation, setCtaProviderConfirmation] = useState('')
  const [ctaError, setCtaError] = useState<string | null>(null)

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
    first_name:          lead.first_name || '',
    last_name:           lead.last_name || '',
    email:               lead.email || '',
    phone:               lead.phone || '',
    pickup_location:     lead.pickup_location || '',
    return_location:     lead.return_location || '',
    pickup_location_id:  lead.pickup_location_id || '',
    return_location_id:  lead.return_location_id || '',
    pickup_date:         lead.pickup_date ? lead.pickup_date.slice(0, 16) : '',
    return_date:         lead.return_date ? lead.return_date.slice(0, 16) : '',
    category_id:         lead.category_id || '',
    provider_id:         lead.provider_id || '',
    assigned_to:         lead.assigned_to || '',
    total_amount:        lead.total_amount || 0,
    status:              lead.status || 'lead_nuevo',
    deposit_paid:        lead.deposit_paid || false,
    notes:               lead.notes || '',
    agreed_daily_price:  lead.agreed_daily_price || null,
    rate_plan:           lead.rate_plan || 'base'
  }

  const [formData, setFormData] = useState(initialFormData)
  const selectedCategory = categories.find(c => c.id === formData.category_id)

  // ─── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedCategory && formData.pickup_date && formData.return_date) {
      const pickup  = new Date(formData.pickup_date)
      const dropoff = new Date(formData.return_date)
      if (pickup < dropoff) {
        const diffInDays = Math.ceil((dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24))
        if (formData.total_amount === 0) {
          const defaultTotal = (parseFloat(selectedCategory.base_daily_cost) || 0) + (parseFloat(selectedCategory.daily_price) || 0)
          setFormData(prev => ({ ...prev, total_amount: defaultTotal * diffInDays }))
        } else if (rentalDays !== null && diffInDays !== rentalDays) {
          const dailyRate = formData.total_amount / rentalDays
          const newTotal  = Number((diffInDays * dailyRate).toFixed(2))
          if (newTotal !== formData.total_amount) setFormData(prev => ({ ...prev, total_amount: newTotal }))
        }
        setRentalDays(diffInDays)
      }
    }
  }, [formData.pickup_date, formData.return_date, selectedCategory?.id])

  // ─── Audio Recording ───────────────────────────────────────────────────────
  const [isRecording, setIsRecording]     = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks]     = useState<Blob[]>([])
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
    startTransition(async () => {
      try {
        await generateQuoteForLead(lead.id, formData.total_amount)
        setFormData(prev => ({ ...prev, status: 'en_cotizacion' }))
        router.refresh()
      } catch (err) {
        alert('Error al regenerar cotización')
      }
    })
  }

  const handleRegenerateVoucher = async () => {
    if (!confirm('¿Estás seguro de que deseas anular el voucher anterior y generar uno nuevo?')) return
    startTransition(async () => {
      try {
        await generateVoucherForLead(lead.id, formData.provider_id || ctaProviderId, providerConfirmation || ctaProviderConfirmation)
        router.refresh()
      } catch (err) {
        alert('Error al regenerar voucher')
      }
    })
  }

  const startRecording = async () => {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true })
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
        const buffer      = Array.from(new Uint8Array(arrayBuffer))
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
    const text       = chatMessage
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
    if (!isEditing) {
      try {
        await updateLead(lead.id, { status: newStatus })
        router.refresh()
      } catch (err: any) {
        setFormData(prev => ({ ...prev, status: lead.status }))
        alert('Error al actualizar el estado: ' + (err.message || 'Error desconocido'))
      }
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim() || isAddingNote) return
    setIsAddingNote(true)
    try {
      await addLeadNote(lead.id, newNote.trim())
      setNewNote('')
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
    setIsEditing(false)
    const updates = {
      ...formData,
      category_id:        formData.category_id || null,
      provider_id:        formData.provider_id || null,
      assigned_to:        formData.assigned_to || null,
      pickup_location_id: formData.pickup_location_id || null,
      return_location_id: formData.return_location_id || null,
      total_amount:       parseFloat(formData.total_amount as any) || 0,
      pickup_date:        formData.pickup_date || null,
      return_date:        formData.return_date || null,
      deposit_paid:       !!formData.deposit_paid,
      notes:              formData.notes || '',
      agreed_daily_price: formData.agreed_daily_price !== null ? parseFloat(formData.agreed_daily_price as any) : null,
    }
    try {
      await updateLead(lead.id, updates)
      router.refresh()
    } catch (error: any) {
      setIsEditing(true)
      alert(`Error al guardar: ${error.message || 'Error desconocido'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRatePlanChange = (newPlan: string) => {
    if (!isEditing) return
    const days = rentalDays || 1
    if (formData.agreed_daily_price === null && selectedCategory) {
      setFormData(prev => ({ ...prev, rate_plan: newPlan, total_amount: calcTotal(selectedCategory, days, newPlan) }))
    } else {
      setFormData(prev => ({ ...prev, rate_plan: newPlan }))
    }
  }

  const handleDeleteLead = async () => {
    if (!confirm('¿Archivar este lead? Quedará oculto del pipeline pero no se perderán sus datos.')) return
    try {
      await deleteLead(lead.id)
      router.push('/dashboard/leads')
    } catch (error: any) {
      alert(`Error al archivar: ${error.message || 'Unknown error'}`)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setFormData(initialFormData)
  }

  // ─── Computed ──────────────────────────────────────────────────────────────
  const selectedProvider  = providers.find(p => p.id === formData.provider_id)
  const selectedAgent     = agents.find(a => a.id === formData.assigned_to)
  const daysForCalc       = rentalDays || 1
  const categoryBaseCost      = parseFloat(selectedCategory?.base_daily_cost || 0)
  const categoryDefaultMargin = parseFloat(selectedCategory?.daily_price || 0)
  const currentMargin     = formData.agreed_daily_price !== null ? parseFloat(formData.agreed_daily_price as any) : categoryDefaultMargin
  const currentTotalDaily = formData.total_amount > 0 ? (formData.total_amount / daysForCalc) : (categoryBaseCost + categoryDefaultMargin)
  const currentVehicleCost = currentTotalDaily - currentMargin

  interface TimelineEvent { id: string; title: string; date: string | any; icon: any; color: string; desc: string; isMismatch?: boolean }
  const timelineEvents: TimelineEvent[] = [
    { id: 'created', title: 'Lead Capturado', date: lead.created_at || new Date().toISOString(), icon: User, color: 'bg-primary text-white', desc: 'Registro inicial creado en el CRM' }
  ]
  if (activeQuote) {
    timelineEvents.push({ id: 'quote', title: 'Cotización Generada', date: activeQuote.created_at, icon: Zap, color: 'bg-amber-100 text-amber-600', desc: activeQuote.expires_at ? `Oferta válida hasta ${format(new Date(activeQuote.expires_at), 'dd MMM')}` : 'Cotización enviada al cliente' })
    const hasMismatch = parseFloat(activeQuote.total_amount || 0) !== lead.total_amount ||
      (activeQuote.pickup_date && lead.pickup_date && new Date(activeQuote.pickup_date).getTime() !== new Date(lead.pickup_date).getTime())
    if (hasMismatch && lead.status === 'en_cotizacion') {
      timelineEvents.push({ id: 'quote-mismatch', title: 'Cotización Desactualizada', date: lead.updated_at || new Date().toISOString(), icon: AlertCircle, color: 'bg-red-500 text-white shadow-lg shadow-red-200', desc: '¡Atención! Has editado el lead después de generar la cotización. El precio o las fechas ya no coinciden.', isMismatch: true })
    }
  }
  if (activeVoucher) {
    timelineEvents.push({ id: 'voucher', title: 'Voucher Enviado', date: activeVoucher.created_at, icon: FileText, color: 'bg-indigo-600 text-white shadow-lg shadow-indigo-200', desc: `Voucher oficial generado (${activeVoucher.confirmation_number}) y enviado al cliente.` })
  }
  if (lead.deposit_paid) {
    timelineEvents.push({ id: 'payment', title: 'Depósito Recibido', date: lead.updated_at, icon: DollarSign, color: 'bg-emerald-600 text-white shadow-lg shadow-emerald-200', desc: `Pago confirmado via Stripe (Ref: ${lead.stripe_payment_id || 'Confirmación Manual'})` })
  }
  timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // ─────────────────────────────────────────────────────────────────────────
  // JSX Sections (referenced in both mobile-tab and desktop layouts)
  // ─────────────────────────────────────────────────────────────────────────

  const customerSection = (
    <div className="bg-slate-50/50 rounded-[2rem] border-2 border-white p-6 md:p-8 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-primary/5 rounded-full blur-[60px] -mr-20 -mt-20" />
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        {/* Left: avatar + name + contact */}
        <div className="flex items-center gap-5 flex-1 min-w-0">
          <div className="w-14 h-14 lg:w-16 lg:h-16 bg-primary rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-lg shadow-primary/20 shrink-0">
            {formData.first_name[0] || '?'}{formData.last_name[0] || ''}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">#{lead.id.slice(0, 8).toUpperCase()}</span>
              {formData.deposit_paid
                ? <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md font-black text-[8px] uppercase tracking-widest flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5"/> Abonado</span>
                : <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md font-black text-[8px] uppercase tracking-widest flex items-center gap-1"><AlertCircle className="w-2.5 h-2.5"/> Pendiente</span>
              }
            </div>
            {isEditing ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})}
                  className="text-2xl font-sans font-black text-slate-900 bg-white border-b-2 border-primary/20 focus:border-primary outline-none px-1 w-full" />
                <input type="text" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})}
                  className="text-2xl font-sans font-black text-slate-900 bg-white border-b-2 border-primary/20 focus:border-primary outline-none px-1 w-full" />
              </div>
            ) : (
              <h1 className="text-2xl lg:text-3xl font-sans font-black text-slate-900 leading-none tracking-tight uppercase truncate">
                {formData.first_name} <span className="text-primary">{formData.last_name}</span>
              </h1>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {isEditing ? (
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="Email" className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg outline-none flex-1 text-xs font-bold" />
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="Teléfono" className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg outline-none flex-1 text-xs font-bold" />
                </div>
              ) : (
                <>
                  <span className="text-xs font-bold text-slate-400 truncate max-w-[180px]">{formData.email || '—'}</span>
                  <span className="text-xs font-bold text-slate-400">{formData.phone || '—'}</span>
                  {formData.phone && (
                    <button onClick={() => { const el = document.getElementById('whatsapp-module'); el?.scrollIntoView({ behavior: 'smooth' }); setActiveTab('chat') }}
                      className="flex items-center gap-1.5 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white px-3 py-1 rounded-full transition-colors text-[9px] font-black uppercase tracking-widest">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                      WhatsApp
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: total + deposit */}
        <div className="bg-white rounded-2xl p-5 shadow-md shadow-primary/5 border border-slate-100 flex flex-col items-center text-center w-full sm:w-auto min-w-[160px] shrink-0">
          <span className="text-[9px] font-black text-primary/40 uppercase tracking-[0.35em] mb-1">Total Renta</span>
          {isEditing ? (
            <div className="flex items-center gap-1">
              <span className="text-lg font-black text-primary/50">$</span>
              <input type="number" value={formData.total_amount}
                onChange={e => setFormData({...formData, total_amount: parseFloat(e.target.value)})}
                className="text-2xl font-sans font-black text-primary-dim bg-slate-50 rounded-xl px-2 py-1 w-28 outline-none text-center appearance-none" />
            </div>
          ) : (
            <div className="text-3xl font-sans font-black text-primary-dim tracking-tight">${formData.total_amount.toLocaleString()}</div>
          )}
          {selectedCategory && rentalDays && (
            <div className="flex items-center gap-2 mt-3 w-full">
              <div className="flex-1 text-center border-r border-slate-100 pr-2">
                <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Reserva</div>
                <div className="text-sm font-black text-slate-700">${(currentMargin * rentalDays).toFixed(0)}</div>
              </div>
              <div className="flex-1 text-center pl-2">
                <div className="text-[8px] font-black text-primary/50 uppercase tracking-widest">Counter</div>
                <div className="text-sm font-black text-slate-700">${(currentVehicleCost * rentalDays).toFixed(0)}</div>
              </div>
            </div>
          )}
          {isEditing && (
            <label className="flex items-center gap-2 cursor-pointer mt-3 bg-slate-50 px-3 py-1.5 rounded-lg w-full justify-center">
              <input type="checkbox" checked={!!formData.deposit_paid} onChange={e => setFormData({...formData, deposit_paid: e.target.checked})}
                className="w-3.5 h-3.5 text-primary rounded" />
              <span className="text-slate-700 font-bold uppercase tracking-widest text-[9px]">Marcar Abonado</span>
            </label>
          )}
        </div>
      </div>
    </div>
  )

  const logisticsVehicleSection = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Logistics */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 md:p-8 shadow-[0_15px_40px_rgba(0,0,0,0.02)] space-y-8">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] pl-1">Agenda Logística</h3>
        <div className="relative space-y-10 pl-8 border-l-2 border-slate-50">
          {/* Pickup */}
          <div className="relative">
            <div className="absolute -left-[41px] top-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center ring-8 ring-white">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest">Recogida (Pick-up)</p>
              {isEditing ? (
                <div className="space-y-2">
                  <input type="datetime-local" value={formData.pickup_date}
                    onChange={e => setFormData({...formData, pickup_date: e.target.value})}
                    className="w-full font-bold text-slate-900 bg-slate-50 p-3 rounded-2xl outline-none text-sm" />
                  <select value={formData.pickup_location_id}
                    onChange={e => { const loc = locations.find(l => l.id === e.target.value); setFormData({...formData, pickup_location_id: e.target.value, pickup_location: loc ? loc.name : formData.pickup_location}) }}
                    className="w-full text-sm font-bold text-slate-700 bg-slate-50 p-3 rounded-2xl outline-none cursor-pointer">
                    <option value="">— Sin ubicación —</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}{l.code ? ` (${l.code})` : ''}</option>)}
                  </select>
                </div>
              ) : (
                <>
                  <p className="text-xl font-sans font-black text-slate-900 leading-tight">
                    {lead.pickup_date ? format(new Date(lead.pickup_date.slice(0, 16)), "EEEE, d 'de' MMMM", { locale: es }) : 'Fecha pendiente'}
                  </p>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-primary/40" />
                    <span>{(locations.find(l => l.id === formData.pickup_location_id)?.name) || formData.pickup_location || '—'} · {lead.pickup_date ? format(new Date(lead.pickup_date.slice(0, 16)), 'hh:mm a') : ''}</span>
                  </div>
                </>
              )}
            </div>
          </div>
          {/* Return */}
          <div className="relative">
            <div className="absolute -left-[41px] top-0 w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center ring-8 ring-white">
              <CheckCircle2 className="w-4 h-4 text-slate-300" />
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Devolución (Drop-off)</p>
              {isEditing ? (
                <div className="space-y-2">
                  <input type="datetime-local" value={formData.return_date}
                    onChange={e => setFormData({...formData, return_date: e.target.value})}
                    className="w-full font-bold text-slate-900 bg-slate-50 p-3 rounded-2xl outline-none text-sm" />
                  <select value={formData.return_location_id}
                    onChange={e => { const loc = locations.find(l => l.id === e.target.value); setFormData({...formData, return_location_id: e.target.value, return_location: loc ? loc.name : formData.return_location}) }}
                    className="w-full text-sm font-bold text-slate-700 bg-slate-50 p-3 rounded-2xl outline-none cursor-pointer">
                    <option value="">— Sin ubicación —</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}{l.code ? ` (${l.code})` : ''}</option>)}
                  </select>
                </div>
              ) : (
                <>
                  <p className="text-xl font-sans font-black text-slate-900 leading-tight">
                    {lead.return_date ? format(new Date(lead.return_date.slice(0, 16)), "EEEE, d 'de' MMMM", { locale: es }) : 'Fecha pendiente'}
                  </p>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-slate-300" />
                    <span>{(locations.find(l => l.id === formData.return_location_id)?.name) || formData.return_location || '—'} · {lead.return_date ? format(new Date(lead.return_date.slice(0, 16)), 'hh:mm a') : ''}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle */}
      <div className="relative rounded-[2rem] overflow-hidden flex flex-col group" style={{background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'}}>
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-primary rounded-full blur-[70px] opacity-25 group-hover:opacity-40 transition-opacity duration-700" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-oceanic rounded-full blur-[50px] opacity-20" />
        <div className="relative z-10 p-6 md:p-8 flex flex-col flex-1">
          <div className="flex items-center justify-between mb-5">
            <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em]">Vehículo</span>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/7 border border-white/10">
              <Car className="w-3 h-3 text-primary/70" />
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Fleet</span>
            </div>
          </div>

          {isEditing ? (
            <select value={formData.category_id}
              onChange={e => setFormData({...formData, category_id: e.target.value, agreed_daily_price: null})}
              className="w-full text-xl font-sans font-black text-white bg-white/10 border border-white/10 rounded-2xl p-4 outline-none appearance-none cursor-pointer mb-4">
              <option value="" disabled className="text-slate-900">Seleccionar Vehículo</option>
              {categories.map(cat => <option key={cat.id} value={cat.id} className="text-slate-900">{cat.name}</option>)}
            </select>
          ) : (
            <h2 className="text-2xl lg:text-3xl font-sans font-black leading-none uppercase tracking-tight text-white mb-4">
              {selectedCategory?.name || 'Sin Asignar'}
            </h2>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="rounded-xl p-3 text-center bg-white/6 border border-white/8">
              <div className="text-base font-black text-white">{rentalDays ?? '—'}</div>
              <div className="text-[8px] font-black text-white/30 uppercase tracking-widest mt-0.5">Días</div>
            </div>
            <div className="rounded-xl p-3 text-center bg-white/6 border border-white/8">
              <div className="text-base font-black text-white">${Number(((formData.total_amount / (rentalDays || 1)) || 0).toFixed(0))}</div>
              <div className="text-[8px] font-black text-white/30 uppercase tracking-widest mt-0.5">/día</div>
            </div>
            <div className="rounded-xl p-3 text-center bg-primary/20 border border-primary/30">
              <div className="text-base font-black text-primary">${formData.total_amount.toLocaleString()}</div>
              <div className="text-[8px] font-black text-primary/50 uppercase tracking-widest mt-0.5">Total</div>
            </div>
          </div>

          {/* Rate plan toggle */}
          <div className="p-1 bg-white/5 rounded-xl flex relative overflow-hidden text-center text-[10px] font-black uppercase tracking-widest mb-3">
            <div className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-lg transition-all duration-300 bg-white shadow-sm ${formData.rate_plan === 'premium' ? 'left-[calc(50%+2px)]' : 'left-1'}`} />
            <button disabled={!isEditing} onClick={() => handleRatePlanChange('base')}
              className={`relative flex-1 py-2.5 transition-colors ${formData.rate_plan === 'base' ? 'text-slate-900' : 'text-white/50 disabled:opacity-40'}`}>
              Base
            </button>
            <button disabled={!isEditing} onClick={() => handleRatePlanChange('premium')}
              className={`relative flex-1 py-2.5 transition-colors flex items-center justify-center gap-1 ${formData.rate_plan === 'premium' ? 'text-indigo-900' : 'text-white/50 disabled:opacity-40'}`}>
              <Zap className={`w-3 h-3 ${formData.rate_plan === 'premium' ? 'text-indigo-600' : ''}`} /> Premium +15%
            </button>
          </div>

          {/* Negotiation calculator — collapsible */}
          {isEditing && selectedCategory?.base_daily_cost && (
            <>
              <button onClick={() => setShowNegotiationCalc(prev => !prev)}
                className="flex items-center gap-2 text-amber-400 hover:text-amber-300 text-[10px] font-black uppercase tracking-widest transition-colors py-1">
                <Calculator className="w-3.5 h-3.5" />
                Ajustar Negociación
                {showNegotiationCalc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showNegotiationCalc && (() => {
                const minMargin = categoryDefaultMargin * 0.5
                return (
                  <div className="mt-3 p-4 rounded-2xl border border-white/10 bg-white/3 space-y-4 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Base Prov: ${selectedCategory.base_daily_cost}/día</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-white/40 uppercase tracking-widest block">Costo Veh.</label>
                        <input type="number" value={Number(currentVehicleCost.toFixed(2))}
                          onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setFormData({...formData, total_amount: (v + currentMargin) * daysForCalc}) }}
                          className="w-full text-sm font-black text-white bg-white/5 border border-white/10 rounded-xl p-2.5 outline-none focus:border-rose-500/50" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-white/40 uppercase tracking-widest block">Ganancia</label>
                        <input type="number" value={Number(currentMargin.toFixed(2))}
                          onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setFormData({...formData, total_amount: (currentVehicleCost + v) * daysForCalc, agreed_daily_price: v}) }}
                          onBlur={e => { const v = parseFloat(e.target.value) || 0; if (v < minMargin) { alert(`Mínimo 50%: $${minMargin.toFixed(2)}/día`); setFormData({...formData, agreed_daily_price: minMargin, total_amount: (currentVehicleCost + minMargin) * daysForCalc}) } }}
                          className={`w-full text-sm font-black p-2.5 rounded-xl border outline-none ${currentMargin < categoryDefaultMargin ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10'}`} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-white/40 uppercase tracking-widest block">Total/día</label>
                        <input type="number" value={Number(currentTotalDaily.toFixed(2))}
                          onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setFormData({...formData, total_amount: v * daysForCalc}) }}
                          className="w-full text-sm font-black text-white bg-primary/20 border border-primary/30 rounded-xl p-2.5 outline-none focus:border-primary" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[9px] text-white/30 font-bold">
                        Counter: <b className="text-white">${(currentVehicleCost * daysForCalc).toFixed(2)}</b> · Reserva: <b className="text-emerald-400">${(currentMargin * daysForCalc).toFixed(2)}</b>
                      </span>
                      {formData.agreed_daily_price !== null && (
                        <button onClick={() => setFormData({...formData, agreed_daily_price: null, total_amount: 0})}
                          className="text-[9px] font-black text-red-400 hover:text-red-300 underline uppercase tracking-widest">Reset</button>
                      )}
                    </div>
                  </div>
                )
              })()}
            </>
          )}

          {/* Description */}
          {selectedCategory?.description && (
            <p className="text-[10px] text-white/30 font-bold leading-relaxed mt-3 line-clamp-2">{selectedCategory.description}</p>
          )}

          {/* Car image */}
          <div className="mt-auto pt-4">
            <div className="rounded-2xl overflow-hidden border border-white/6">
              <img src={selectedCategory?.image_url || 'https://images.unsplash.com/photo-1550355291-bbee04a92027?q=80&w=800&auto=format&fit=crop'}
                className="w-full h-40 object-cover object-center group-hover:scale-105 transition-transform duration-700"
                alt={selectedCategory?.name || 'Car'} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const timelineSection = (
    <ActivityTimeline events={timelineEvents} activeQuote={activeQuote} onRegenerateQuote={handleRegenerateQuote} />
  )

  const voucherCtaSection = (
    <div className="bg-oceanic rounded-[2rem] p-6 md:p-10 relative overflow-hidden group">
      <div className="absolute -bottom-16 -right-16 w-72 h-72 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000" />
      <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 text-white">
        <div className="space-y-2">
          <h3 className="text-xl md:text-2xl font-sans font-black leading-tight uppercase tracking-tight">¿Reserva Confirmada?</h3>
          <p className="text-white/60 font-bold text-xs tracking-wide">Genera el Voucher oficial para el cliente.</p>
        </div>
        <div className="flex flex-col w-full lg:w-auto gap-3 lg:min-w-[380px]">
          {activeVoucher ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 bg-white/5 p-5 rounded-2xl border border-white/10">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2"><Users className="w-3 h-3"/> Partner</label>
                  <select value={formData.provider_id}
                    onChange={async e => { const v = e.target.value; setFormData({...formData, provider_id: v}); await updateLead(lead.id, { provider_id: v }) }}
                    className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none">
                    <option value="" className="text-slate-900">Sin Proveedor</option>
                    {providers.map(p => <option key={p.id} value={p.id} className="text-slate-900">{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2"><Hash className="w-3 h-3"/> N° Confirmación</label>
                  <div className="flex gap-2">
                    <input type="text" value={providerConfirmation} onChange={e => setProviderConfirmation(e.target.value)} placeholder="RC-20240412-001"
                      className="bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white placeholder:text-white/20 outline-none flex-1" />
                    <button onClick={async () => { setIsUpdatingConfirmation(true); try { await updateProviderConfirmation(activeVoucher.id, providerConfirmation, lead.id) } finally { setIsUpdatingConfirmation(false) } }}
                      disabled={isUpdatingConfirmation}
                      className="bg-white text-primary px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 disabled:opacity-50">
                      {isUpdatingConfirmation ? '...' : 'Guardar'}
                    </button>
                  </div>
                </div>
                {activeVoucher.provider_confirmation && (
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"/><span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Confirmado en sistema</span></div>
                )}
              </div>
              <div className="flex gap-3">
                <Link href={`/voucher/${activeVoucher.id}`} target="_blank" className="bg-white/10 text-white border border-white/20 px-5 py-4 rounded-2xl font-black hover:bg-white/20 transition-all text-[10px] uppercase tracking-widest flex-1 text-center">Ver Voucher</Link>
                <button onClick={handleRegenerateVoucher} disabled={isPending}
                  className="bg-white text-primary px-5 py-4 rounded-2xl font-black hover:scale-105 transition-all text-[10px] uppercase tracking-widest shadow-xl shadow-black/20 flex-1 flex items-center justify-center gap-2">
                  {isPending ? '...' : <><Zap className="w-3.5 h-3.5"/> Regenerar</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 bg-white/5 p-5 rounded-2xl border border-white/10">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2"><Users className="w-3 h-3"/> 1. Proveedor</label>
                  <select value={ctaProviderId} onChange={e => { setCtaProviderId(e.target.value); setCtaError(null) }}
                    className={`w-full bg-white/10 border ${ctaError?.includes('proveedor') ? 'border-rose-500/50' : 'border-white/10'} rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none`}>
                    <option value="" className="text-slate-900">Seleccionar Rentadora...</option>
                    {providers.map(p => <option key={p.id} value={p.id} className="text-slate-900">{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2"><Hash className="w-3 h-3"/> 2. N° Confirmación</label>
                  <input type="text" value={ctaProviderConfirmation} onChange={e => { setCtaProviderConfirmation(e.target.value); setCtaError(null) }} placeholder="Código de reserva..."
                    className={`w-full bg-white/10 border ${ctaError?.includes('confirmación') ? 'border-rose-500/50' : 'border-white/10'} rounded-xl px-4 py-2.5 text-sm font-bold text-white placeholder:text-white/20 outline-none`} />
                </div>
                {ctaError && (
                  <div className="bg-rose-500/20 border border-rose-500/30 rounded-xl p-3 flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0"/>
                    <p className="text-[10px] font-black text-rose-200 uppercase tracking-widest leading-tight">{ctaError}</p>
                  </div>
                )}
              </div>
              <button
                onClick={async () => {
                  if (!ctaProviderId) { setCtaError('Debes seleccionar un proveedor.'); return }
                  if (!ctaProviderConfirmation) { setCtaError('El n° de confirmación es obligatorio.'); return }
                  setCtaError(null)
                  startTransition(async () => {
                    try { await generateVoucherForLead(lead.id, ctaProviderId, ctaProviderConfirmation); setFormData(prev => ({...prev, status: 'voucher_enviado'})); router.refresh() }
                    catch { alert('Error al generar voucher') }
                  })
                }}
                disabled={isPending}
                className="bg-white text-primary py-4 rounded-2xl font-black hover:scale-105 transition-all text-xs uppercase tracking-widest shadow-xl shadow-black/20 w-full flex items-center justify-center gap-2 disabled:opacity-50">
                {isPending ? <><div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin"/><span>Generando...</span></> : <><CheckCircle2 className="w-4 h-4"/><span>Generar Voucher Oficial</span></>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const sidebarSection = (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-[0_15px_40px_rgba(0,0,0,0.02)] space-y-8">
      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] pl-1">Gestión Interna</h4>
      <div className="space-y-6">
        {/* Agent */}
        <div className="space-y-2">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] pl-1">Agente Asignado</p>
          {isEditing ? (
            <select value={formData.assigned_to} onChange={e => setFormData({...formData, assigned_to: e.target.value})}
              className="w-full py-3 px-4 rounded-2xl bg-slate-50 outline-none text-sm font-bold text-slate-700">
              <option value="">Sin Agente</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
            </select>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-2xl">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-black text-xs shrink-0 overflow-hidden">
                {selectedAgent?.avatar_url ? <img src={selectedAgent.avatar_url} className="w-full h-full object-cover" alt="" /> : selectedAgent?.full_name?.[0] || 'A'}
              </div>
              <p className="text-sm font-black text-slate-900">{selectedAgent?.full_name || 'Sin Asignar'}</p>
            </div>
          )}
        </div>

        {/* Provider */}
        <div className="space-y-2">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] pl-1">Proveedor (Rentadora)</p>
          {isEditing ? (
            <select value={formData.provider_id} onChange={e => setFormData({...formData, provider_id: e.target.value})}
              className="w-full py-3 px-4 rounded-2xl bg-slate-50 outline-none text-sm font-bold text-slate-700">
              <option value="">Sin Proveedor</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
              <div className="w-9 h-9 rounded-full bg-white shadow border border-slate-100 flex items-center justify-center shrink-0">
                {selectedProvider ? <span className="text-primary font-black text-[9px] uppercase">PRV</span> : <Users className="w-4 h-4 text-slate-300"/>}
              </div>
              <p className="text-sm font-black text-slate-900 uppercase">{selectedProvider?.name || 'Pendiente'}</p>
            </div>
          )}
        </div>

        {/* Quote info */}
        {activeQuote && !isEditing && (
          <div className="flex flex-col gap-1.5 text-[10px] bg-slate-50 p-4 rounded-2xl">
            <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg shadow-sm border border-slate-100">
              <span className="text-slate-400 font-bold uppercase tracking-widest">Pago ID:</span>
              <span className="text-primary font-black truncate max-w-[90px]">{lead.stripe_payment_id || '---'}</span>
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="text-slate-400 font-bold uppercase tracking-widest">Oferta Válida:</span>
              <span className="text-slate-700 font-black">{activeQuote.expires_at ? format(new Date(activeQuote.expires_at), 'dd MMM', { locale: es }) : '---'}</span>
            </div>
          </div>
        )}

        <NotesPanel
          notes={leadNotes}
          notesError={notesError}
          newNote={newNote}
          isAdding={isAddingNote}
          activeVoucher={activeVoucher}
          onChange={setNewNote}
          onAdd={handleAddNote}
          onDelete={handleDeleteNote}
        />
      </div>
    </div>
  )

  const chatSection = (
    <>
      <div id="whatsapp-module" className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-[0_15px_40px_rgba(0,0,0,0.02)] flex flex-col h-[600px] scroll-mt-32">
        <div className="flex items-center justify-between mb-5 px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-4 h-4"/>
            </div>
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">WhatsApp</h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"/>
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Live</span>
          </div>
        </div>

        <div className="flex-1 space-y-5 mb-5 overflow-y-auto pr-2 scrollbar-hide py-1">
          {hasMoreMessages && (
            <div className="flex justify-center">
              <button onClick={handleLoadMoreMessages} disabled={isLoadingMore}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary px-4 py-2 rounded-full bg-slate-50 hover:bg-slate-100 disabled:opacity-50 transition-colors">
                {isLoadingMore ? 'Cargando...' : `Ver anteriores (${totalMessages - messages.length} más)`}
              </button>
            </div>
          )}
          {messages?.length > 0 ? messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.direction === 'outbound' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
              <div className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm font-bold leading-relaxed mb-1 ${msg.direction === 'outbound' ? 'bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10' : 'bg-slate-50 text-slate-700 rounded-tl-none border border-slate-100'}`}>
                {msg.media_type?.startsWith('audio/') ? (
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${msg.direction === 'outbound' ? 'bg-white/20' : 'bg-primary/10'}`}>
                        <Volume2 className={`w-3.5 h-3.5 ${msg.direction === 'outbound' ? 'text-white' : 'text-primary'}`}/>
                      </div>
                      <span className="text-[10px] uppercase tracking-widest opacity-60">Mensaje de Voz</span>
                    </div>
                    <div className={`rounded-xl p-1.5 ${msg.direction === 'outbound' ? 'bg-white/10' : 'bg-white/50'}`}>
                      <audio controls src={msg.media_url} className="w-full h-8"/>
                    </div>
                  </div>
                ) : msg.content}
              </div>
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest px-1">
                {format(new Date(msg.created_at), 'HH:mm', { locale: es })}
              </span>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-30">
              <MessageSquare size={48} className="mb-3 text-slate-200"/>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sin mensajes</p>
            </div>
          )}
        </div>

        <div className="mt-auto flex items-center gap-2 px-1">
          {isRecording ? (
            <div className="flex-1 flex items-center justify-between bg-rose-50 border-2 border-rose-100 rounded-[1.5rem] px-5 py-3 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse"/>
                <span className="text-sm font-black text-rose-600 font-mono">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={cancelRecording} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                <button onClick={stopRecordingAndSend} disabled={isSendingMessage}
                  className="w-9 h-9 bg-rose-500 text-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg shadow-rose-200">
                  {isSendingMessage ? <Clock className="w-3.5 h-3.5 animate-spin"/> : <Send className="w-3.5 h-3.5"/>}
                </button>
              </div>
            </div>
          ) : (
            <div className="relative flex-1">
              <input type="text" value={chatMessage}
                onChange={e => setChatMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="Mensaje de WhatsApp..."
                className="w-full bg-slate-50 rounded-[1.5rem] pl-5 pr-12 py-4 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all" />
              {chatMessage ? (
                <button onClick={handleSendMessage} disabled={isSendingMessage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:bg-slate-300">
                  {isSendingMessage ? <Clock className="w-3.5 h-3.5 animate-spin"/> : <Send className="w-3.5 h-3.5"/>}
                </button>
              ) : (
                <button onClick={startRecording}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                  <Mic className="w-3.5 h-3.5"/>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <CallLogPanel leadId={lead.id} leadPhone={formData.phone || ''} agentId={currentUser?.id || ''} agentSip={currentUser?.zadarma_sip || null} />
    </>
  )

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8">

      {/* ── Sticky Top Nav ── */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100 px-4 md:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard" className="flex items-center gap-2 group shrink-0">
            <div className="w-7 h-7 bg-oceanic rounded-lg shadow flex items-center justify-center group-hover:rotate-12 transition-all">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white/50"/>
            </div>
            <span className="hidden sm:block font-sans font-black text-[10px] uppercase tracking-[0.2em] text-slate-800">Go Easy CRM</span>
          </Link>
          <Link href="/dashboard/leads" className="flex items-center gap-1.5 text-slate-400 hover:text-primary transition-all font-black text-[10px] uppercase tracking-widest group">
            <div className="p-1.5 rounded-full bg-slate-100 group-hover:bg-primary/10 transition-colors">
              <ArrowLeft className="w-3 h-3"/>
            </div>
            <span className="hidden sm:inline">Pipeline</span>
          </Link>
          <span className="hidden md:block text-sm font-black text-slate-900 truncate max-w-[200px]">
            {formData.first_name} {formData.last_name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quote shortcut */}
          {!isEditing && activeQuote && (
            <Link href={`/cotizacion/${activeQuote.id}`} target="_blank"
              className="hidden sm:flex px-4 py-2 text-slate-500 hover:text-primary font-black text-[10px] uppercase tracking-widest transition-colors">
              Propuesta
            </Link>
          )}
          {/* Generate quote */}
          {!isEditing && (
            <button id="generate-quote-btn" disabled={isPending} onClick={handleRegenerateQuote}
              className="hidden sm:flex items-center gap-2 bg-oceanic hover:bg-primary-dim text-white font-black px-4 py-2 rounded-full shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-[10px] uppercase tracking-widest disabled:opacity-50">
              <Zap className="w-3.5 h-3.5"/>
              <span>{isPending ? 'Generando...' : 'Cotización'}</span>
            </button>
          )}
          {/* Edit / Save */}
          <button onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${isEditing ? 'bg-primary text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-white hover:text-primary'}`}>
            {isEditing ? <CheckCircle2 className="w-3.5 h-3.5"/> : <Edit2 className="w-3.5 h-3.5"/>}
            <span className="hidden sm:inline">{isEditing ? 'Guardar' : 'Editar'}</span>
          </button>
          {isEditing && (
            <button onClick={handleCancelEdit} className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-full transition-all">
              <X className="w-4 h-4"/>
            </button>
          )}
          {/* Agent avatar */}
          <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
            <img src={selectedAgent?.avatar_url || `https://ui-avatars.com/api/?name=${selectedAgent?.full_name || 'A'}&background=4052b6&color=fff`} className="w-full h-full object-cover" alt=""/>
          </div>
          {!isEditing && (
            <button onClick={handleDeleteLead} className="p-2 text-slate-400 hover:text-white hover:bg-red-500 rounded-full transition-all" title="Archivar">
              <Trash2 className="w-3.5 h-3.5"/>
            </button>
          )}
        </div>
      </div>

      {/* ── Edit Mode Banner ── */}
      {isEditing && (
        <div className="bg-amber-100/80 border-b border-amber-200 text-amber-800 px-6 py-2 flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
          <AlertCircle className="w-3.5 h-3.5"/>
          <span className="font-bold text-[10px] uppercase tracking-wider">Modo edición — Guarda los cambios al terminar</span>
        </div>
      )}

      {/* ── Pipeline Status Bar ── */}
      <PipelineStatusBar currentStatus={formData.status} onStatusChange={handleStatusChange} />

      {/* ── Mobile Quick Stats Strip ── */}
      <div className="md:hidden flex items-center gap-2 px-4 py-3 bg-slate-50/80 border-b border-slate-100 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1.5 shrink-0 bg-white rounded-full px-3 py-1.5 border border-slate-100 shadow-sm">
          <Clock className="w-3 h-3 text-primary/60"/>
          <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">{rentalDays ?? '—'} días</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 bg-white rounded-full px-3 py-1.5 border border-slate-100 shadow-sm">
          <DollarSign className="w-3 h-3 text-emerald-500"/>
          <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">${formData.total_amount.toLocaleString()}</span>
        </div>
        {selectedCategory && (
          <div className="flex items-center gap-1.5 shrink-0 bg-white rounded-full px-3 py-1.5 border border-slate-100 shadow-sm">
            <Car className="w-3 h-3 text-primary/60"/>
            <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">{selectedCategory.name}</span>
          </div>
        )}
        {formData.deposit_paid
          ? <div className="flex items-center gap-1.5 shrink-0 bg-emerald-50 rounded-full px-3 py-1.5 border border-emerald-100"><CheckCircle2 className="w-3 h-3 text-emerald-500"/><span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Abonado</span></div>
          : <div className="flex items-center gap-1.5 shrink-0 bg-amber-50 rounded-full px-3 py-1.5 border border-amber-100"><AlertCircle className="w-3 h-3 text-amber-500"/><span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Pendiente</span></div>
        }
      </div>

      {/* ── Content ── */}
      <div className="pb-24 md:pb-8">

        {/* Mobile: tab-based single-column layout */}
        <div className="md:hidden p-4 space-y-5">
          {activeTab === 'info' && (
            <div className="space-y-5">
              {customerSection}
              {logisticsVehicleSection}
            </div>
          )}
          {activeTab === 'pipeline' && (
            <div className="space-y-5">
              {timelineSection}
              {voucherCtaSection}
            </div>
          )}
          {activeTab === 'chat' && (
            <div className="space-y-5">{chatSection}</div>
          )}
          {activeTab === 'notas' && (
            <div className="space-y-5">{sidebarSection}</div>
          )}
        </div>

        {/* Desktop: 2-column grid (always visible at md+) */}
        <div
          className="hidden md:grid max-w-[1600px] mx-auto p-6 lg:p-10 xl:p-12"
          style={{ gridTemplateColumns: '1fr 360px', gap: '2rem', alignItems: 'start' }}
        >
          <div className="space-y-8 lg:space-y-10">
            {customerSection}
            {logisticsVehicleSection}
            {timelineSection}
            {voucherCtaSection}
          </div>
          <div className="space-y-6 lg:space-y-8">
            {sidebarSection}
            {chatSection}
          </div>
        </div>
      </div>

      {/* ── Floating Save Button (mobile only, when editing) ── */}
      {isEditing && (
        <div className="fixed bottom-20 inset-x-4 z-50 md:hidden animate-in slide-in-from-bottom-4">
          <button onClick={handleSave} disabled={isSaving}
            className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/30 flex items-center justify-center gap-2 disabled:opacity-70">
            <CheckCircle2 className="w-4 h-4"/>
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      )}

      {/* ── Mobile Tab Bar ── */}
      <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 backdrop-blur-xl border-t border-slate-100 flex items-center justify-around px-1 pt-2 pb-4">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id
          return (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-2xl transition-all ${isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}>
              <Icon className={`w-5 h-5 transition-all ${isActive ? 'stroke-[2.5]' : 'stroke-[1.5]'}`}/>
              <span className={`text-[9px] font-black uppercase tracking-widest transition-all ${isActive ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
              {isActive && <div className="w-1 h-1 bg-primary rounded-full mt-0.5"/>}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
