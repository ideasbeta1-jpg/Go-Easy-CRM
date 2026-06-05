'use client'

import { useEffect, useState, Suspense } from 'react'
import { sendGAEvent } from '@next/third-parties/google'
import { useRouter, useSearchParams } from 'next/navigation'

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
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const [today, setToday] = useState('')

  useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, '0')
    const d = new Date()
    setToday(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
  }, [])

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
    source: 'landing_puerto_rico_v2',
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

  const scrollToForm = (categoryHint?: string) => {
    if (categoryHint) {
      const match = categories.find(c => c.name.toLowerCase().includes(categoryHint))
      if (match) set('category_id', match.id)
    }
    document.getElementById('form-container')?.scrollIntoView({ behavior: 'smooth' })
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
        body: JSON.stringify({ ...form, phone: finalPhone, pickup_date, return_date }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error enviando solicitud.')
      sendGAEvent('event', 'generate_lead', { category: selectedCategory?.name, currency: 'USD' })
      router.push(`/typ?name=${encodeURIComponent(form.first_name)}&id=${data.id}`)
    } catch (e: any) {
      setError(e.message || 'Error inesperado.')
    } finally {
      setSubmitting(false)
    }
  }

  const faqs = [
    {
      q: '¿Necesito tarjeta de crédito para reservar?',
      a: 'Solo para confirmar la reserva. Al recoger el auto en MCO necesitarás una tarjeta a tu nombre para el depósito, igual que en cualquier renta.',
    },
    {
      q: '¿Qué seguro está incluido?',
      a: 'La cobertura básica requerida en Florida va incluida en tu tarifa. Si quieres cobertura adicional, te la ofrecemos sin presión — siempre con precio claro antes de confirmar.',
    },
    {
      q: '¿Qué pasa si necesito cancelar?',
      a: 'Puedes cancelar sin costo hasta 72 horas antes de tu fecha de recogido. Si es más cerca de la fecha, tu asesor busca la mejor solución contigo.',
    },
    {
      q: '¿Cuánto tiempo tarda la confirmación?',
      a: 'Menos de 30 minutos en horario laboral. Tu asesor te escribe directo por WhatsApp con todos los detalles cerrados.',
    },
    {
      q: '¿Mi licencia de Puerto Rico es válida en Florida?',
      a: 'Sí. Tu licencia de Puerto Rico es completamente válida para rentar y conducir en Florida.',
    },
    {
      q: '¿Dónde recojo el auto en Orlando?',
      a: 'Te lo indicamos exactamente por WhatsApp una vez confirmada tu reserva. Coordinamos el punto más conveniente según tu vuelo y hotel.',
    },
  ]

  return (
    <div className="bg-gray-50 text-gray-900 antialiased flex flex-col min-h-screen font-sans">
      <style jsx global>{`
        :root {
          --brand-primary: #1e3a8a;
          --brand-accent: #FFD200;
          --brand-accent-hover: #e6bd00;
          --text-light: #f8fafc;
        }
        .text-brand-accent { color: var(--brand-accent); }
        .bg-brand-accent { background-color: var(--brand-accent); }
        .font-radio-canada { font-family: var(--font-radio-canada), sans-serif; }
      `}</style>

      <main className="flex-grow">

        {/* ── HERO ── */}
        <section className="relative w-full min-h-screen flex items-center py-20 overflow-hidden bg-black">
          <div className="absolute inset-0 z-0">
            <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: "url('/images/hero-goeasy.png')" }} />
            <div className="absolute inset-0 bg-[#020202] opacity-65" />
          </div>

          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Hero copy */}
            <div className="text-white space-y-6">
              <div className="inline-flex items-center gap-2 bg-yellow-400/20 border border-yellow-400/40 px-3 py-1.5 rounded-full text-sm text-yellow-300 font-medium">
                <span className="w-2 h-2 bg-[#FFD200] rounded-full animate-pulse inline-block"></span>
                Disponibilidad limitada · Temporada alta en Orlando
              </div>
              {/* PUV */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight font-radio-canada">
                Renta tu auto en Orlando —<br />
                <span className="text-[#FFD200]">precio confirmado antes de subir al avión.</span>
              </h1>
              {/* PUR */}
              <h2 className="text-xl md:text-2xl font-medium leading-snug font-radio-canada text-gray-200">
                Te confirmamos por WhatsApp en menos de 30 minutos. Lo que acordamos desde Puerto Rico es lo que pagas en MCO.
              </h2>
              <p className="text-lg text-gray-300 font-radio-canada">
                Sin letra pequeña. Sin sorpresas en el mostrador. Sin negociar en inglés.
              </p>

              {/* Trust badges — desktop */}
              <div className="hidden lg:flex flex-col gap-4 mt-8">
                <div className="flex items-center gap-3">
                  <div className="text-[#FFD200]"><i className="fas fa-shield-alt text-2xl"></i></div>
                  <div>
                    <h4 className="font-bold text-white text-lg">Seguro incluido</h4>
                    <p className="text-sm text-gray-300">Sin cargos extra al recoger el auto en MCO.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-[#FFD200]"><i className="fas fa-comments text-2xl"></i></div>
                  <div>
                    <h4 className="font-bold text-white text-lg">Atendido en español desde PR</h4>
                    <p className="text-sm text-gray-300">Cerramos todo antes de que vueles.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-[#FFD200]"><i className="fas fa-lock text-2xl"></i></div>
                  <div>
                    <h4 className="font-bold text-white text-lg">Pago 100% seguro</h4>
                    <p className="text-sm text-gray-300">Reserva con tranquilidad total.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div id="form-container" className="bg-white rounded-[15px] shadow-2xl p-6 md:p-8 w-full max-w-lg mx-auto relative z-20 mt-8 lg:mt-0">
              <div className="flex items-center gap-2 mb-6">
                <div className={`flex-1 h-2 rounded-full transition-colors ${step >= 1 ? 'bg-[#FFD200]' : 'bg-gray-200'}`} />
                <div className={`flex-1 h-2 rounded-full transition-colors ${step >= 2 ? 'bg-[#FFD200]' : 'bg-gray-200'}`} />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {step === 1 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <h3 className="text-2xl font-bold text-gray-900 mb-1 font-radio-canada">Reserva tu auto en Orlando</h3>
                    <p className="text-sm text-gray-500 mb-6">Disponibilidad confirmada en menos de 30 min.</p>

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
                          required type="date" value={form.pickup_date} min={today}
                          onChange={(e) => {
                            const newPickup = e.target.value
                            const d = new Date(newPickup + 'T12:00:00')
                            d.setDate(d.getDate() + 3)
                            const newReturn = d.toISOString().split('T')[0]
                            setForm(prev => ({ ...prev, pickup_date: newPickup, return_date: newReturn }))
                          }}
                          className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#FFD200] focus:border-[#FFD200] py-3 px-4 bg-gray-50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">Fecha de devolución</label>
                        <input
                          required type="date" value={form.return_date} min={form.pickup_date || today}
                          onChange={(e) => set('return_date', e.target.value)}
                          className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#FFD200] focus:border-[#FFD200] py-3 px-4 bg-gray-50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">Hora llegada</label>
                        <select required value={form.pickup_time} onChange={(e) => set('pickup_time', e.target.value)} className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#FFD200] focus:border-[#FFD200] py-3 px-4 bg-gray-50">
                          <option value="">Hora</option>
                          {['8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM','7:00 PM','8:00 PM'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">Hora devolución</label>
                        <select required value={form.return_time} onChange={(e) => set('return_time', e.target.value)} className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#FFD200] focus:border-[#FFD200] py-3 px-4 bg-gray-50">
                          <option value="">Hora</option>
                          {['8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM','7:00 PM','8:00 PM'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>

                    <button
                      type="button" onClick={handleNext}
                      className="w-full bg-[#1e3a8a] text-white font-bold text-lg py-4 px-4 rounded-xl shadow-md transition-transform hover:scale-[1.02] mt-6 flex justify-center items-center gap-2"
                    >
                      Ver disponibilidad
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-2">Sin cargos hasta confirmar · Cancela gratis</p>
                  </div>
                )}

                {step === 2 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center gap-2 mb-4">
                      <button type="button" onClick={() => setStep(1)} className="text-gray-500 hover:text-gray-900 flex items-center gap-1 text-sm font-bold transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        Editar solicitud
                      </button>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1 font-radio-canada">Último paso — ya casi</h3>
                    <p className="text-sm text-gray-500 mb-6">En menos de 30 min te confirmamos por WhatsApp.</p>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">Nombre</label>
                        <input required type="text" placeholder="Juan" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#FFD200] focus:border-[#FFD200] py-3 px-4 bg-gray-50" />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">Apellido</label>
                        <input required type="text" placeholder="Pérez" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#FFD200] focus:border-[#FFD200] py-3 px-4 bg-gray-50" />
                      </div>
                    </div>

                    <div className="space-y-2 mt-4">
                      <label className="block text-sm font-bold text-gray-700">Email</label>
                      <input required type="email" placeholder="tu@email.com" value={form.email} onChange={(e) => set('email', e.target.value)} className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#FFD200] focus:border-[#FFD200] py-3 px-4 bg-gray-50" />
                    </div>

                    <div className="space-y-2 mt-4">
                      <label className="block text-sm font-bold text-gray-700">Teléfono / WhatsApp</label>
                      <div className="flex gap-2">
                        <select required value={form.country_code} onChange={(e) => set('country_code', e.target.value)} className="block w-28 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#FFD200] focus:border-[#FFD200] py-3 px-2 bg-gray-50">
                          <option value="+1">🇵🇷 +1</option>
                          <option value="+1">🇺🇸 +1</option>
                          <option value="+57">🇨🇴 +57</option>
                          <option value="+52">🇲🇽 +52</option>
                          <option value="+1">🇩🇴 +1</option>
                          <option value="+54">🇦🇷 +54</option>
                          <option value="+56">🇨🇱 +56</option>
                          <option value="+34">🇪🇸 +34</option>
                        </select>
                        <input required type="tel" placeholder="(787) 111-4444" value={form.phone} onChange={(e) => set('phone', e.target.value)} className="block flex-1 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#FFD200] focus:border-[#FFD200] py-3 px-4 bg-gray-50" />
                      </div>
                    </div>

                    <button
                      type="submit" disabled={submitting}
                      className="w-full bg-[#FFD200] hover:bg-[#e6bd00] text-gray-900 font-extrabold text-lg py-4 px-4 rounded-xl shadow-lg transition-transform hover:scale-[1.02] mt-6 flex justify-center items-center gap-2 disabled:opacity-70"
                    >
                      {submitting ? 'Procesando...' : 'Confirmar mi reserva'}
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                )}

                {error && <p className="text-red-600 text-sm font-bold bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
              </form>
            </div>

            {/* Trust badges — mobile */}
            <div className="lg:hidden flex flex-col gap-6 mt-8">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="text-[#FFD200]"><i className="fas fa-shield-alt text-3xl"></i></div>
                <div>
                  <h4 className="font-bold text-white text-lg">Seguro incluido</h4>
                  <p className="text-sm text-gray-300">Sin cargos extra al recoger el auto en MCO.</p>
                </div>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="text-[#FFD200]"><i className="fas fa-comments text-3xl"></i></div>
                <div>
                  <h4 className="font-bold text-white text-lg">Atendido en español desde PR</h4>
                  <p className="text-sm text-gray-300">Cerramos todo antes de que vueles.</p>
                </div>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="text-[#FFD200]"><i className="fas fa-lock text-3xl"></i></div>
                <div>
                  <h4 className="font-bold text-white text-lg">Pago 100% seguro</h4>
                  <p className="text-sm text-gray-300">Reserva con tranquilidad total.</p>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── NÚMEROS DE CREDIBILIDAD ── */}
        <section className="py-10 px-4 bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-4xl font-extrabold text-[#1e3a8a] font-radio-canada">10+</p>
              <p className="text-sm text-gray-500 mt-1">familias ya viajaron con nosotros</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold text-[#1e3a8a] font-radio-canada">&lt;30 min</p>
              <p className="text-sm text-gray-500 mt-1">respuesta garantizada por WhatsApp</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold text-[#1e3a8a] font-radio-canada">7 días</p>
              <p className="text-sm text-gray-500 mt-1">atención en español</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold text-[#1e3a8a] font-radio-canada">100%</p>
              <p className="text-sm text-gray-500 mt-1">precio confirmado antes de volar</p>
            </div>
          </div>
        </section>

        {/* ── QUÉ PASA DESPUÉS DE RESERVAR ── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-4 font-radio-canada">
              Reservas hoy. Aterrizas tranquilo.
            </h2>
            <p className="text-center text-gray-500 mb-14 text-lg">Así funciona todo, paso a paso.</p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                {
                  num: '1',
                  title: 'Llenas el formulario',
                  desc: 'Elige fechas, vehículo y ubicación. Toma 2 minutos desde donde estés en Puerto Rico.',
                  time: 'Ahora mismo',
                },
                {
                  num: '2',
                  title: 'Tu asesor te escribe',
                  desc: 'En menos de 30 minutos recibes WhatsApp con tu precio final cerrado. Sin sorpresas.',
                  time: 'En menos de 30 min',
                },
                {
                  num: '3',
                  title: 'Confirmas y pagas',
                  desc: 'Todo resuelto antes de salir de Puerto Rico. Pago seguro, reserva confirmada.',
                  time: 'Antes de volar',
                },
                {
                  num: '4',
                  title: 'Aterrizas en MCO y conduces',
                  desc: 'Tu auto te espera. Sin filas, sin negociar en inglés. Directo a disfrutar Orlando.',
                  time: 'Al llegar a Orlando',
                },
              ].map((step, i) => (
                <div key={i} className="relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
                  <div className="w-10 h-10 rounded-full bg-[#FFD200] flex items-center justify-center font-extrabold text-gray-900 text-lg mb-4 font-radio-canada">
                    {step.num}
                  </div>
                  <p className="text-xs font-bold text-[#1e3a8a] uppercase tracking-wider mb-2">{step.time}</p>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 font-radio-canada">{step.title}</h3>
                  <p className="text-sm text-gray-500 flex-grow">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── COMPARACIÓN ── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-3 font-radio-canada">
              Lo que te cobran en MCO vs. lo que pagas con Go Easy.
            </h2>
            <p className="text-center text-gray-500 mb-12 text-lg">Hertz, Enterprise y Budget no quieren que veas esta tabla.</p>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              <div className="grid grid-cols-3 bg-gray-50 p-4 border-b border-gray-200">
                <div className="font-bold text-gray-500 text-sm tracking-wider uppercase">Concepto</div>
                <div className="font-bold text-center text-gray-500 text-sm tracking-wider uppercase">Hertz / Enterprise</div>
                <div className="font-bold text-center text-[#1e3a8a] text-sm tracking-wider uppercase">Go Easy</div>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  { label: 'Seguro básico contra robo y accidente', them: 'Extra $25–$40/día', us: true },
                  { label: 'Seguro contra terceros', them: 'Extra o no incluye', us: true },
                  { label: 'Millaje ilimitado', them: 'Con límite o varía', us: true },
                  { label: 'Conductor adicional', them: '$13–$15/día', us: true },
                  { label: 'Tasas y fees al recoger', them: '???', us: '$0', highlight: true },
                  { label: 'Asistencia en carretera', them: 'Plan aparte $$', us: true },
                  { label: 'Atención en español desde PR', them: false, us: true },
                ].map((row, i) => (
                  <div key={i} className={`grid grid-cols-3 p-4 items-center hover:bg-gray-50 transition-colors ${row.highlight ? 'bg-blue-50/50' : ''}`}>
                    <div className={`${row.highlight ? 'font-bold' : 'font-medium'} text-gray-900`}>{row.label}</div>
                    <div className="text-center flex justify-center">
                      {row.them === false
                        ? <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                        : <span className={`font-medium ${row.highlight ? 'text-red-600 font-bold' : 'text-red-500'}`}>{row.them}</span>
                      }
                    </div>
                    <div className="text-center flex justify-center">
                      {row.us === true
                        ? <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        : <span className="text-[#1e3a8a] font-bold text-lg">{row.us}</span>
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── SECCIÓN DOLOR ── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#1e3a8a] text-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-3 font-radio-canada">
              Lo que pasa cuando reservas con las cadenas gringas.
            </h2>
            <p className="text-center text-blue-200 mb-12 text-lg">¿Te suena familiar?</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  icon: '💸',
                  title: 'El precio online no es el precio real',
                  desc: 'Llegas al mostrador y aparecen fees, taxes y cargos que "no estaban incluidos". Sales pagando $150–$200 más de lo que viste en pantalla.',
                },
                {
                  icon: '🤷',
                  title: 'El agente habla rápido en inglés',
                  desc: 'Te ofrecen seguros, upgrades y planes adicionales. No entiendes bien qué estás firmando. Dices que sí por no hacer el ridículo.',
                },
                {
                  icon: '⏳',
                  title: 'Fila de 45 minutos al llegar a MCO',
                  desc: 'Llegas cansado después del vuelo y todavía tienes que esperar en fila antes de poder salir con el auto.',
                },
                {
                  icon: '😤',
                  title: '¿Conductor adicional? $15 más por día.',
                  desc: 'Querías que tu pareja también manejara. Resulta que eso no estaba incluido y suman $75 extra por 5 días.',
                },
              ].map((item, i) => (
                <div key={i} className="bg-white/10 border border-white/20 rounded-2xl p-6">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <h3 className="text-lg font-bold mb-2 font-radio-canada">{item.title}</h3>
                  <p className="text-blue-100 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            <p className="text-center text-white/60 mt-10 text-sm">Con Go Easy todo eso queda resuelto antes de que salgas de Puerto Rico.</p>
          </div>
        </section>

        {/* ── FLOTA ── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-4 font-radio-canada">Nuestra flota en Orlando</h2>
            <p className="text-center text-gray-500 mb-12 text-lg">Todos los vehículos incluyen seguro, millas ilimitadas y conductor adicional gratis.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  name: 'SUV',
                  price: 'Desde $12/día',
                  img: '/images/suv-pr.jpg',
                  desc: 'El equilibrio perfecto para familias. Altura, espacio y comodidad para moverse por Orlando sin que nadie se sienta apretado — con las maletas de todos adentro.',
                  specs: [{ icon: 'fa-suitcase', label: '4 Maletas' }, { icon: 'fa-tachometer-alt', label: 'Millas ilimitadas' }, { icon: 'fa-wind', label: 'Aire acond.' }, { icon: 'fa-user', label: '5 Pasajeros' }],
                  hint: 'suv',
                },
                {
                  name: 'MINIVAN',
                  price: 'Desde $19/día',
                  img: '/images/minivan-pr.jpg',
                  desc: '¿Vienen todos? Esta es tu opción. Espacio real para 7 personas y su equipaje, ideal para grupos que quieren hacer Disney, Universal y la playa sin dividirse.',
                  specs: [{ icon: 'fa-suitcase', label: '4 Maletas' }, { icon: 'fa-tachometer-alt', label: 'Millas ilimitadas' }, { icon: 'fa-wind', label: 'Aire acond.' }, { icon: 'fa-user', label: '7 Pasajeros' }],
                  hint: 'minivan',
                },
                {
                  name: 'MIDSIZE',
                  price: 'Desde $10/día',
                  img: '/images/midsize-pr.jpg',
                  desc: 'Para parejas o viajes cortos. Fácil de estacionar, económico en gasolina y perfectamente cómodo para recorrer Orlando en dos.',
                  specs: [{ icon: 'fa-suitcase', label: '2 Maletas' }, { icon: 'fa-tachometer-alt', label: 'Millas ilimitadas' }, { icon: 'fa-wind', label: 'Aire acond.' }, { icon: 'fa-user', label: '5 Pasajeros' }],
                  hint: 'midsize',
                },
              ].map((vehicle) => (
                <div key={vehicle.name} className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-gray-900 font-radio-canada">{vehicle.name}</h3>
                    <span className="text-sm font-extrabold text-[#1e3a8a] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">{vehicle.price}</span>
                  </div>
                  <div className="h-48 relative mb-4 rounded-xl overflow-hidden bg-gray-100">
                    <img src={vehicle.img} alt={vehicle.name} className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                  <p className="text-gray-600 mb-6 flex-grow">{vehicle.desc}</p>
                  <div className="border-t border-gray-100 pt-4 mb-6 grid grid-cols-2 gap-y-4 text-sm font-medium text-gray-700">
                    {vehicle.specs.map(s => (
                      <div key={s.label} className="flex items-center gap-2">
                        <i className={`fas ${s.icon} text-gray-400`}></i> {s.label}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => scrollToForm(vehicle.hint)}
                    className="w-full bg-[#1e3a8a] text-white font-bold py-3 rounded-xl hover:bg-blue-900 transition-colors"
                  >
                    Reservar este vehículo
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TESTIMONIOS ── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#1e3a8a]">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3 font-radio-canada">
              Lo dicen familias que ya viajaron con nosotros.
            </h2>
            <p className="text-blue-200 mb-12 text-lg">Sus palabras, sin editar.</p>

            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={i} className="w-[calc(50%-0.5rem)] md:w-[calc(25%-1.125rem)] max-w-[280px]">
                  <img
                    src={`/images/review-${i}.jpeg`}
                    alt={`Testimonio ${i}`}
                    className="w-full h-auto rounded-xl shadow-lg hover:scale-[1.02] transition-transform duration-300 bg-white"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-extrabold text-center text-gray-900 mb-4 font-radio-canada">
              Lo que todos preguntan antes de reservar.
            </h2>
            <p className="text-center text-gray-500 mb-12 text-lg">Sin vueltas. Respuestas directas.</p>

            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-bold text-gray-900 pr-4">{faq.q}</span>
                    <svg
                      className={`w-5 h-5 text-[#1e3a8a] flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                    >
                      <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-5 text-gray-600 border-t border-gray-100 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <button
                onClick={() => scrollToForm()}
                className="inline-flex items-center gap-2 bg-[#1e3a8a] text-white font-bold text-lg py-4 px-8 rounded-xl shadow-md transition-transform hover:scale-[1.02]"
              >
                Ya tengo todo claro — reservar ahora
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </div>
        </section>

        {/* ── CTA FINAL ── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 border-t border-gray-100">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 font-radio-canada">
              Tu viaje a Orlando empieza aquí, desde Puerto Rico.
            </h2>
            <p className="text-gray-600 text-lg mb-8">
              No llegues a MCO a improvisar con las cadenas gringas. Reserva ahora, cierra tu precio en español y aterriza con todo resuelto.
            </p>
            <button
              onClick={() => scrollToForm()}
              className="inline-flex items-center gap-3 bg-[#FFD200] hover:bg-[#e6bd00] text-gray-900 font-extrabold text-xl py-5 px-10 rounded-2xl shadow-xl transition-transform hover:scale-[1.02]"
            >
              Reservar mi auto ahora
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <p className="text-sm text-gray-400 mt-5">
              Cancela gratis hasta 72 horas antes &nbsp;·&nbsp; Precio confirmado por WhatsApp &nbsp;·&nbsp; Pago seguro con Stripe
            </p>
            <div className="mt-8 flex justify-center">
              <img src="/images/garantía de pago stripe.png" alt="Pago seguro Stripe" className="h-16 w-auto object-contain opacity-80" />
            </div>
          </div>
        </section>

      </main>

      <footer className="bg-gray-900 text-gray-400 py-12 text-center">
        <p>© {new Date().getFullYear()} {settings?.crm_name || 'Go Easy Puerto Rico'}. Todos los derechos reservados.</p>
      </footer>

      {/* Floating WhatsApp button */}
      <a
        href="https://wa.me/17870000000"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform"
        aria-label="Contactar por WhatsApp"
      >
        <i className="fab fa-whatsapp text-3xl"></i>
      </a>

      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    </div>
  )
}

export default function LandingPageV2() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Cargando...</div>}>
      <LandingContent />
    </Suspense>
  )
}
