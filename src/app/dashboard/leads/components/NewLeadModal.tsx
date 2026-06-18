'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, User, Phone, Mail, Calendar, MapPin, Car, DollarSign, CheckCircle2, Loader2 } from 'lucide-react'
import { createLead, searchCustomerByContact } from '../actions'
import { calcTotal } from '@/lib/leads/calculations'
import { toast } from 'sonner'
import { Sparkles, History } from 'lucide-react'

interface NewLeadModalProps {
  isOpen: boolean
  onClose: () => void
  categories: any[]
  locations: any[]
  currentUserId: string
}

export function NewLeadModal({ isOpen, onClose, categories, locations, currentUserId }: NewLeadModalProps) {
  const [isPending, setIsPending] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [foundCustomer, setFoundCustomer] = useState<{first_name: string, last_name: string, isRecurring: boolean} | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Price calculation states
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [pickupDate, setPickupDate] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [totalAmount, setTotalAmount] = useState<number>(0)

  useEffect(() => {
    setMounted(true)
    if (isOpen) {
      setModalVisible(true)
      document.body.style.overflow = 'hidden'
      // Reset calculation states on open
      setSelectedCategoryId('')
      setPickupDate('')
      setReturnDate('')
      setTotalAmount(0)
    } else {
      const timer = setTimeout(() => setModalVisible(false), 300)
      document.body.style.overflow = 'unset'
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Automatic price calculation logic
  useEffect(() => {
    if (selectedCategoryId && pickupDate && returnDate) {
      const p = new Date(pickupDate)
      const r = new Date(returnDate)
      if (r >= p) {
        const diffInDays = Math.max(1, Math.ceil((r.getTime() - p.getTime()) / (1000 * 60 * 60 * 24)))
        const category = categories.find(c => c.id === selectedCategoryId)
        if (category) setTotalAmount(calcTotal(category, diffInDays, 'base'))
      }
    }
  }, [selectedCategoryId, pickupDate, returnDate, categories])

  if (!isOpen && !modalVisible) return null
  if (!mounted) return null

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (!value || value.length < 5) {
      setFoundCustomer(null)
      return
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const customer = await searchCustomerByContact(value)
        if (customer) {
          setFoundCustomer({
            first_name: customer.first_name,
            last_name: customer.last_name,
            isRecurring: true
          })
          
          // Autofill if inputs are empty
          if (formRef.current) {
            const firstNameInput = formRef.current.elements.namedItem('first_name') as HTMLInputElement
            const lastNameInput = formRef.current.elements.namedItem('last_name') as HTMLInputElement
            const phoneInput = formRef.current.elements.namedItem('phone') as HTMLInputElement
            const emailInput = formRef.current.elements.namedItem('email') as HTMLInputElement
            
            if (firstNameInput && !firstNameInput.value) firstNameInput.value = customer.first_name
            if (lastNameInput && !lastNameInput.value) lastNameInput.value = customer.last_name
            if (phoneInput && !phoneInput.value && customer.phone) phoneInput.value = customer.phone
            if (emailInput && !emailInput.value && customer.email) emailInput.value = customer.email
            
            toast.info(`Cliente encontrado: ${customer.first_name} ${customer.last_name}`, {
              description: 'Se han autocompletado los datos del cliente.',
              icon: <Sparkles className="w-4 h-4 text-amber-500" />
            })
          }
        } else {
          setFoundCustomer(null)
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsSearching(false)
      }
    }, 600)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    
    const formData = new FormData(e.currentTarget)
    // Add current user as assignee by default
    formData.append('assigned_to', currentUserId)
    
    try {
      await createLead(formData)
      toast.success('¡Reserva creada con éxito!', {
        description: 'La nueva reserva ha sido registrada en el pipeline.',
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      })
      onClose()
    } catch (error: any) {
      toast.error('Error al crear la reserva', {
        description: error.message || 'Ocurrió un error inesperado.'
      })
    } finally {
      setIsPending(false)
    }
  }

  const modalContent = (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden transition-all duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm shadow-2xl"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div 
        className={`bg-white w-full h-full rounded-none shadow-[0_20px_70px_rgba(0,0,0,0.3)] relative z-50 overflow-hidden flex flex-col transform transition-all duration-500 ${
          isOpen ? 'translate-y-0 scale-100' : 'translate-y-12 scale-95'
        }`}
        style={{ backgroundColor: '#ffffff' }}
      >
        {/* Header - Fixed at top */}
        <div className="bg-slate-50 border-b border-slate-100 shrink-0">
          <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-sans font-black text-slate-900 uppercase tracking-tighter leading-tight">
                    Registrar <span className="text-primary">Nueva Reserva</span>
                  </h2>
                  {foundCustomer?.isRecurring && (
                    <div className="bg-amber-100 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider animate-bounce-subtle">
                      <Sparkles className="w-2.5 h-2.5" />
                      Recurrente
                    </div>
                  )}
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">
                  {foundCustomer ? 'Datos recuperados del último viaje' : 'Completa los datos del cliente'}
                </p>
              </div>
            </div>
            <button 
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-white">
          <form ref={formRef} onSubmit={handleSubmit} className="max-w-3xl mx-auto p-4 md:p-8 lg:py-12 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Basic Info */}
              <div className="space-y-4">
                <label className="block">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Nombre del Cliente</span>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <input 
                      name="first_name"
                      type="text" 
                      required
                      placeholder="Eje: Juan"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/10 transition-all outline-none"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Apellido</span>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <input 
                      name="last_name"
                      type="text" 
                      required
                      placeholder="Eje: Pérez"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/10 transition-all outline-none"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">WhatsApp / Teléfono</span>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <input 
                      name="phone"
                      type="tel" 
                      placeholder="+1 (555) 000-0000"
                      onChange={handleContactChange}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/10 transition-all outline-none"
                    />
                    {isSearching && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-3 h-3 text-primary animate-spin" />
                      </div>
                    )}
                  </div>
                </label>

                <label className="block">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Correo Electrónico</span>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <input 
                      name="email"
                      type="email" 
                      placeholder="juan@ejemplo.com"
                      onChange={handleContactChange}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/10 transition-all outline-none"
                    />
                  </div>
                </label>
              </div>

              {/* Trip Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Pickup</span>
                    <div className="grid grid-cols-[1fr,auto] gap-2">
                      <div className="relative group">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none transition-colors" />
                        <input 
                          name="pickup_date"
                          type="date" 
                          required
                          value={pickupDate}
                          onChange={(e) => setPickupDate(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/10 transition-all outline-none"
                        />
                      </div>
                      <input 
                        name="pickup_time"
                        type="time" 
                        required
                        defaultValue="10:00"
                        className="px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/10 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Return</span>
                    <div className="grid grid-cols-[1fr,auto] gap-2">
                      <div className="relative group">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none transition-colors" />
                        <input 
                          name="return_date"
                          type="date" 
                          required
                          value={returnDate}
                          onChange={(e) => setReturnDate(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/10 transition-all outline-none"
                        />
                      </div>
                      <input 
                        name="return_time"
                        type="time" 
                        required
                        defaultValue="10:00"
                        className="px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/10 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>

                <label className="block">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Locación de Entrega</span>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <select 
                      name="pickup_location"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/10 transition-all outline-none appearance-none"
                    >
                      <option value="">Seleccionar locación...</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.name}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                </label>

                <label className="block">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Categoría de Vehículo</span>
                  <div className="relative group">
                    <Car className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <select 
                      name="category_id"
                      required
                      value={selectedCategoryId}
                      onChange={(e) => setSelectedCategoryId(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/10 transition-all outline-none appearance-none"
                    >
                      <option value="">Seleccionar categoría...</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name} - ${cat.daily_price}/día</option>
                      ))}
                    </select>
                  </div>
                </label>

                <label className="block">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Monto Estimado (Total)</span>
                  <div className="relative group">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <input 
                      name="total_amount"
                      type="number" 
                      step="0.01"
                      placeholder="0.00"
                      value={totalAmount || ''}
                      onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/10 transition-all outline-none"
                    />
                  </div>
                </label>
              </div>
            </div>

            <div className="mt-12 flex items-center justify-center gap-4 pb-12">
              <button 
                type="button" 
                onClick={onClose}
                disabled={isPending}
                className="px-6 py-3.5 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 rounded-full"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={isPending}
                className="bg-primary hover:bg-primary-dim text-white font-black px-12 py-3.5 rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 text-xs uppercase tracking-widest disabled:opacity-50 disabled:scale-100"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Crear Lead
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
