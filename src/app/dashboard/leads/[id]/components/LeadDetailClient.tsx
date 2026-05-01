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
  FileText
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

export default function LeadDetailClient({
  lead,
  activeQuote,
  activeVoucher,
  categories,
  providers,
  agents,
  locations,
  providerOffices,
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
  const [isEditing, setIsEditing] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [rentalDays, setRentalDays] = useState<number | null>(() => {
    if (lead.pickup_date && lead.return_date) {
      const p = new Date(lead.pickup_date)
      const r = new Date(lead.return_date)
      if (r > p) return Math.ceil((r.getTime() - p.getTime()) / (1000 * 60 * 60 * 24))
    }
    return null
  })
  const [formData, setFormData] = useState({
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
  })

  const selectedCategory = categories.find(c => c.id === formData.category_id)

  // 2. Cálculo automático del precio total basado en negociación o categoría
  useEffect(() => {
    if (selectedCategory && formData.pickup_date && formData.return_date) {
        const pickup = new Date(formData.pickup_date)
        const dropoff = new Date(formData.return_date)
        if (pickup < dropoff) {
          const diffInMs = dropoff.getTime() - pickup.getTime()
          const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24))
          
          // 1. Initial Load (rentalDays is null): Just establish the day count without touching total_amount
          // 2. New Lead (total_amount is 0): Initialize total from category defaults
          if (formData.total_amount === 0) {
             const defaultTotal = (parseFloat(selectedCategory.base_daily_cost) || 0) + (parseFloat(selectedCategory.daily_price) || 0);
             setFormData(prev => ({ ...prev, total_amount: defaultTotal * diffInDays }))
          } else if (rentalDays !== null && diffInDays !== rentalDays) {
             // 3. Date Change: Scale the existing negotiated total according to the new duration
             const dailyRate = formData.total_amount / rentalDays;
             const newTotal = Number((diffInDays * dailyRate).toFixed(2));
             
             if (newTotal !== formData.total_amount) {
               setFormData(prev => ({ ...prev, total_amount: newTotal }))
             }
          }
          
          setRentalDays(diffInDays)
        }
    }
  }, [formData.pickup_date, formData.return_date, selectedCategory?.id])

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

  const handleRegenerateQuote = async () => {
    startTransition(async () => {
      try {
        await generateQuoteForLead(lead.id, formData.total_amount)
        setFormData(prev => ({ ...prev, status: 'en_cotizacion' }))
        router.refresh()
      } catch (err) {
        console.error(err)
        alert('Error al regenerar cotización')
      }
    })
  }

  const handleRegenerateVoucher = async () => {
    if (!confirm('¿Estás seguro de que deseas anular el voucher anterior y generar uno nuevo? Se le enviará un nuevo enlace al cliente.')) return;
    
    startTransition(async () => {
      try {
        await generateVoucherForLead(lead.id, formData.provider_id || ctaProviderId, providerConfirmation || ctaProviderConfirmation);
        router.refresh()
      } catch (err) {
        console.error(err)
        alert('Error al regenerar voucher')
      }
    })
  }


  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const recordingInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isRecording) {
      recordingInterval.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } else {
      if (recordingInterval.current) clearInterval(recordingInterval.current)
      setRecordingTime(0)
    }
    return () => {
      if (recordingInterval.current) clearInterval(recordingInterval.current)
    }
  }, [isRecording])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      setMediaRecorder(recorder)
      setAudioChunks([])
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) setAudioChunks(prev => [...prev, e.data])
      }
      
      recorder.onstop = async () => {
        // Handle stop logic in handleStopRecording to get final blob
      }
      
      recorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Error starting recording:', err)
      alert('No se pudo acceder al micrófono.')
    }
  }

  const stopRecordingAndSend = async () => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return
    
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/ogg; codecs=opus' })
      if (audioBlob.size < 1000) {
        setIsRecording(false)
        return // Too short
      }
      
      setIsSendingMessage(true)
      try {
        // 1. Convert blob to array buffer for server action
        const arrayBuffer = await audioBlob.arrayBuffer()
        const buffer = Array.from(new Uint8Array(arrayBuffer))
        
        // 2. Upload to storage
        const { publicUrl, error } = await uploadChatMedia({
          name: `audio-${Date.now()}.ogg`,
          type: 'audio/ogg',
          buffer
        })
        
        if (error) throw new Error(error)
        
        // 3. Send via WhatsApp
        if (publicUrl) {
          await sendManualWhatsAppMedia(formData.phone || '', publicUrl, 'audio/ogg', lead.id)
          router.refresh()
        }
      } catch (err: any) {
        console.error('Error uploading/sending audio:', err)
        alert('Error al enviar el audio: ' + err.message)
      } finally {
        setIsSendingMessage(false)
        setIsRecording(false)
      }
    }
    
    mediaRecorder.stop()
    mediaRecorder.stream.getTracks().forEach(track => track.stop())
  }

  const cancelRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop()
      mediaRecorder.stream.getTracks().forEach(track => track.stop())
    }
    setIsRecording(false)
    setAudioChunks([])
  }

  const handleLoadMoreMessages = async () => {
    setIsLoadingMore(true)
    try {
      const older = await fetchMoreMessages(lead.id, messages.length)
      setMessages(prev => [...older, ...prev])
    } catch {
      // silent fail — user can retry
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
    if (isEditing) {
       setFormData(prev => ({...prev, status: newStatus}));
    } else {
       setFormData(prev => ({...prev, status: newStatus}));
       try {
          await updateLead(lead.id, { status: newStatus });
          router.refresh();
       } catch (err: any) {
          console.error(err);
          setFormData(prev => ({...prev, status: lead.status})); // revert on error
          alert('Error al actualizar el estado: ' + (err.message || 'Error desconocido'));
       }
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim() || isAddingNote) return
    setIsAddingNote(true)
    try {
      await addLeadNote(lead.id, newNote.trim())
      setNewNote('')
    } catch (e) {
      console.error(e)
    } finally {
      setIsAddingNote(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta nota?')) return
    try {
      await deleteLeadNote(noteId, lead.id)
    } catch (e) {
      console.error(e)
    }
  }

  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)
    setIsEditing(false)
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
      status: formData.status,
      deposit_paid: !!formData.deposit_paid,
      notes: formData.notes || '',
      agreed_daily_price: formData.agreed_daily_price !== null ? parseFloat(formData.agreed_daily_price as any) : null,
      rate_plan: formData.rate_plan
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
      const newTotal = calcTotal(selectedCategory, days, newPlan)
      setFormData(prev => ({ ...prev, rate_plan: newPlan, total_amount: newTotal }))
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
      alert(`Error al archivar el lead: ${error.message || 'Unknown error'}`)
    }
  }

  const selectedProvider = providers.find(p => p.id === formData.provider_id)
  const selectedAgent = agents.find(a => a.id === formData.assigned_to)

  interface TimelineEvent {
    id: string;
    title: string;
    date: string | any;
    icon: any;
    color: string;
    desc: string;
    isMismatch?: boolean;
  }

  const timelineEvents: TimelineEvent[] = [
     {
        id: 'created',
        title: 'Lead Capturado',
        date: lead.created_at || new Date().toISOString(),
        icon: User,
        color: 'bg-primary text-white',
        desc: 'Registro inicial creado en el CRM'
     }
  ];
  if (activeQuote) {
     timelineEvents.push({
        id: 'quote',
        title: 'Cotización Generada',
        date: activeQuote.created_at,
        icon: Zap,
        color: 'bg-amber-100 text-amber-600',
        desc: activeQuote.expires_at ? `Oferta válida hasta ${format(new Date(activeQuote.expires_at), 'dd MMM')}` : 'Cotización enviada al cliente'
     });

     // Check for mismatch between lead data and quote snapshot
     const quoteAmount = parseFloat(activeQuote.total_amount || 0);
     const currentAmount = lead.total_amount;
     
     const hasMismatch = quoteAmount !== currentAmount || 
                        (activeQuote.pickup_date && lead.pickup_date && new Date(activeQuote.pickup_date).getTime() !== new Date(lead.pickup_date).getTime());

     if (hasMismatch && lead.status === 'en_cotizacion') {
        timelineEvents.push({
           id: 'quote-mismatch',
           title: 'Cotización Desactualizada',
           date: lead.updated_at || new Date().toISOString(),
           icon: AlertCircle,
           color: 'bg-red-500 text-white shadow-lg shadow-red-200',
           desc: '¡Atención! Has editado el lead después de generar la cotización. El precio o las fechas ya no coinciden con lo enviado al cliente.',
           isMismatch: true
        });
     }
  }
  if (activeVoucher) {
     timelineEvents.push({
        id: 'voucher',
        title: 'Voucher Enviado',
        date: activeVoucher.created_at,
        icon: FileText,
        color: 'bg-indigo-600 text-white shadow-lg shadow-indigo-200',
        desc: `Voucher oficial generado (${activeVoucher.confirmation_number}) y enviado al cliente.`
     });
  }
  
  if (lead.deposit_paid) {
     timelineEvents.push({
        id: 'payment',
        title: 'Depósito Recibido',
        date: lead.updated_at,
        icon: DollarSign,
        color: 'bg-emerald-600 text-white shadow-lg shadow-emerald-200',
        desc: `Pago confirmado via Stripe (Ref: ${lead.stripe_payment_id || 'Confirmación Manual'})`
     });
  }
  
  timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Shared calculation logic for daily rates and splits
  const daysForCalc = rentalDays || 1;
  const categoryBaseCost = parseFloat(selectedCategory?.base_daily_cost || 0);
  const categoryDefaultMargin = parseFloat(selectedCategory?.daily_price || 0);
  
  // Current margin (priority to negotiated margin)
  const currentMargin = formData.agreed_daily_price !== null 
    ? parseFloat(formData.agreed_daily_price as any) 
    : categoryDefaultMargin;
  
  // Current total daily rate
  const currentTotalDaily = formData.total_amount > 0 
    ? (formData.total_amount / daysForCalc) 
    : (categoryBaseCost + categoryDefaultMargin);
    
  // Implicit current vehicle cost daily
  const currentVehicleCost = currentTotalDaily - currentMargin;

  const gridRef = useRef<HTMLDivElement>(null)
  const [isTwoCol, setIsTwoCol] = useState(false)

  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        setIsTwoCol(entry.contentRect.width > 780)
      }
    })
    obs.observe(el)
    // Initial check
    setIsTwoCol(el.offsetWidth > 780)
    return () => obs.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-white -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 pb-20">
      {/* Top Nav (Editorial Style) */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 md:px-6 py-4 flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-0">
          <div className="flex w-full lg:w-auto items-center justify-between lg:justify-start gap-4">
            <Link href="/dashboard" className="flex items-center gap-3 group shrink-0">
               <div className="w-8 h-8 bg-oceanic rounded-lg shadow-lg flex items-center justify-center group-hover:rotate-12 transition-all">
                  <div className="w-4 h-4 rounded-full border-2 border-white/50" />
               </div>
               <span className="font-sans font-black text-[10px] md:text-xs uppercase tracking-[0.2em] text-slate-800">Go Easy CRM</span>
            </Link>

            <Link 
                href="/dashboard/leads" 
                className="flex items-center gap-2 md:gap-3 text-slate-400 hover:text-primary transition-all font-black text-[10px] md:text-xs uppercase tracking-widest group whitespace-nowrap"
            >
                <div className="p-1.5 rounded-full bg-slate-100 group-hover:bg-primary/10 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />
                </div>
                <span className="hidden sm:inline">Volver al Pipeline</span>
                <span className="sm:hidden">Volver</span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 bg-white/40 p-2 rounded-[2rem] border border-white/60 shadow-sm backdrop-blur-sm w-full lg:w-auto overflow-x-auto scrollbar-hide">
            <button 
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              className={`flex items-center shrink-0 gap-2 px-4 md:px-6 py-2.5 rounded-full font-black text-[10px] md:text-xs uppercase tracking-widest transition-all ${
                isEditing ? 'bg-primary text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-white hover:text-primary'
              }`}
            >
              {isEditing ? <CheckCircle2 className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
              <span>{isEditing ? 'Guardar Cambios' : 'Editar Lead'}</span>
            </button>

            {isEditing && (
              <button 
                onClick={() => {
                   setIsEditing(false)
                   setFormData({
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
                   })
                }}
                className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {!isEditing && (
               <>
                 {activeQuote && (
                    <Link 
                      href={`/cotizacion/${activeQuote.id}`}
                      target="_blank"
                      className="px-6 py-2.5 text-slate-500 hover:text-primary transition-colors font-sans font-black text-xs uppercase tracking-widest"
                    >
                      Propuesta
                    </Link>
                 )}

                    <button 
                      id="generate-quote-btn"
                      disabled={isPending}
                      onClick={handleRegenerateQuote}
                      className="bg-oceanic hover:bg-primary-dim text-white font-black px-6 py-3 rounded-full shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 text-xs uppercase tracking-widest disabled:opacity-50"
                    >
                      <Zap className="w-4 h-4" />
                      <span>{isPending ? 'Generando...' : 'Generar Cotización'}</span>
                    </button>
               </>
            )}

            <div className="flex items-center gap-3 pl-3 pr-4 border-l border-slate-200 ml-2">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 shrink-0 bg-slate-100 shadow-sm">
                 <img src={selectedAgent?.avatar_url || `https://ui-avatars.com/api/?name=${selectedAgent?.full_name || 'Admin'}&background=4052b6&color=fff`} className="w-full h-full object-cover" alt="Profile" />
              </div>
            </div>

            <button
                onClick={handleDeleteLead}
                className="ml-2 p-2.5 text-slate-400 hover:text-white hover:bg-red-500 rounded-full transition-all border border-transparent hover:border-red-600 hover:shadow-sm"
                title="Archivar Lead"
            >
                <Trash2 className="w-4 h-4" />
            </button>
          </div>
      </div>

      {isEditing && (
        <div className="bg-amber-100/80 border-b border-amber-200 text-amber-800 px-6 py-2.5 flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
           <AlertCircle className="w-4 h-4" />
           <span className="font-bold text-xs uppercase tracking-wider">Modo edición activo — No olvides guardar tus cambios al terminar</span>
        </div>
      )}

      <PipelineStatusBar currentStatus={formData.status} onStatusChange={handleStatusChange} />

      <div 
        ref={gridRef}
        className="max-w-[1600px] mx-auto p-4 sm:p-8 lg:p-12"
        style={{
          display: 'grid',
          gridTemplateColumns: isTwoCol ? '1fr 360px' : '1fr',
          gap: isTwoCol ? '2.5rem' : '1.5rem',
          alignItems: 'start'
        }}
      >
        <div className="space-y-12">
           {/* Section 1: Customer Data */}
           <div className="bg-slate-50/50 rounded-[2rem] lg:rounded-[4rem] border-2 border-white p-6 md:p-12 lg:p-20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-[300px] h-[300px] lg:w-[600px] lg:h-[600px] bg-primary/5 rounded-full blur-[50px] lg:blur-[100px] -mr-30 -mt-30 lg:-mr-60 lg:-mt-60" />
              
              <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8 lg:gap-12">
                  <div className="flex flex-col md:flex-row items-center md:items-start lg:items-center gap-6 lg:gap-10 text-center md:text-left">
                     <div className="w-24 h-24 lg:w-32 lg:h-32 bg-primary rounded-full flex items-center justify-center text-3xl lg:text-4xl font-black text-white shadow-2xl shadow-primary/30 shrink-0 ring-8 ring-white">
                        {formData.first_name[0] || '?'}{formData.last_name[0] || ''}
                     </div>
                     <div className="space-y-4">
                        <div className="flex items-center justify-center md:justify-start gap-3 text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">
                           <span className="w-2 h-2 rounded-full bg-primary" />
                           ID: #{lead.id.slice(0, 8).toUpperCase()}
                        </div>
                        {isEditing ? (
                          <div className="flex flex-col md:flex-row gap-4">
                            <input 
                              type="text" 
                              value={formData.first_name}
                              onChange={e => setFormData({...formData, first_name: e.target.value})}
                              className="text-4xl font-sans font-black text-slate-900 bg-white border-b-2 border-primary/20 focus:border-primary outline-none px-2 w-full text-center md:text-left"
                            />
                            <input 
                              type="text" 
                              value={formData.last_name}
                              onChange={e => setFormData({...formData, last_name: e.target.value})}
                              className="text-4xl font-sans font-black text-slate-900 bg-white border-b-2 border-primary/20 focus:border-primary outline-none px-2 w-full text-center md:text-left"
                            />
                          </div>
                        ) : (
                          <h1 className="text-4xl lg:text-7xl font-sans font-black text-slate-900 leading-none tracking-tighter uppercase">
                            {formData.first_name} <span className="block md:inline text-primary">{formData.last_name}</span>
                          </h1>
                        )}
                        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-6 pt-2">
                           {isEditing ? (
                             <div className="flex gap-4 w-full">
                                <input 
                                  type="email" 
                                  value={formData.email}
                                  onChange={e => setFormData({...formData, email: e.target.value})}
                                  className="bg-white border-b border-slate-200 px-3 py-1 rounded outline-none flex-1 text-sm font-bold"
                                />
                                <input 
                                  type="tel" 
                                  value={formData.phone}
                                  onChange={e => setFormData({...formData, phone: e.target.value})}
                                  className="bg-white border-b border-slate-200 px-3 py-1 rounded outline-none flex-1 text-sm font-bold"
                                />
                             </div>
                           ) : (
                             <>
                              <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                                <AlertCircle className="w-4 h-4" />
                                <span>{formData.email || '---'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                                <MessageSquare className="w-4 h-4" />
                                <span>{formData.phone || '---'}</span>
                              </div>
                              {formData.phone && (
                                <button 
                                  onClick={() => {
                                     const el = document.getElementById('whatsapp-module');
                                     if (el) {
                                       el.scrollIntoView({ behavior: 'smooth' });
                                       setTimeout(() => {
                                         const inputEl = el.querySelector('input');
                                         if(inputEl) inputEl.focus();
                                       }, 800);
                                     }
                                  }}
                                  className="flex items-center gap-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white px-4 py-1.5 rounded-full transition-colors text-[10px] font-black uppercase tracking-widest shadow-sm"
                                >
                                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                                  Contactar
                                </button>
                              )}
                             </>
                           )}
                        </div>
                     </div>
                  </div>

                  <div className="bg-white rounded-[2rem] lg:rounded-[3rem] p-6 lg:p-10 shadow-2xl shadow-primary/10 border-t-2 border-primary/10 flex flex-col w-full lg:w-auto min-w-[200px] lg:min-w-[260px] gap-4 lg:scale-110 lg:-mr-10 items-center justify-center text-center mx-auto lg:mx-0 mt-8 lg:mt-0">
                     <div className="space-y-1 w-full relative group/total">
                        <span className="text-[10px] font-black text-primary/40 uppercase tracking-[0.4em] block text-center">Total Renta</span>
                        {isEditing ? (
                           <div className="flex items-center justify-center gap-1">
                              <span className="text-2xl font-black text-primary/50">$</span>
                              <input 
                                type="number" 
                                value={formData.total_amount}
                                onChange={e => setFormData({...formData, total_amount: parseFloat(e.target.value)})}
                                className="text-4xl font-sans font-black text-primary-dim bg-slate-50 rounded-xl px-2 py-2 w-32 outline-none text-center appearance-none"
                              />
                           </div>
                        ) : (
                           <div className="text-4xl lg:text-5xl font-sans font-black text-primary-dim tracking-tight text-center">
                           ${formData.total_amount.toLocaleString()}
                           </div>
                        )}
                        
                        {/* Desglose de Pagos (Reserva vs Counter) */}
                        {selectedCategory && rentalDays && (
                           <div className="flex items-center justify-between mt-6 gap-2 w-full p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
                              <div className="flex flex-col items-center justify-center w-1/2 border-r border-slate-200/60 pr-2">
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest text-center mb-1">Reserva (Go Easy)</span>
                                <span className="text-lg font-black text-slate-700">${(currentMargin * rentalDays).toFixed(2)}</span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center mt-1">Pagas Hoy</span>
                              </div>
                              <div className="flex flex-col items-center justify-center w-1/2 pl-2">
                                <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest text-center mb-1">Costo Vehículo</span>
                                <span className="text-lg font-black text-slate-700">${(currentVehicleCost * rentalDays).toFixed(2)}</span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center mt-1">En Counter (Destino)</span>
                              </div>
                           </div>
                        )}
                     </div>

                     <div className="w-full h-px bg-slate-100 my-1" />
                     
                     <div className="w-full space-y-3">
                        <div className="flex items-center justify-between">
                           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Estatus Reserva:</span>
                           {isEditing ? (
                              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg">
                                 <input 
                                   type="checkbox" 
                                   checked={!!formData.deposit_paid}
                                   onChange={e => setFormData({...formData, deposit_paid: e.target.checked})}
                                   className="w-4 h-4 text-primary rounded outline-none border-slate-200"
                                 />
                                 <span className="text-slate-700 font-bold uppercase tracking-widest text-[9px]">Abonado</span>
                               </label>
                           ) : (
                              formData.deposit_paid ? 
                                 <div className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg font-black flex items-center gap-1 uppercase tracking-widest text-[9px]"><CheckCircle2 className="w-3 h-3"/> Abonado</div> :
                                 <div className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg font-black flex items-center gap-1 uppercase tracking-widest text-[9px]"><AlertCircle className="w-3 h-3"/> Pendiente</div>
                           )}
                        </div>

                        {activeQuote && (
                           <div className="flex flex-col gap-2 text-[10px] bg-slate-50 p-4 rounded-2xl w-full text-left">
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
                     </div>
                  </div>
              </div>
           </div>

           {/* Section 2: Logistics & Vehicle */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
              {/* Logistics Details */}
              <div className="bg-white border border-slate-100 rounded-[2rem] lg:rounded-[3.5rem] p-6 md:p-10 lg:p-16 shadow-[0_15px_40px_rgba(0,0,0,0.02)] space-y-12 lg:space-y-16">
                 <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] pl-1">Agenda Logística</h3>
                 
                 <div className="relative space-y-20 pl-8 border-l-2 border-slate-50">
                    <div className="relative">
                       <div className="absolute -left-[45px] top-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center ring-8 ring-white">
                          <Clock className="w-4 h-4" />
                       </div>
                       <div className="space-y-4">
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest">Recogida (Pick-up)</p>
                          {isEditing ? (
                              <div className="space-y-3">
                                 <input 
                                   type="datetime-local" 
                                   value={formData.pickup_date}
                                   onChange={e => setFormData({...formData, pickup_date: e.target.value})}
                                   className="w-full text-lg font-sans font-black text-slate-900 bg-slate-50 p-4 rounded-2xl outline-none"
                                 />
                                 <select
                                   value={formData.pickup_location_id}
                                   onChange={e => {
                                     const loc = locations.find(l => l.id === e.target.value)
                                     setFormData({...formData, pickup_location_id: e.target.value, pickup_location: loc ? loc.name : formData.pickup_location})
                                   }}
                                   className="w-full text-sm font-bold text-slate-700 bg-slate-50 p-4 rounded-2xl outline-none cursor-pointer"
                                 >
                                   <option value="">— Sin ubicación —</option>
                                   {locations.map(l => (
                                     <option key={l.id} value={l.id}>{l.name}{l.code ? ` (${l.code})` : ''}</option>
                                   ))}
                                 </select>
                              </div>
                           ) : (
                              <>
                                 <p className="text-2xl font-sans font-black text-slate-900 leading-tight">
                                   {lead.pickup_date ? format(new Date(lead.pickup_date.slice(0, 16)), "EEEE, d 'de' MMMM", { locale: es }) : 'Fecha pendiente'}
                                 </p>
                                 <div className="flex items-center gap-3 text-sm font-bold text-slate-400">
                                    <MapPin className="w-4 h-4 text-primary/40" />
                                    <span>{(locations.find(l => l.id === formData.pickup_location_id)?.name) || formData.pickup_location || '—'} · {lead.pickup_date ? format(new Date(lead.pickup_date.slice(0, 16)), "hh:mm a") : ''}</span>
                                 </div>
                              </>
                           )}
                       </div>
                    </div>

                    <div className="relative pt-4">
                       <div className="absolute -left-[45px] top-4 w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center ring-8 ring-white">
                          <CheckCircle2 className="w-4 h-4 text-slate-300" />
                       </div>
                       <div className="space-y-4">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Devolución (Drop-off)</p>
                          {isEditing ? (
                               <div className="space-y-3">
                                  <input 
                                    type="datetime-local" 
                                    value={formData.return_date}
                                    onChange={e => setFormData({...formData, return_date: e.target.value})}
                                    className="w-full text-lg font-sans font-black text-slate-900 bg-slate-50 p-4 rounded-2xl outline-none"
                                  />
                                  <select
                                    value={formData.return_location_id}
                                    onChange={e => {
                                      const loc = locations.find(l => l.id === e.target.value)
                                      setFormData({...formData, return_location_id: e.target.value, return_location: loc ? loc.name : formData.return_location})
                                    }}
                                    className="w-full text-sm font-bold text-slate-700 bg-slate-50 p-4 rounded-2xl outline-none cursor-pointer"
                                  >
                                    <option value="">— Sin ubicación —</option>
                                    {locations.map(l => (
                                      <option key={l.id} value={l.id}>{l.name}{l.code ? ` (${l.code})` : ''}</option>
                                    ))}
                                  </select>
                               </div>
                           ) : (
                              <>
                                 <p className="text-2xl font-sans font-black text-slate-900 leading-tight">
                                   {lead.return_date ? format(new Date(lead.return_date.slice(0, 16)), "EEEE, d 'de' MMMM", { locale: es }) : 'Fecha pendiente'}
                                 </p>
                                 <div className="flex items-center gap-3 text-sm font-bold text-slate-400">
                                    <MapPin className="w-4 h-4 text-slate-300" />
                                    <span>{(locations.find(l => l.id === formData.return_location_id)?.name) || formData.return_location || '—'} · {lead.return_date ? format(new Date(lead.return_date.slice(0, 16)), "hh:mm a") : ''}</span>
                                 </div>
                              </>
                           )}
                       </div>
                    </div>
                 </div>
              </div>

              {/* Vehicle Group Card — Redesigned */}
               <div className="relative rounded-[2rem] lg:rounded-[3.5rem] overflow-hidden flex flex-col group" style={{background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'}}>
                  {/* Glowing orbs */}
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary rounded-full blur-[80px] opacity-25 group-hover:opacity-45 transition-opacity duration-1000" />
                  <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-oceanic rounded-full blur-[60px] opacity-20 group-hover:opacity-35 transition-opacity duration-1000" />
                  <div className="absolute inset-0 opacity-5" style={{backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.3) 40px, rgba(255,255,255,0.3) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.3) 40px, rgba(255,255,255,0.3) 41px)'}} />

                  {/* Content */}
                  <div className="relative z-10 p-6 md:p-10 lg:p-12">
                     {/* Header */}
                     <div className="flex items-center justify-between mb-8">
                       <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em]">Vehículo Seleccionado</span>
                       <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)'}}>
                         <Car className="w-3 h-3 text-primary/70" />
                         <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Premium Fleet</span>
                       </div>
                     </div>

                     {/* Vehicle selector / name */}
                     {isEditing ? (
                        <select
                          value={formData.category_id}
                          onChange={e => setFormData({...formData, category_id: e.target.value, agreed_daily_price: null})}
                          className="w-full text-2xl font-sans font-black text-white bg-white/10 border border-white/10 rounded-2xl p-4 outline-none appearance-none cursor-pointer mb-6"
                        >
                           <option value="" disabled className="text-slate-900">Seleccionar Vehículo</option>
                           {categories.map(cat => (
                              <option key={cat.id} value={cat.id} className="text-slate-900">{cat.name}</option>
                           ))}
                        </select>
                     ) : (
                       <h2 className="text-3xl lg:text-4xl font-sans font-black leading-none uppercase tracking-tight text-white mb-6">
                         {selectedCategory?.name || 'Sin Asignar'}
                       </h2>
                     )}

                     {/* Stats row */}
                     <div className="grid grid-cols-3 gap-3 mb-2">
                       <div className="rounded-2xl p-4 text-center" style={{background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)'}}>
                         <div className="text-lg font-black text-white">{rentalDays ?? '—'}</div>
                         <div className="text-[8px] font-black text-white/30 uppercase tracking-widest mt-0.5">Días</div>
                       </div>
                       <div className="rounded-2xl p-4 text-center" style={{background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)'}}>
                         <div className="text-lg font-black text-white">
                            ${Number(((formData.total_amount / (rentalDays || 1)) || 0).toFixed(2))}
                         </div>
                         <div className="text-[8px] font-black text-white/30 uppercase tracking-widest mt-0.5">/día (Total)</div>
                       </div>
                       <div className="rounded-2xl p-4 text-center" style={{background: 'rgba(64,82,182,0.25)', border: '1px solid rgba(64,82,182,0.4)'}}>
                         <div className="text-lg font-black text-primary">${formData.total_amount.toLocaleString()}</div>
                         <div className="text-[8px] font-black text-primary/50 uppercase tracking-widest mt-0.5">Total</div>
                       </div>
                     </div>

                     {/* Plan Selector */}
                     <div className="mt-4 mb-2 p-1 bg-white/5 rounded-2xl flex relative overflow-hidden text-center text-[10px] font-black uppercase tracking-widest">
                       <div 
                         className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-xl transition-all duration-300 ease-out bg-white shadow-sm ${formData.rate_plan === 'premium' ? 'left-[calc(50%+2px)]' : 'left-1'}`}
                       />
                       <button
                         disabled={!isEditing}
                         onClick={() => handleRatePlanChange('base')}
                         className={`relative flex-1 py-3 transition-colors ${formData.rate_plan === 'base' ? 'text-slate-900' : 'text-white/50 hover:text-white disabled:opacity-50'}`}
                       >
                         Tarifa Base
                       </button>
                       <button
                         disabled={!isEditing}
                         onClick={() => handleRatePlanChange('premium')}
                         className={`relative flex-1 py-3 transition-colors flex items-center justify-center gap-1.5 ${formData.rate_plan === 'premium' ? 'text-indigo-900' : 'text-white/50 hover:text-white disabled:opacity-50'}`}
                       >
                         <Zap className={`w-3 h-3 ${formData.rate_plan === 'premium' ? 'text-indigo-600' : ''}`} /> Premium +15%
                       </button>
                     </div>

                     {/* Agente: Calculador de Margen Dinámico */}
                     {isEditing && selectedCategory && selectedCategory.base_daily_cost && (
                        <div className="mt-6 p-5 rounded-2xl border border-white/10" style={{background: 'rgba(255,255,255,0.03)'}}>
                           <div className="flex items-center justify-between mb-4">
                              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2"><Calculator className="w-3.5 h-3.5"/> Negociación Ajustable</span>
                              <span className="text-[9px] font-bold text-white/50">Base Prov: ${selectedCategory.base_daily_cost}/día</span>
                           </div>
                           {(() => {
                               const daysForCalc = rentalDays || 1;
                               const categoryBaseCost = parseFloat(selectedCategory.base_daily_cost) || 0;
                               const categoryDefaultMargin = parseFloat(selectedCategory.daily_price) || 0;
                               const minMargin = categoryDefaultMargin * 0.5;
                               
                               const currentMargin = formData.agreed_daily_price !== null ? parseFloat(formData.agreed_daily_price as any) : categoryDefaultMargin;
                               const currentTotalDaily = formData.total_amount > 0 ? (formData.total_amount / daysForCalc) : (categoryBaseCost + categoryDefaultMargin);
                               const currentVehicleCost = currentTotalDaily - currentMargin;
                               
                               return (
                                  <div className="space-y-6">
                                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* 1. COSTO VEHÍCULO (BASE) */}
                                        <div className="space-y-1">
                                           <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                                             Costo Vehículo ($/día)
                                           </label>
                                           <div className="relative group/input">
                                             <input 
                                                type="number" 
                                                value={Number(currentVehicleCost.toFixed(2))}
                                                onChange={(e) => {
                                                   const newVal = parseFloat(e.target.value);
                                                   if (isNaN(newVal)) return;
                                                   const newTotalDaily = newVal + currentMargin;
                                                   setFormData({
                                                      ...formData,
                                                      total_amount: newTotalDaily * daysForCalc
                                                   });
                                                }}
                                                className="w-full text-lg font-sans font-black text-white bg-white/5 border border-white/10 rounded-xl p-3 pr-10 outline-none focus:border-rose-500/50 transition-colors"
                                             />
                                             <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                                               <Car className="w-3 h-3 text-white" />
                                             </div>
                                           </div>
                                        </div>

                                        {/* 2. GANANCIA GO EASY (MARGEN) */}
                                        <div className="space-y-1">
                                           <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                                             Ganancia Go Easy ($/día)
                                           </label>
                                           <div className="relative group/input">
                                             <input 
                                                type="number" 
                                                value={Number(currentMargin.toFixed(2))}
                                                onChange={(e) => {
                                                   const newVal = parseFloat(e.target.value);
                                                   if (isNaN(newVal)) return;
                                                   const newTotalDaily = currentVehicleCost + newVal;
                                                   setFormData({
                                                      ...formData,
                                                      total_amount: newTotalDaily * daysForCalc,
                                                      agreed_daily_price: newVal
                                                   });
                                                }}
                                                onBlur={(e) => {
                                                   const val = parseFloat(e.target.value) || 0;
                                                   if (val < minMargin) {
                                                      alert(`Mínimo 50% de ganancia: $${minMargin.toFixed(2)}/día.`);
                                                      setFormData({...formData, agreed_daily_price: minMargin, total_amount: (currentVehicleCost + minMargin) * daysForCalc});
                                                   }
                                                }}
                                                className={`w-full text-lg font-sans font-black p-3 pr-10 rounded-xl border outline-none transition-all ${
                                                  currentMargin < categoryDefaultMargin 
                                                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 focus:border-amber-500' 
                                                  : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10 focus:border-emerald-500'
                                                }`}
                                             />
                                             <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                                               <Edit2 className="w-3 h-3" />
                                             </div>
                                           </div>
                                        </div>

                                        {/* 3. TOTAL DIARIO (COMPETENCIA / PREMIUM) */}
                                        <div className="space-y-1">
                                           <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                                             Total Diario ($/día)
                                           </label>
                                           <div className="relative group/input">
                                             <input 
                                                type="number" 
                                                value={Number(currentTotalDaily.toFixed(2))}
                                                onChange={(e) => {
                                                   const newVal = parseFloat(e.target.value);
                                                   if (isNaN(newVal)) return;
                                                   setFormData({
                                                      ...formData,
                                                      total_amount: newVal * daysForCalc
                                                   });
                                                }}
                                                className="w-full text-lg font-sans font-black text-white bg-primary/20 border border-primary/30 rounded-xl p-3 pr-10 outline-none focus:border-primary transition-colors"
                                             />
                                             <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                               <Calculator className="w-4 h-4 text-primary" />
                                             </div>
                                           </div>
                                        </div>
                                     </div>

                                     <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <div className="flex flex-col gap-1">
                                           <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Resumen Cotización</span>
                                           <div className="text-[10px] space-x-3">
                                              <span className="text-white/40">Pago Counter (Prov.): <b className="text-white">${(currentVehicleCost * daysForCalc).toFixed(2)}</b></span>
                                              <span className="text-white/40">Pago Reserva (Margin): <b className="text-emerald-400">${(currentMargin * daysForCalc).toFixed(2)}</b></span>
                                           </div>
                                        </div>
                                        {formData.agreed_daily_price !== null && (
                                           <button 
                                             onClick={(e) => { e.preventDefault(); setFormData({...formData, agreed_daily_price: null, total_amount: 0}); }}
                                             className="text-[9px] font-black text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest underline"
                                           >
                                              Resetear a Cat. Base
                                           </button>
                                        )}
                                     </div>
                                  </div>
                               )
                            })()}
                        </div>
                     )}

                     {/* Description */}
                     {selectedCategory?.description && (
                       <p className="text-[10px] text-white/30 font-bold leading-relaxed mt-4 line-clamp-2">{selectedCategory.description}</p>
                     )}
                  </div>

                  {/* Vehicle image */}
                  <div className="relative z-10 px-6 pb-6 mt-auto">
                     <div className="rounded-[2rem] overflow-hidden" style={{background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)'}}>
                       <img
                         src={selectedCategory?.image_url || 'https://images.unsplash.com/photo-1550355291-bbee04a92027?q=80&w=800&auto=format&fit=crop'}
                         className="w-full h-48 object-cover object-center group-hover:scale-105 transition-transform duration-700"
                         alt={selectedCategory?.name || 'Car'}
                       />
                     </div>
                     {/* Bottom label */}
                     <div className="mt-3 flex items-center justify-between px-1">
                       <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Go Easy Premium Fleet</span>
                       {(formData.agreed_daily_price !== null ? formData.agreed_daily_price : selectedCategory?.daily_price) && rentalDays && (
                         <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest">{rentalDays} × ${formData.agreed_daily_price !== null ? formData.agreed_daily_price : selectedCategory?.daily_price}</span>
                       )}
                     </div>
                  </div>
               </div>
           </div>

           <ActivityTimeline
             events={timelineEvents}
             activeQuote={activeQuote}
             onRegenerateQuote={handleRegenerateQuote}
           />

           {/* Large Action Area (CTA) */}
           <div className="bg-oceanic rounded-[2rem] lg:rounded-[4rem] p-8 md:p-12 lg:p-20 relative overflow-hidden group">
              <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000" />
              <div className="relative flex flex-col mx-auto text-center lg:text-left lg:flex-row items-center justify-between gap-8 lg:gap-12 text-white">
                  <div className="max-w-md space-y-4">
                     <h3 className="text-2xl md:text-3xl lg:text-5xl font-sans font-black leading-tight uppercase tracking-tighter">
                        ¿Reserva Confirmada?
                     </h3>
                     <p className="text-white/60 font-bold text-xs lg:text-sm tracking-wide">
                        Genera el Voucher oficial inmediatamente para el cliente.
                     </p>
                  </div>
                  <div className="flex flex-col w-full lg:w-auto gap-4">
                        {activeVoucher ? (
                           <div className="flex flex-col gap-4 items-center sm:items-end">
                             <div className="flex flex-col gap-4 bg-white/5 p-6 rounded-[2rem] border border-white/10 w-full sm:min-w-[400px]">
                                {/* Provider Selector for existing voucher */}
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-1 flex items-center gap-2">
                                     <Users className="w-3 h-3" /> Partner / Rentadora
                                  </label>
                                  <select 
                                     value={formData.provider_id}
                                     onChange={async (e) => {
                                       const newPid = e.target.value;
                                       setFormData({...formData, provider_id: newPid});
                                       await updateLead(lead.id, { provider_id: newPid });
                                     }}
                                     className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-white/30"
                                  >
                                     <option value="" className="text-slate-900">Sin Proveedor</option>
                                     {providers.map(p => (
                                       <option key={p.id} value={p.id} className="text-slate-900">{p.name}</option>
                                     ))}
                                  </select>
                                </div>

                                {/* Confirmation Number */}
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-1 flex items-center gap-2">
                                     <Hash className="w-3 h-3" /> N° Confirmación Proveedor
                                  </label>
                                  <div className="flex gap-2">
                                     <input 
                                       type="text"
                                       value={providerConfirmation}
                                       onChange={(e) => setProviderConfirmation(e.target.value)}
                                       placeholder="Ej: RC-20240412-001"
                                       className="bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder:text-white/20 outline-none focus:border-white/30 flex-1"
                                     />
                                     <button 
                                       onClick={async () => {
                                         setIsUpdatingConfirmation(true)
                                         try {
                                           await updateProviderConfirmation(activeVoucher.id, providerConfirmation, lead.id)
                                         } catch (err) {
                                           console.error(err)
                                           alert('Error al actualizar confirmación')
                                         } finally {
                                           setIsUpdatingConfirmation(false)
                                         }
                                       }}
                                       disabled={isUpdatingConfirmation}
                                       className="bg-white text-primary px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors disabled:opacity-50"
                                     >
                                       {isUpdatingConfirmation ? '...' : 'Guardar'}
                                     </button>
                                  </div>
                                </div>

                                {activeVoucher.provider_confirmation && (
                                  <div className="flex items-center gap-2 pl-1 pt-1">
                                     <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                     <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Confirmado en sistema</span>
                                  </div>
                                )}
                             </div>
                             <div className="flex flex-col sm:flex-row gap-4 w-full">
                                <Link href={`/voucher/${activeVoucher.id}`} target="_blank" className="bg-white/10 text-white border border-white/20 px-8 py-5 rounded-[2rem] font-sans font-black hover:bg-white/20 transition-all text-xs uppercase tracking-[0.2em] flex-1 text-center">
                                   Ver Voucher Actual
                                </Link>
                                <button 
                                  onClick={handleRegenerateVoucher}
                                  disabled={isPending}
                                  className="bg-white text-primary px-8 py-5 rounded-[2rem] font-sans font-black hover:scale-105 transition-all text-xs uppercase tracking-[0.2em] shadow-2xl shadow-black/20 flex-1 text-center flex items-center justify-center gap-2"
                                >
                                   {isPending ? '...' : <><Zap className="w-4 h-4" /> Regenerar Voucher</>}
                                </button>
                             </div>
                           </div>
                        ) : (
                           <div className="flex flex-col gap-4 items-center sm:items-end w-full sm:min-w-[400px]">
                              <div className="flex flex-col gap-4 bg-white/5 p-6 rounded-[2rem] border border-white/10 w-full">
                                {/* Provider Selector - PRE CREATION */}
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-1 flex items-center gap-2">
                                     <Users className="w-3 h-3" /> 1. Seleccionar Proveedor
                                  </label>
                                  <select 
                                     value={ctaProviderId}
                                     onChange={(e) => {
                                       setCtaProviderId(e.target.value);
                                       setCtaError(null);
                                     }}
                                     className={`w-full bg-white/10 border ${ctaError?.includes('proveedor') ? 'border-rose-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-white/30`}
                                  >
                                     <option value="" className="text-slate-900">Seleccionar Rentadora...</option>
                                     {providers.map(p => (
                                       <option key={p.id} value={p.id} className="text-slate-900">{p.name}</option>
                                     ))}
                                  </select>
                                </div>

                                {/* Confirmation Number - PRE CREATION */}
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-1 flex items-center gap-2">
                                     <Hash className="w-3 h-3" /> 2. N° Confirmación
                                  </label>
                                  <input 
                                    type="text"
                                    value={ctaProviderConfirmation}
                                    onChange={(e) => {
                                      setCtaProviderConfirmation(e.target.value);
                                      setCtaError(null);
                                    }}
                                    placeholder="Ingrese código de reserva..."
                                    className={`w-full bg-white/10 border ${ctaError?.includes('confirmación') ? 'border-rose-500/50' : 'border-white/10'} rounded-xl px-4 py-3 text-sm font-bold text-white placeholder:text-white/20 outline-none focus:border-white/30`}
                                  />
                                </div>

                                {ctaError && (
                                   <div className="bg-rose-500/20 border border-rose-500/30 rounded-xl p-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                                      <p className="text-[10px] font-black text-rose-200 uppercase tracking-widest leading-tight">{ctaError}</p>
                                   </div>
                                )}
                              </div>

                              <button 
                                onClick={async () => {
                                   if (!ctaProviderId && !ctaProviderConfirmation) {
                                      setCtaError('Debes seleccionar un proveedor y añadir el n° de confirmación.');
                                      return;
                                   }
                                   if (!ctaProviderId) {
                                      setCtaError('Debes seleccionar un proveedor para generar el voucher.');
                                      return;
                                   }
                                   if (!ctaProviderConfirmation) {
                                      setCtaError('El n° de confirmación es obligatorio.');
                                      return;
                                   }
                                   
                                   setCtaError(null);
                                   startTransition(async () => {
                                      try {
                                         await generateVoucherForLead(lead.id, ctaProviderId, ctaProviderConfirmation);
                                         setFormData(prev => ({ ...prev, status: 'voucher_enviado' }));
                                         router.refresh();
                                      } catch (err) {
                                         console.error(err);
                                         alert('Error al generar voucher');
                                      }
                                   });
                                }}
                                disabled={isPending}
                                className="bg-white text-primary px-10 py-5 rounded-[2rem] font-sans font-black hover:scale-105 transition-all text-xs uppercase tracking-[0.2em] shadow-2xl shadow-black/20 w-full flex items-center justify-center gap-3 disabled:opacity-50"
                              >
                                {isPending ? (
                                   <>
                                      <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                      <span>Generando...</span>
                                   </>
                                ) : (
                                   <>
                                      <CheckCircle2 className="w-4 h-4" />
                                      <span>Generar Voucher Oficial</span>
                                   </>
                                )}
                              </button>
                           </div>
                        )}
                   </div>
              </div>
           </div>
        </div>

        {/* Right Sidebar Area */}
        <div className="space-y-6 lg:space-y-12">
           {/* Section: Agent & Partner */}
           <div className="bg-white border border-slate-100 rounded-[2rem] lg:rounded-[3.5rem] p-6 lg:p-10 shadow-[0_15px_40px_rgba(0,0,0,0.02)] space-y-8 lg:space-y-10 group">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] pl-1">Gestión Interna</h4>
              
              <div className="space-y-8">
                 <div className="space-y-3">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] pl-1">Agente Asignado</p>
                    {isEditing ? (
                        <select 
                          value={formData.assigned_to}
                          onChange={e => setFormData({...formData, assigned_to: e.target.value})}
                          className="w-full py-4 px-6 rounded-2xl bg-slate-50 border-none outline-none text-sm font-bold text-slate-700"
                        >
                          <option value="">Sin Agente</option>
                          {agents.map(agent => (
                             <option key={agent.id} value={agent.id}>{agent.full_name}</option>
                          ))}
                        </select>
                    ) : (
                      <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl">
                         <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-black text-xs shrink-0 overflow-hidden">
                            {selectedAgent?.avatar_url ? <img src={selectedAgent.avatar_url} className="w-full h-full object-cover" /> : selectedAgent?.full_name?.[0] || 'A'}
                         </div>
                         <div>
                            <p className="text-sm font-black text-slate-900 leading-none">{selectedAgent?.full_name || 'Sin Asignar'}</p>
                         </div>
                      </div>
                    )}
                 </div>

                 <div className="space-y-3">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] pl-1">Proveedor (Rentadora)</p>
                    {isEditing ? (
                        <select 
                          value={formData.provider_id}
                          onChange={e => setFormData({...formData, provider_id: e.target.value})}
                          className="w-full py-4 px-6 rounded-2xl bg-slate-50 border-none outline-none text-sm font-bold text-slate-700"
                        >
                          <option value="">Sin Proveedor</option>
                          {providers.map(prov => (
                             <option key={prov.id} value={prov.id}>{prov.name}</option>
                          ))}
                        </select>
                    ) : (
                      <div className="flex flex-col items-center gap-6 p-8 bg-dots rounded-[2.5rem] border border-slate-50 text-center">
                         <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center border border-slate-50 overflow-hidden p-6 ring-4 ring-slate-50">
                            {selectedProvider ? <span className="text-primary font-black text-xs uppercase tracking-tighter">Partner</span> : <Users className="w-8 h-8 text-slate-200" />}
                         </div>
                         <div>
                            <p className="text-lg font-sans font-black text-slate-900 leading-tight uppercase">{selectedProvider?.name || 'Pendiente'}</p>
                         </div>
                      </div>
                    )}
                 </div>

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

           {/* WhatsApp History area */}
           <div id="whatsapp-module" className="bg-white border border-slate-100 rounded-[2rem] lg:rounded-[3.5rem] p-6 lg:p-10 shadow-[0_15px_40px_rgba(0,0,0,0.02)] flex flex-col h-[650px] scroll-mt-32">
               <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 lg:mb-10 px-1">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                       <MessageSquare className="w-4 h-4" />
                    </div>
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">WhatsApp History</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest italic">Live API</span>
                  </div>
               </div>

               {/* Messages Feed */}
               <div className="flex-1 space-y-8 mb-8 overflow-y-auto pr-4 scrollbar-hide py-2">
                   {hasMoreMessages && (
                     <div className="flex justify-center">
                       <button
                         onClick={handleLoadMoreMessages}
                         disabled={isLoadingMore}
                         className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors px-4 py-2 rounded-full bg-slate-50 hover:bg-slate-100 disabled:opacity-50"
                       >
                         {isLoadingMore ? 'Cargando...' : `Ver mensajes anteriores (${totalMessages - messages.length} más)`}
                       </button>
                     </div>
                   )}
                   {messages?.length > 0 ? messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.direction === 'outbound' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
                       <div className={`max-w-[85%] p-4 md:p-6 rounded-[2rem] text-sm font-bold leading-relaxed mb-2 ${
                          msg.direction === 'outbound' 
                            ? 'bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10' 
                            : 'bg-slate-50 text-slate-700 rounded-tl-none border border-slate-100'
                       }`}>
                          {msg.media_type?.startsWith('audio/') ? (
                             <div className="flex flex-col gap-3 min-w-[200px] md:min-w-[240px]">
                               <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${msg.direction === 'outbound' ? 'bg-white/20' : 'bg-primary/10'}`}>
                                       <Volume2 className={`w-4 h-4 ${msg.direction === 'outbound' ? 'text-white' : 'text-primary'}`} />
                                    </div>
                                    <span className="text-[10px] uppercase tracking-widest opacity-60">Mensaje de Voz</span>
                                 </div>
                               </div>
                               <div className={`rounded-2xl p-2 ${msg.direction === 'outbound' ? 'bg-white/10' : 'bg-white/50'}`}>
                                 <audio controls src={msg.media_url} className="w-full h-8 hue-rotate-[180deg] invert-[0.1]" />
                               </div>
                               {msg.content && msg.content !== 'Media: audio/ogg' && msg.content !== '[Multimedia]' && <p className="mt-1 text-xs opacity-90">{msg.content}</p>}
                             </div>
                          ) : (
                             msg.content
                          )}
                       </div>
                       <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest px-1">
                          {format(new Date(msg.created_at), 'HH:mm', { locale: es })}
                       </span>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-30 mt-[-40px]">
                       <MessageSquare size={60} className="mb-4 text-slate-200" />
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">No hay mensajes registrados</p>
                    </div>
                  )}
               </div>

                {/* Chat Input */}
                <div className="relative group mt-auto flex items-center gap-3 px-1">
                   {isRecording ? (
                      <div className="flex-1 flex items-center justify-between bg-rose-50 border-2 border-rose-100 rounded-[1.8rem] px-6 py-4 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-3">
                           <div className="w-3 h-3 bg-rose-500 rounded-full animate-pulse" />
                           <span className="text-sm font-black text-rose-600 font-mono">
                             {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                           </span>
                        </div>
                        <div className="flex items-center gap-2">
                           <button 
                             onClick={cancelRecording}
                             className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                           >
                             <Trash2 className="w-5 h-5" />
                           </button>
                           <button 
                             onClick={stopRecordingAndSend}
                             disabled={isSendingMessage}
                             className="w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg shadow-rose-200"
                           >
                             {isSendingMessage ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                           </button>
                        </div>
                      </div>
                   ) : (
                      <>
                        <div className="relative flex-1">
                          <input 
                            type="text" 
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Mensaje de WhatsApp..." 
                            className="w-full bg-slate-50 border-none rounded-[1.8rem] pl-6 pr-14 py-5 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                          />
                          {chatMessage ? (
                            <button 
                              onClick={handleSendMessage}
                              disabled={isSendingMessage}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:bg-slate-300"
                            >
                               {isSendingMessage ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                            </button>
                          ) : (
                            <button 
                              onClick={startRecording}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-all"
                              title="Grabar audio"
                            >
                               <Mic className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </>
                   )}
                </div>
         </div>

         {/* 📞 Zadarma Call Log */}
         <CallLogPanel
           leadId={lead.id}
           leadPhone={formData.phone || ''}
           agentId={currentUser?.id || ''}
           agentSip={currentUser?.zadarma_sip || null}
         />
       </div>
      </div>
    </div>
  )
}
