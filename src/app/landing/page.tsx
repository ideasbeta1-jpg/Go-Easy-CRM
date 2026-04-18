'use client'

import { useEffect, useState } from 'react'
import { sendGAEvent } from '@next/third-parties/google'
import { useRouter } from 'next/navigation'

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
  crm_tagline?: string
  updated_at?: string
}

export default function LandingPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)
  const router = useRouter()

  const today = new Date().toISOString().split('T')[0]
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const [form, setForm] = useState({
    category_id: '',
    pickup_location: '',
    pickup_location_id: '',
    return_location: '',
    return_location_id: '',
    pickup_date: today,
    pickup_time: '10:00 AM',
    return_date: nextWeek,
    return_time: '10:00 AM',
    country_code: '+1',
    phone: '',
    email: '',
    first_name: '',
    last_name: '',
    terms_accepted: false,
  })

  useEffect(() => {
    fetch('/api/public-data')
      .then(r => r.json())
      .then(data => {
        setCategories(data.categories || [])
        setLocations(data.locations || [])
        setSettings(data.settings || null)
        if (data.categories?.length) setForm(f => ({ ...f, category_id: data.categories[0].id }))
        if (data.locations?.length) {
          setForm(f => ({
            ...f,
            pickup_location: data.locations[0].name,
            pickup_location_id: data.locations[0].id,
            return_location: data.locations[0].name,
            return_location_id: data.locations[0].id,
          }))
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (settings?.favicon_url) {
      const v = settings.updated_at ? new Date(settings.updated_at).getTime() : Date.now();
      const faviconUrl = `${settings.favicon_url}?v=${v}`;
      
      // Update or create favicon link
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = faviconUrl;

      // Update apple touch icon
      let appleLink: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
      if (!appleLink) {
        appleLink = document.createElement('link');
        appleLink.rel = 'apple-touch-icon';
        document.getElementsByTagName('head')[0].appendChild(appleLink);
      }
      appleLink.href = faviconUrl;
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
      // Scroll to form top for better UX on mobile
      document.getElementById('form-container')?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.category_id || !form.pickup_location_id || !form.return_location_id || !form.pickup_date || !form.pickup_time || !form.return_date || !form.return_time || !form.first_name || !form.last_name || !form.phone || !form.email) {
      setError('Por favor completa todos los campos obligatorios.')
      return
    }

    if (!form.terms_accepted) {
      setError('Debes aceptar los términos y condiciones para continuar.')
      return
    }
    setSubmitting(true)
    try {
      // Merge country code with phone
      const finalPhone = `${form.country_code}${form.phone.replace(/\D/g, '')}`

      // Map AM/PM to 24h for the API if needed, or just send strings if the API handles it
      // Existing code used "form.pickup_time" which was "10:00" format.
      // The new HTML has "8:00 AM" format. Let's convert if necessary.
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
          phone: finalPhone, // Enviamos el teléfono con el código de país formateado
          pickup_date,
          return_date,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error enviando solicitud.')
      
      // Tracking
      sendGAEvent('event', 'generate_lead', {
        category: selectedCategory?.name,
        currency: 'USD'
      })

      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'Lead', {
          content_name: selectedCategory?.name,
          currency: 'USD',
          eventID: data.id
        });
      }

      // Redirect to Thank You Page
      router.push(`/typ?name=${encodeURIComponent(form.first_name)}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error inesperado.')
    } finally {
      setSubmitting(false)
    }
  }

  // Success state handled by redirection to /typ
  
  return (
    <div className="bg-gray-50 text-gray-900 antialiased flex flex-col min-h-screen font-inter">
      {settings?.favicon_url && (
        <link rel="icon" href={`${settings.favicon_url}?v=${settings.updated_at ? new Date(settings.updated_at).getTime() : Date.now()}`} />
      )}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        :root {
          --primary-blue: #0D47A1;
          --primary-yellow: #FFC107;
          --primary-yellow-hover: #ffb300;
        }
        .text-primary-blue { color: var(--primary-blue); }
        .bg-primary-blue { background-color: var(--primary-blue); }
        .bg-primary-yellow { background-color: var(--primary-yellow); }
        .hover\:bg-primary-yellow-hover:hover { background-color: var(--primary-yellow-hover); }
      `}</style>
      
      {/* BEGIN: MainHeader */}
      <header className="sticky top-0 z-50 bg-white w-full py-4 px-6 md:px-12 flex items-center justify-between shadow-sm">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          {settings?.logo_url ? (
            <img 
              src={`${settings.logo_url}?v=${settings.updated_at ? new Date(settings.updated_at).getTime() : Date.now()}`} 
              alt={settings.crm_name || 'Logo'} 
              className="h-10 w-auto object-contain"
            />
          ) : (
            <>
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </div>
              <span className="font-extrabold text-xl text-gray-900 tracking-tight">
                {settings?.crm_name || 'GoEasy Florida'}
              </span>
            </>
          )}
        </a>
        {/* Actions */}
        <div className="flex items-center gap-4">
          <a className="bg-primary-yellow hover:bg-primary-yellow-hover text-gray-900 text-sm font-bold py-2.5 px-5 rounded-full shadow-sm transition-colors" href="#cotizar">
            Cotizar Ahora
          </a>
        </div>
      </header>
      {/* END: MainHeader */}

      <main className="flex-grow">
        {/* BEGIN: Hero Section */}
        <section id="cotizar" className="relative w-full min-h-[600px] md:h-[700px] flex items-center px-6 md:px-12 py-12 md:py-0 overflow-hidden mx-auto max-w-[1600px] rounded-b-[2rem] md:rounded-b-[3rem]">
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
            <img 
              alt="Hero Background" 
              className="w-full h-full object-cover rounded-b-[2rem] md:rounded-b-[3rem]" 
              src="/images/hero-goeasy.png" 
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-transparent"></div>
          </div>
          
          <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Hero Text */}
            <div className="text-white drop-shadow-md">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6">
                Alquila fácil,<br/>sin trucos!
              </h1>
              <p className="text-lg md:text-xl font-medium leading-relaxed max-w-md">
                {settings?.crm_tagline || 'Transparencia total. Atención 100% en español. Tu viaje en Florida empieza aquí.'}
              </p>
            </div>
            
            <div id="form-container" className="bg-white rounded-2xl shadow-2xl p-6 md:p-10 w-full max-w-lg mx-auto lg:ml-auto relative overflow-hidden">
              <div className="bg-primary-blue h-2 w-full absolute top-0 left-0"></div>
              
              <div className="flex items-center gap-2 mb-6">
                <div className={`flex-1 h-1.5 rounded-full transition-colors ${step >= 1 ? 'bg-primary-blue' : 'bg-gray-100'}`}></div>
                <div className={`flex-1 h-1.5 rounded-full transition-colors ${step >= 2 ? 'bg-primary-blue' : 'bg-gray-100'}`}></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                {step === 1 && (
                  <>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Detalles de tu viaje</h2>
                    {/* Tipo de vehiculo */}
                    <div className="space-y-1.5">
                      <label className="block text-sm font-bold text-gray-800">Tipo de vehículo</label>
                      <select 
                        required
                        value={form.category_id}
                        onChange={(e) => set('category_id', e.target.value)}
                        className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-blue focus:border-primary-blue text-base py-3 px-4"
                      >
                        <option value="">Selecciona tipo</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    {/* Ciudades */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-sm font-bold text-gray-800">Ciudad de llegada</label>
                        <select 
                          required
                          value={form.pickup_location_id}
                          onChange={(e) => {
                            const loc = locations.find(l => l.id === e.target.value)
                            setForm(f => ({ ...f, pickup_location_id: e.target.value, pickup_location: loc?.name || '' }))
                          }}
                          className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-blue focus:border-primary-blue text-base py-3 px-4"
                        >
                          <option value="">Ciudad</option>
                          {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-bold text-gray-800">Ciudad de devolución</label>
                        <select 
                          required
                          value={form.return_location_id}
                          onChange={(e) => {
                            const loc = locations.find(l => l.id === e.target.value)
                            setForm(f => ({ ...f, return_location_id: e.target.value, return_location: loc?.name || '' }))
                          }}
                          className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-blue focus:border-primary-blue text-base py-3 px-4"
                        >
                          <option value="">Ciudad</option>
                          {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {/* Fechas */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-sm font-bold text-gray-800">Fecha de llegada</label>
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
                          className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-blue focus:border-primary-blue text-base py-3 px-4 text-gray-700" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-bold text-gray-800">Fecha de devolución</label>
                        <input 
                          required
                          type="date" 
                          value={form.return_date}
                          min={form.pickup_date || today}
                          onChange={(e) => set('return_date', e.target.value)}
                          className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-blue focus:border-primary-blue text-base py-3 px-4 text-gray-700" 
                        />
                      </div>
                    </div>
                    {/* Horas */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-sm font-bold text-gray-800">Hora de llegada</label>
                        <select 
                          required
                          value={form.pickup_time}
                          onChange={(e) => set('pickup_time', e.target.value)}
                          className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-blue focus:border-primary-blue text-base py-3 px-4 text-gray-700"
                        >
                          {['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM'].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-bold text-gray-800">Hora de devolución</label>
                        <select 
                          required
                          value={form.return_time}
                          onChange={(e) => set('return_time', e.target.value)}
                          className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-blue focus:border-primary-blue text-base py-3 px-4 text-gray-700"
                        >
                          {['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM'].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <button 
                      type="button" 
                      onClick={handleNext}
                      className="w-full bg-primary-blue text-white font-extrabold text-lg py-4 px-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] mt-4 flex justify-center items-center gap-2"
                    >
                      Siguiente paso
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round"></path>
                      </svg>
                    </button>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                       <button 
                         type="button" 
                         onClick={() => setStep(1)}
                         className="text-primary-blue flex items-center gap-1 text-sm font-bold hover:underline"
                       >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                           <path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" strokeLinecap="round" strokeLinejoin="round"></path>
                         </svg>
                         Atrás
                       </button>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Tus datos de contacto</h2>
                    {/* Datos Personales */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <input 
                        required
                        type="text" 
                        placeholder="Nombre" 
                        value={form.first_name}
                        onChange={(e) => set('first_name', e.target.value)}
                        className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-blue focus:border-primary-blue text-base py-3 px-4 placeholder-gray-400" 
                      />
                      <input 
                        required
                        type="text" 
                        placeholder="Apellido" 
                        value={form.last_name}
                        onChange={(e) => set('last_name', e.target.value)}
                        className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-blue focus:border-primary-blue text-base py-3 px-4 placeholder-gray-400" 
                      />
                    </div>
                    <div>
                      <input 
                        required
                        type="email" 
                        placeholder="Email" 
                        value={form.email}
                        onChange={(e) => set('email', e.target.value)}
                        className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-blue focus:border-primary-blue text-base py-3 px-4 placeholder-gray-400" 
                      />
                    </div>
                    <div className="flex gap-2">
                      <select 
                        required
                        value={form.country_code}
                        onChange={(e) => set('country_code', e.target.value)}
                        className="block w-24 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-blue focus:border-primary-blue text-base py-3 px-2 text-gray-700 bg-gray-50"
                      >
                        <option value="+1">🇵🇷 +1</option>
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+57">🇨🇴 +57</option>
                        <option value="+52">🇲🇽 +52</option>
                        <option value="+1">🇩🇴 +1</option>
                        <option value="+54">🇦🇷 +54</option>
                        <option value="+56">🇨🇱 +56</option>
                        <option value="+34">🇪🇸 +34</option>
                        <option value="+51">🇵🇪 +51</option>
                        <option value="+507">🇵🇦 +507</option>
                        <option value="+58">🇻🇪 +58</option>
                      </select>
                      <input 
                        required
                        type="tel" 
                        placeholder="Teléfono/Whatsapp" 
                        value={form.phone}
                        onChange={(e) => set('phone', e.target.value)}
                        className="block flex-1 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-blue focus:border-primary-blue text-base py-3 px-4 placeholder-gray-400" 
                      />
                    </div>
                    
                    {/* Terms and Conditions */}
                    <div className="flex items-start gap-3 py-2">
                      <div className="flex items-center h-5">
                        <input
                          id="terms"
                          name="terms"
                          type="checkbox"
                          required
                          checked={form.terms_accepted}
                          onChange={(e) => set('terms_accepted', e.target.checked)}
                          className="h-5 w-5 rounded border-gray-300 text-primary-blue focus:ring-primary-blue cursor-pointer"
                        />
                      </div>
                      <label htmlFor="terms" className="text-sm text-gray-600 leading-tight cursor-pointer">
                        Acepto los <a href="#" className="text-primary-blue font-bold hover:underline">términos y condiciones</a> y la <a href="#" className="text-primary-blue font-bold hover:underline">política de privacidad</a>.
                      </label>
                    </div>

                    <button 
                      type="submit" 
                      disabled={submitting}
                      className="w-full bg-primary-yellow hover:bg-primary-yellow-hover text-gray-900 font-extrabold text-lg py-4 px-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] mt-4 flex justify-center items-center gap-2 disabled:opacity-50"
                    >
                      {submitting ? 'Enviando...' : 'Finalizar Cotización'}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round"></path>
                      </svg>
                    </button>
                  </>
                )}
                {error && <p className="text-red-600 text-sm font-bold bg-red-50 p-2 rounded">{error}</p>}
              </form>
            </div>
          </div>
        </section>
        {/* END: Hero Section */}

        {/* BEGIN: Why Choose Us Section */}
        <section className="py-20 px-6 md:px-12 bg-white max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">¿Por qué elegir GoEasy?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-primary-blue" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Atención en Español</h3>
              <p className="text-gray-600 leading-relaxed text-sm">Transparencia total. Atención 100% en español. Tu viaje en Florida empieza aquí.</p>
            </div>
            {/* Card 2 */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-primary-blue" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Precios Transparentes</h3>
              <p className="text-gray-600 leading-relaxed text-sm">Precios excepcionales. Atención 100% en español, te ofrecemos precios transparentes.</p>
            </div>
            {/* Card 3 */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-primary-blue" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Comodidad Total</h3>
              <p className="text-gray-600 leading-relaxed text-sm">Comodidad total. Un viaje standard en vehículos competitivos y comodidad total.</p>
            </div>
          </div>
        </section>

        <section className="py-20 px-6 md:px-12 bg-slate-50 border-y border-gray-200">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">Tu viaje empieza, sin sorpresas.</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-primary-blue" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Autos Impecables</h3>
                <p className="text-gray-600 text-sm leading-relaxed">Concesionarios de autos impecables con modelos de vehículo.</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-primary-blue" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Precio Final</h3>
                <p className="text-gray-600 text-sm leading-relaxed">Precio final para productos autos sin ocultar y sorpresa.</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-primary-blue" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Recogida Aeropuerto</h3>
                <p className="text-gray-600 text-sm leading-relaxed">Recogida en aeropuerto y en una recogida aeropuerto.</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-primary-blue" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" strokeLinecap="round" strokeLinejoin="round"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Soporte 24/7</h3>
                <p className="text-gray-600 text-sm leading-relaxed">Soporte 24/7 total para una nueva experiencia en su auto.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 px-6 md:px-12 bg-white max-w-4xl mx-auto text-center relative">
          <div className="mb-6 inline-block">
            <img alt="Maria L." className="w-16 h-16 rounded-full object-cover shadow-md mx-auto" src="https://lh3.googleusercontent.com/aida-public/AB6AXuArJ-djve_VsUz5PRVowEF9GO6QAVaxOwTkfk5ZyfaqxA7HT9HmRM1xgD1rErMEAsfqc8lrpPZ5vetNF01851DPKzJeS-ltFBhlaY5z9vdR3vRgjFpsxuRHSbpRqpSHyKaVrTFZH1KrVmtMkcetHI0WWPTcHGaLmEhw08Mt0bQLEUFMPrl2Ln5sFSdrF2Xux0boHI_gWefKwVgl7MByoDaR3ntLku4tHlRWtRpwbiQocNDi8RYLM4wtD32gXUXP4cCnSVWfyVFHXkw" />
          </div>
          <blockquote className="text-gray-600 text-lg md:text-xl italic leading-relaxed mb-6 px-12">
            "Maravillosa experiencia. Sin duda todos en mi parte de votos reo que se nota trabajo genial de un área con el personal ante que. Animo empezar a muchos que necesiten renta, de parte nuestra es mas nuevo vehículo asín devuelto."
          </blockquote>
          <div className="font-bold text-gray-900">
            Maria L.
          </div>
          <div className="flex justify-center gap-2 mt-8">
            <button className="w-2 h-2 rounded-full bg-gray-800"></button>
            <button className="w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-colors"></button>
            <button className="w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-colors"></button>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col items-center gap-6">
          <div className="flex items-center gap-6 text-sm font-medium text-gray-500">
            <a href="/login" className="hover:text-gray-900 transition-colors">Acceso Staff</a>
            <span className="text-gray-300">|</span>
            <p>
              © {settings?.crm_name || 'GoEasy Florida'} {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
