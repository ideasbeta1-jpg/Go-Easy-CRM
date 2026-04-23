'use client'

import { useEffect, useState, Suspense } from 'react'
import { sendGAEvent } from '@next/third-parties/google'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

interface Category {
  id: string
  name: string
  daily_price: number
  image_url?: string
  description?: string
}

interface Location {
  id: string
  name: string
  code: string
}

interface SystemSettings {
  crm_name: string
  logo_url?: string
  favicon_url?: string
  crm_tagline?: string
  updated_at?: string
}

function LandingContent() {
  const [categories, setCategories] = useState<Category[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)
  const router = useRouter()
  const searchParams = useSearchParams()

  const today = new Date().toISOString().split('T')[0]
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const [form, setForm] = useState({
    category_id: '',
    pickup_location: '',
    pickup_location_id: '',
    return_location: '',
    return_location_id: '',
    pickup_date: '',
    pickup_time: '',
    return_date: '',
    return_time: '',
    country_code: '+1',
    phone: '',
    email: '',
    first_name: '',
    last_name: '',
    utm_source: searchParams.get('utm_source') || '',
    utm_medium: searchParams.get('utm_medium') || '',
    utm_campaign: searchParams.get('utm_campaign') || '',
    utm_term: searchParams.get('utm_term') || '',
    utm_content: searchParams.get('utm_content') || '',
  })

  useEffect(() => {
    fetch('/api/public-data')
      .then(r => r.json())
      .then(data => {
        setCategories(data.categories || [])
        setLocations(data.locations || [])
        setSettings(data.settings || null)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (settings?.favicon_url) {
      const v = settings.updated_at ? new Date(settings.updated_at).getTime() : Date.now()
      const faviconUrl = `${settings.favicon_url}?v=${v}`
      
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']")
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.getElementsByTagName('head')[0].appendChild(link)
      }
      link.href = faviconUrl

      let appleLink: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']")
      if (!appleLink) {
        appleLink = document.createElement('link')
        appleLink.rel = 'apple-touch-icon'
        document.getElementsByTagName('head')[0].appendChild(appleLink)
      }
      appleLink.href = faviconUrl
    }
  }, [settings])

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }))

  const selectedCategory = categories.find(c => c.id === form.category_id)

  const validateStep1 = () => {
    if (!form.category_id || !form.pickup_location_id || !form.return_location_id || !form.pickup_date || !form.pickup_time || !form.return_date || !form.return_time) {
      setError('Por favor completa todos los datos de tu viaje.')
      return false
    }
    setError('')
    return true
  }

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2)
      document.getElementById('form-container')?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.first_name || !form.last_name || !form.phone || !form.email) {
      setError('Por favor completa todos los campos obligatorios.')
      return
    }

    setSubmitting(true)
    try {
      const finalPhone = `${form.country_code}${form.phone.replace(/\D/g, '')}`

      const to24h = (timeStr: string) => {
        const [time, modifier] = timeStr.split(' ')
        let [hours, minutes] = time.split(':')
        if (hours === '12') hours = '00'
        if (modifier === 'PM') hours = String(parseInt(hours, 10) + 12)
        return `${hours.padStart(2, '0')}:${minutes}`
      }

      const pickup_date = `${form.pickup_date}T${to24h(form.pickup_time)}:00`
      const return_date = `${form.return_date}T${to24h(form.return_time)}:00`

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          phone: finalPhone,
          pickup_date,
          return_date,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error enviando solicitud.')
      
      sendGAEvent('event', 'generate_lead', {
        category: selectedCategory?.name,
        currency: 'USD'
      })

      router.push(`/typ?name=${encodeURIComponent(form.first_name)}&id=${data.id}`)
    } catch (e: any) {
      setError(e.message || 'Error inesperado.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-gray-50 text-gray-900 antialiased flex flex-col min-h-screen font-sans">
      <style jsx global>{`
        :root {
          --brand-primary: #1e3a8a; /* Deep Blue */
          --brand-accent: #FFD200; /* Yellow from design */
          --brand-accent-hover: #e6bd00;
          --text-light: #f8fafc;
        }
        .text-brand-accent { color: var(--brand-accent); }
        .bg-brand-accent { background-color: var(--brand-accent); }
        .hover\\:bg-brand-accent-hover:hover { background-color: var(--brand-accent-hover); }
        .font-radio-canada { font-family: var(--font-radio-canada), sans-serif; }
      `}</style>
      
      <main className="flex-grow">
        {/* HERO SECTION */}
        <section className="relative w-full min-h-screen flex items-center py-20 overflow-hidden bg-black">
          {/* Background Image overlay */}
          <div className="absolute inset-0 z-0">
            <div 
              className="w-full h-full bg-cover bg-center" 
              style={{ backgroundImage: "url('/images/hero-goeasy.png')" }}
            >
            </div>
            {/* Overlay from Elementor: #020202 at 65% opacity */}
            <div className="absolute inset-0 bg-[#020202] opacity-65"></div>
          </div>
          
          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Hero Content */}
            <div className="text-white space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight font-radio-canada">
                Tu auto en Puerto Rico está aquí. <br/><span className="text-[#FFD200]">Sin letras pequeñas.</span>
              </h1>
              <h2 className="text-xl md:text-2xl lg:text-3xl font-medium leading-snug font-radio-canada text-gray-200">
                Olvídate de las filas interminables y los cargos sorpresa en el mostrador.
              </h2>
              <p className="text-lg md:text-xl text-gray-300 font-radio-canada">
                En Go Easy, el precio que ves es el precio que pagas. Punto.
              </p>

              {/* Trust badges inline on desktop */}
              <div className="hidden lg:flex flex-col gap-4 mt-8">
                <div className="flex items-center gap-3">
                  <div className="text-[#FFD200]"><i className="fas fa-shield-alt text-2xl"></i></div>
                  <div>
                    <h4 className="font-bold text-white text-lg">Seguro incluido</h4>
                    <p className="text-sm text-gray-300">Nuestras tarifas incluyen la cobertura necesaria.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-[#FFD200]"><i className="fas fa-user-friends text-2xl"></i></div>
                  <div>
                    <h4 className="font-bold text-white text-lg">Trato 100% Humano</h4>
                    <p className="text-sm text-gray-300">Asesor personal asignado por WhatsApp.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-[#FFD200]"><i className="fas fa-lock text-2xl"></i></div>
                  <div>
                    <h4 className="font-bold text-white text-lg">Pago seguro</h4>
                    <p className="text-sm text-gray-300">Reserva con total tranquilidad.</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Form */}
            <div id="form-container" className="bg-white rounded-[15px] shadow-2xl p-6 md:p-8 w-full max-w-lg mx-auto relative z-20 mt-8 lg:mt-0">
              <div className="flex items-center gap-2 mb-6">
                <div className={`flex-1 h-2 rounded-full transition-colors ${step >= 1 ? 'bg-[#FFD200]' : 'bg-gray-200'}`}></div>
                <div className={`flex-1 h-2 rounded-full transition-colors ${step >= 2 ? 'bg-[#FFD200]' : 'bg-gray-200'}`}></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {step === 1 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 font-radio-canada">Cotiza tu vehículo</h3>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-700">Tipo de vehículo</label>
                      <select 
                        required
                        value={form.category_id}
                        onChange={(e) => set('category_id', e.target.value)}
                        className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#FFD200] focus:border-[#FFD200] py-3 px-4 bg-gray-50"
                      >
                        <option value="">Selecciona tipo</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">Ciudad de llegada</label>
                        <select 
                          required
                          value={form.pickup_location_id}
                          onChange={(e) => {
                            const loc = locations.find(l => l.id === e.target.value)
                            setForm(f => ({ ...f, pickup_location_id: e.target.value, pickup_location: loc?.name || '' }))
                          }}
                          className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#FFD200] focus:border-[#FFD200] py-3 px-4 bg-gray-50"
                        >
                          <option value="">Ciudad</option>
                          {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">Ciudad de devolución</label>
                        <select 
                          required
                          value={form.return_location_id}
                          onChange={(e) => {
                            const loc = locations.find(l => l.id === e.target.value)
                            setForm(f => ({ ...f, return_location_id: e.target.value, return_location: loc?.name || '' }))
                          }}
                          className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#FFD200] focus:border-[#FFD200] py-3 px-4 bg-gray-50"
                        >
                          <option value="">Ciudad</option>
                          {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">Fecha de llegada</label>
                        <input 
                          required
                          type="date" 
                          value={form.pickup_date}
                          min={today}
                          onChange={(e) => {
                            const newPickup = e.target.value;
                            const d = new Date(newPickup + 'T12:00:00');
                            d.setDate(d.getDate() + 3);
                            const newReturn = d.toISOString().split('T')[0];
                            setForm(prev => ({ 
                              ...prev, 
                              pickup_date: newPickup,
                              return_date: newReturn 
                            }));
                          }}
                          className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#FFD200] focus:border-[#FFD200] py-3 px-4 bg-gray-50" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">Fecha de devolución</label>
                        <input 
                          required
                          type="date" 
                          value={form.return_date}
                          min={form.pickup_date || today}
                          onChange={(e) => set('return_date', e.target.value)}
                          className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#FFD200] focus:border-[#FFD200] py-3 px-4 bg-gray-50" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">Hora llegada</label>
                        <select 
                          required
                          value={form.pickup_time}
                          onChange={(e) => set('pickup_time', e.target.value)}
                          className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#FFD200] focus:border-[#FFD200] py-3 px-4 bg-gray-50"
                        >
                          <option value="">Hora</option>
                          {['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM'].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">Hora devolución</label>
                        <select 
                          required
                          value={form.return_time}
                          onChange={(e) => set('return_time', e.target.value)}
                          className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#FFD200] focus:border-[#FFD200] py-3 px-4 bg-gray-50"
                        >
                          <option value="">Hora</option>
                          {['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM'].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <button 
                      type="button" 
                      onClick={handleNext}
                      className="w-full bg-gray-900 text-white font-bold text-lg py-4 px-4 rounded-xl shadow-md transition-transform hover:scale-[1.02] mt-6 flex justify-center items-center gap-2"
                    >
                      Cotizar ahora
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round"></path>
                      </svg>
                    </button>
                  </div>
                )}

                {step === 2 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center gap-2 mb-4">
                       <button 
                         type="button" 
                         onClick={() => setStep(1)}
                         className="text-gray-500 hover:text-gray-900 flex items-center gap-1 text-sm font-bold transition-colors"
                       >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                           <path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" strokeLinecap="round" strokeLinejoin="round"></path>
                         </svg>
                         Editar solicitud
                       </button>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 font-radio-canada">Último paso</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">Nombre</label>
                        <input 
                          required
                          type="text" 
                          placeholder="Juan" 
                          value={form.first_name}
                          onChange={(e) => set('first_name', e.target.value)}
                          className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#FFD200] focus:border-[#FFD200] py-3 px-4 bg-gray-50" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">Apellido</label>
                        <input 
                          required
                          type="text" 
                          placeholder="Pérez" 
                          value={form.last_name}
                          onChange={(e) => set('last_name', e.target.value)}
                          className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#FFD200] focus:border-[#FFD200] py-3 px-4 bg-gray-50" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2 mt-4">
                      <label className="block text-sm font-bold text-gray-700">Email</label>
                      <input 
                        required
                        type="email" 
                        placeholder="tu@email.com" 
                        value={form.email}
                        onChange={(e) => set('email', e.target.value)}
                        className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#FFD200] focus:border-[#FFD200] py-3 px-4 bg-gray-50" 
                      />
                    </div>

                    <div className="space-y-2 mt-4">
                      <label className="block text-sm font-bold text-gray-700">Teléfono / Whatsapp</label>
                      <div className="flex gap-2">
                        <select 
                          required
                          value={form.country_code}
                          onChange={(e) => set('country_code', e.target.value)}
                          className="block w-28 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#FFD200] focus:border-[#FFD200] py-3 px-2 bg-gray-50"
                        >
                          <option value="+1">🇵🇷 +1</option>
                          <option value="+1">🇺🇸 +1</option>
                          <option value="+57">🇨🇴 +57</option>
                          <option value="+52">🇲🇽 +52</option>
                          <option value="+1">🇩🇴 +1</option>
                          <option value="+54">🇦🇷 +54</option>
                          <option value="+56">🇨🇱 +56</option>
                          <option value="+34">🇪🇸 +34</option>
                        </select>
                        <input 
                          required
                          type="tel" 
                          placeholder="(787) 111-4444" 
                          value={form.phone}
                          onChange={(e) => set('phone', e.target.value)}
                          className="block flex-1 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#FFD200] focus:border-[#FFD200] py-3 px-4 bg-gray-50" 
                        />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={submitting}
                      className="w-full bg-[#FFD200] hover:bg-[#e6bd00] text-gray-900 font-extrabold text-lg py-4 px-4 rounded-xl shadow-lg transition-transform hover:scale-[1.02] mt-6 flex justify-center items-center gap-2 disabled:opacity-70"
                    >
                      {submitting ? 'Procesando...' : 'Finalizar Cotización'}
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round"></path>
                      </svg>
                    </button>
                  </div>
                )}
                {error && <p className="text-red-600 text-sm font-bold bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
              </form>
            </div>

            {/* Mobile Trust Badges */}
            <div className="lg:hidden flex flex-col gap-6 mt-8">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="text-[#FFD200]"><i className="fas fa-shield-alt text-3xl"></i></div>
                <div>
                  <h4 className="font-bold text-white text-lg">Seguro incluido</h4>
                  <p className="text-sm text-gray-300">Nuestras tarifas incluyen la cobertura necesaria.</p>
                </div>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="text-[#FFD200]"><i className="fas fa-user-friends text-3xl"></i></div>
                <div>
                  <h4 className="font-bold text-white text-lg">Trato 100% Humano</h4>
                  <p className="text-sm text-gray-300">Asesor personal asignado por WhatsApp.</p>
                </div>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="text-[#FFD200]"><i className="fas fa-lock text-3xl"></i></div>
                <div>
                  <h4 className="font-bold text-white text-lg">Pago seguro</h4>
                  <p className="text-sm text-gray-300">Reserva con total tranquilidad.</p>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* COMPARISON SECTION */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-4 font-radio-canada">Transparencia total.</h2>
            <p className="text-center text-gray-600 mb-12 text-lg">Comparamos para que tú no tengas que adivinar.</p>
            
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              <div className="grid grid-cols-3 bg-gray-50 p-4 border-b border-gray-200">
                <div className="font-bold text-gray-500 text-sm tracking-wider uppercase">Concepto</div>
                <div className="font-bold text-center text-gray-500 text-sm tracking-wider uppercase">Otros</div>
                <div className="font-bold text-center text-[#1e3a8a] text-sm tracking-wider uppercase">GoEasy</div>
              </div>
              
              <div className="divide-y divide-gray-100">
                <div className="grid grid-cols-3 p-4 items-center hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">Seguro básico</div>
                  <div className="text-center text-red-500 font-medium">Extra $$</div>
                  <div className="text-center text-green-500 flex justify-center"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg></div>
                </div>
                <div className="grid grid-cols-3 p-4 items-center hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">Conductor adicional</div>
                  <div className="text-center text-gray-600 font-medium">$15/día</div>
                  <div className="text-center text-green-500 flex justify-center"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg></div>
                </div>
                <div className="grid grid-cols-3 p-4 items-center hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">Millas Ilimitadas</div>
                  <div className="text-center text-gray-600 font-medium">Varía</div>
                  <div className="text-center text-green-500 flex justify-center"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg></div>
                </div>
                <div className="grid grid-cols-3 p-4 items-center hover:bg-gray-50 transition-colors bg-blue-50/50">
                  <div className="font-bold text-gray-900">Costo Oculto</div>
                  <div className="text-center text-red-600 font-bold">???</div>
                  <div className="text-center text-[#1e3a8a] font-bold text-lg">$0</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#1e3a8a] text-white">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white/10 p-8 rounded-2xl border border-white/20 backdrop-blur-sm">
                <div className="text-[#FFD200] mb-4">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"></path></svg>
                </div>
                <h3 className="text-xl font-bold mb-3 font-radio-canada">Cotiza en segundos</h3>
                <p className="text-blue-100">Elige tus fechas y el auto que mejor se adapte a tu grupo. Recibe una tarifa final transparente de inmediato.</p>
              </div>
              
              <div className="bg-white/10 p-8 rounded-2xl border border-white/20 backdrop-blur-sm">
                <div className="text-[#FFD200] mb-4">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"></path></svg>
                </div>
                <h3 className="text-xl font-bold mb-3 font-radio-canada">Asesoría en Minutos</h3>
                <p className="text-blue-100">Un experto se comunicará contigo por WhatsApp para pulir los detalles y asegurar que no te falte nada para tu viaje.</p>
              </div>

              <div className="bg-white/10 p-8 rounded-2xl border border-white/20 backdrop-blur-sm">
                <div className="text-[#FFD200] mb-4">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"></path></svg>
                </div>
                <h3 className="text-xl font-bold mb-3 font-radio-canada">Bájate del Avión y Conduce</h3>
                <p className="text-blue-100">Te recogemos en la puerta del aeropuerto en transporte privado. Sin filas, sin trámites lentos. ¡Directo a la diversión!</p>
              </div>
            </div>
          </div>
        </section>

        {/* FLEET SECTION */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-12 font-radio-canada">Nuestra flota real</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* SUV */}
              <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 font-radio-canada">SUV</h3>
                <div className="h-48 relative mb-4 rounded-xl overflow-hidden bg-gray-100">
                   <img src="/images/suv-pr.jpg" alt="SUV" className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <p className="text-gray-600 mb-6 flex-grow">El equilibrio perfecto para familias pequeñas. Comodidad total para recorrer la isla con la altura y seguridad que necesitas.</p>
                <div className="border-t border-gray-100 pt-4 mb-6 grid grid-cols-2 gap-y-4 text-sm font-medium text-gray-700">
                  <div className="flex items-center gap-2"><i className="fas fa-suitcase text-gray-400"></i> 4 Maletas</div>
                  <div className="flex items-center gap-2"><i className="fas fa-tachometer-alt text-gray-400"></i> Millas ilimitadas</div>
                  <div className="flex items-center gap-2"><i className="fas fa-wind text-gray-400"></i> Aire acond.</div>
                  <div className="flex items-center gap-2"><i className="fas fa-user text-gray-400"></i> 5 Pasajeros</div>
                </div>
                <button onClick={() => {
                  set('category_id', categories.find(c => c.name.toLowerCase().includes('suv'))?.id || categories[0]?.id)
                  document.getElementById('form-container')?.scrollIntoView({ behavior: 'smooth' })
                }} className="w-full bg-[#1e3a8a] text-white font-bold py-3 rounded-xl hover:bg-blue-900 transition-colors">
                  ¡Cotiza ahora!
                </button>
              </div>

              {/* MINIVAN */}
              <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 font-radio-canada">MINIVAN</h3>
                <div className="h-48 relative mb-4 rounded-xl overflow-hidden bg-gray-100">
                   <img src="/images/minivan-pr.jpg" alt="MINIVAN" className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <p className="text-gray-600 mb-6 flex-grow">¿Vienes con todo el corillo? Esta es la opción número uno para grupos grandes. Espacio de sobra para pasear por toda la isla y las maletas de todos.</p>
                <div className="border-t border-gray-100 pt-4 mb-6 grid grid-cols-2 gap-y-4 text-sm font-medium text-gray-700">
                  <div className="flex items-center gap-2"><i className="fas fa-suitcase text-gray-400"></i> 4 Maletas</div>
                  <div className="flex items-center gap-2"><i className="fas fa-tachometer-alt text-gray-400"></i> Millas ilimitadas</div>
                  <div className="flex items-center gap-2"><i className="fas fa-wind text-gray-400"></i> Aire acond.</div>
                  <div className="flex items-center gap-2"><i className="fas fa-user text-gray-400"></i> 7 Pasajeros</div>
                </div>
                <button onClick={() => {
                  set('category_id', categories.find(c => c.name.toLowerCase().includes('minivan') || c.name.toLowerCase().includes('van'))?.id || categories[0]?.id)
                  document.getElementById('form-container')?.scrollIntoView({ behavior: 'smooth' })
                }} className="w-full bg-[#1e3a8a] text-white font-bold py-3 rounded-xl hover:bg-blue-900 transition-colors">
                  ¡Cotiza ahora!
                </button>
              </div>

              {/* MIDSIZE */}
              <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 font-radio-canada">MIDSIZE</h3>
                <div className="h-48 relative mb-4 rounded-xl overflow-hidden bg-gray-100">
                   <img src="/images/midsize-pr.jpg" alt="MIDSIZE" className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <p className="text-gray-600 mb-6 flex-grow">Ideal para parejas o viajes de negocios. Un auto nítido, fácil de estacionar y con el consumo de gasolina más eficiente de nuestra flota.</p>
                <div className="border-t border-gray-100 pt-4 mb-6 grid grid-cols-2 gap-y-4 text-sm font-medium text-gray-700">
                  <div className="flex items-center gap-2"><i className="fas fa-suitcase text-gray-400"></i> 2 Maletas</div>
                  <div className="flex items-center gap-2"><i className="fas fa-tachometer-alt text-gray-400"></i> Millas ilimitadas</div>
                  <div className="flex items-center gap-2"><i className="fas fa-wind text-gray-400"></i> Aire acond.</div>
                  <div className="flex items-center gap-2"><i className="fas fa-user text-gray-400"></i> 5 Pasajeros</div>
                </div>
                <button onClick={() => {
                  set('category_id', categories.find(c => c.name.toLowerCase().includes('midsize') || c.name.toLowerCase().includes('sedan'))?.id || categories[0]?.id)
                  document.getElementById('form-container')?.scrollIntoView({ behavior: 'smooth' })
                }} className="w-full bg-[#1e3a8a] text-white font-bold py-3 rounded-xl hover:bg-blue-900 transition-colors">
                  ¡Cotiza ahora!
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#1e3a8a]">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-12 font-radio-canada">¡Lo que dicen nuestros clientes!</h2>
            
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={i} className="w-[calc(50%-0.5rem)] md:w-[calc(25%-1.125rem)] max-w-[280px]">
                  <img 
                    src={`/images/review-${i}.jpeg`} 
                    alt={`Review ${i}`} 
                    className="w-full h-auto rounded-xl shadow-lg hover:scale-[1.02] transition-transform duration-300 bg-white"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* GUARANTEE */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-t border-gray-100">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex flex-col items-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 font-radio-canada">Respaldo y seguridad</h3>
              <div className="bg-transparent">
                 <img src="/images/garantía de pago stripe.png" alt="Respaldo y seguridad Stripe" className="h-20 md:h-24 w-auto object-contain" />
              </div>
            </div>
          </div>
        </section>

      </main>

      <footer className="bg-gray-900 text-gray-400 py-12 text-center">
        <p>© {new Date().getFullYear()} {settings?.crm_name || 'Go Easy Puerto Rico'}. Todos los derechos reservados.</p>
      </footer>

      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    </div>
  )
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Cargando...</div>}>
      <LandingContent />
    </Suspense>
  )
}
