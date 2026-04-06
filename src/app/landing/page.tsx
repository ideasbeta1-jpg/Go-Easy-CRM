'use client'

import { useEffect, useState } from 'react'
import { sendGAEvent } from '@next/third-parties/google'

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

type FormStep = 'vehicle' | 'dates' | 'contact' | 'success'

export default function LandingPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<FormStep>('vehicle')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const [form, setForm] = useState({
    category_id: '',
    pickup_location: '',
    pickup_location_id: '',
    return_location: '',
    return_location_id: '',
    pickup_date: today,
    pickup_time: '10:00',
    return_date: nextWeek,
    return_time: '10:00',
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
  })

  useEffect(() => {
    fetch('/api/public-data')
      .then(r => r.json())
      .then(data => {
        setCategories(data.categories || [])
        setLocations(data.locations || [])
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

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const selectedCategory = categories.find(c => c.id === form.category_id)

  const times = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
  ]

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    const suffix = h >= 12 ? 'PM' : 'AM'
    const hh = h % 12 || 12
    return `${hh}:${m.toString().padStart(2, '0')} ${suffix}`
  }

  const rentalDays = () => {
    const d1 = new Date(form.pickup_date)
    const d2 = new Date(form.return_date)
    const diff = Math.ceil((d2.getTime() - d1.getTime()) / 86400000)
    return diff > 0 ? diff : 0
  }

  const totalEstimate = () => {
    if (!selectedCategory) return 0
    return rentalDays() * selectedCategory.daily_price
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.first_name || !form.last_name || !form.phone || !form.email) {
      setError('Por favor completa todos los campos.')
      return
    }
    setSubmitting(true)
    try {
      const pickup_date = `${form.pickup_date}T${form.pickup_time}:00`
      const return_date = `${form.return_date}T${form.return_time}:00`
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          email: form.email,
          pickup_date,
          return_date,
          pickup_location: form.pickup_location,
          pickup_location_id: form.pickup_location_id,
          return_location: form.return_location,
          return_location_id: form.return_location_id,
          category_id: form.category_id,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error enviando solicitud.')
      
      // Tracking: Google Analytics
      sendGAEvent('event', 'generate_lead', {
        category: selectedCategory?.name,
        value: totalEstimate(),
        currency: 'USD'
      })

      // Tracking: Meta Pixel
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'Lead', {
          content_name: selectedCategory?.name,
          value: totalEstimate(),
          currency: 'USD',
          eventID: data.id // For deduplication with CAPI
        });
      }

      setStep('success')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error inesperado.')
    } finally {
      setSubmitting(false)
    }
  }

  const getCategoryIcon = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes('económico') || n.includes('economico')) return '🚗'
    if (n.includes('suv')) return '🚙'
    if (n.includes('minivan') || n.includes('maxivan')) return '🚐'
    return '🚗'
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] font-[Work_Sans,sans-serif]" style={{ fontFamily: "'Work Sans', sans-serif" }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700;800;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; }
        .ms { font-family: 'Material Symbols Outlined'; font-style: normal; font-weight: normal; display: inline-block; line-height: 1; letter-spacing: normal; text-transform: none; white-space: nowrap; word-wrap: normal; direction: ltr; -webkit-font-smoothing: antialiased; }
        .shimmer-btn::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); transform: translateX(-100%); transition: transform 0.5s; }
        .shimmer-btn:hover::after { transform: translateX(100%); }
        .card-hover { transition: transform 0.2s, box-shadow 0.2s; }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 20px 40px -10px rgba(0,59,115,0.2); }
        input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; }
        select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E"); background-position: right 12px center; background-repeat: no-repeat; padding-right: 36px !important; }
        .step-enter { animation: fadeUp 0.35s ease both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .pulse-dot { animation: pulseDot 2s infinite; }
        @keyframes pulseDot { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.7; } }
        .progress-fill { transition: width 0.5s cubic-bezier(0.4,0,0.2,1); }
      `}</style>

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(0,59,115,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#FFD200', padding: 8, borderRadius: 10, transform: 'rotate(3deg)', boxShadow: '0 4px 12px rgba(255,210,0,0.3)', transition: 'transform 0.2s' }}>
            <span className="ms" style={{ fontSize: 22, color: '#003B73', fontVariationSettings: "'FILL' 1" }}>directions_car</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 20, lineHeight: 1, letterSpacing: '-0.5px' }}>GoEasy</span>
            <span style={{ color: '#FFD200', fontSize: 9, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginTop: 2 }}>Rent-A-Car</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 600 }}>🇪🇸 En Español</span>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)' }} />
          <a href="tel:+14079999999" style={{ color: '#FFD200', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>📞 Llámanos</a>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ position: 'relative', minHeight: '62vh', overflow: 'hidden', borderRadius: '0 0 40px 40px' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: "url('https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80')",
          backgroundSize: 'cover', backgroundPosition: 'center',
          transform: 'scale(1.05)',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(0,59,115,0.88) 0%, rgba(0,59,115,0.55) 50%, rgba(0,0,0,0.1) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #f0f4f8 0%, transparent 30%)' }} />

        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '62vh', padding: '90px 20px 160px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 100, padding: '7px 16px', marginBottom: 20 }}>
            <span className="ms" style={{ fontSize: 16, color: '#FFD200', fontVariationSettings: "'FILL' 1" }}>verified_user</span>
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>Sin sorpresas ocultas</span>
          </div>
          <h1 style={{ color: '#fff', fontSize: 'clamp(2rem, 6vw, 3.5rem)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-1.5px', textShadow: '0 4px 20px rgba(0,0,0,0.5)', margin: '0 0 16px 0', maxWidth: 560 }}>
            ¡Alquila fácil,<br />
            <span style={{ color: '#FFD200', textDecoration: 'underline', textDecorationColor: 'rgba(255,210,0,0.4)', textDecorationThickness: 4, textUnderlineOffset: 6 }}>¡sin trucos!</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 'clamp(1rem, 3vw, 1.2rem)', fontWeight: 500, maxWidth: 380, margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.4)', lineHeight: 1.6 }}>
            Transparencia total. Atención 100% en español.
          </p>

          {/* Trust badges */}
          <div style={{ display: 'flex', gap: 16, marginTop: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { icon: 'translate', label: 'Soporte en Español' },
              { icon: 'payments', label: 'Sin cargos ocultos' },
              { icon: 'support_agent', label: 'Atención 24/7' },
            ].map(({ icon, label }) => (
              <div key={icon} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100, padding: '6px 12px' }}>
                <span className="ms" style={{ fontSize: 14, color: '#FFD200' }}>{icon}</span>
                <span style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FLOATING FORM CARD */}
      <div style={{ maxWidth: 540, margin: '-100px auto 0', padding: '0 16px 40px', position: 'relative', zIndex: 20 }}>
        <div style={{ background: '#fff', borderRadius: 28, boxShadow: '0 24px 60px -10px rgba(0,59,115,0.2), 0 8px 20px -5px rgba(0,0,0,0.08)', border: '1px solid rgba(255,255,255,0.8)', overflow: 'hidden' }}>

          {/* Progress bar */}
          {step !== 'success' && (
            <div style={{ height: 4, background: '#f0f4f8' }}>
              <div className="progress-fill" style={{
                height: '100%',
                background: 'linear-gradient(90deg, #003B73, #5b96cd)',
                width: step === 'vehicle' ? '33%' : step === 'dates' ? '66%' : '100%',
              }} />
            </div>
          )}

          <div style={{ padding: 28 }}>
            {/* Step indicators */}
            {step !== 'success' && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
                {(['vehicle', 'dates', 'contact'] as FormStep[]).map((s, i) => {
                  const active = s === step
                  const done = ['vehicle', 'dates', 'contact'].indexOf(step) > i
                  return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: done ? '#22c55e' : active ? '#003B73' : '#e5e7eb',
                        color: done || active ? '#fff' : '#9ca3af',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, transition: 'all 0.3s',
                      }}>
                        {done ? '✓' : i + 1}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: active ? '#003B73' : done ? '#22c55e' : '#9ca3af', display: 'none' }}>
                        {['Vehículo', 'Fechas', 'Contacto'][i]}
                      </span>
                      {i < 2 && <div style={{ width: 24, height: 2, background: done ? '#22c55e' : '#e5e7eb', borderRadius: 2, transition: 'all 0.3s' }} />}
                    </div>
                  )
                })}
              </div>
            )}

            {/* STEP 1: Vehicle */}
            {step === 'vehicle' && (
              <div className="step-enter">
                <h2 style={{ color: '#003B73', fontSize: 18, fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>¿Qué vehículo necesitas?</h2>
                <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 20px 0' }}>Selecciona la categoría que mejor se adapte a tu viaje</p>

                {loading ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ height: 72, borderRadius: 14, background: 'linear-gradient(90deg, #f0f4f8 25%, #e5eaf0 50%, #f0f4f8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', animationTimingFunction: 'linear' }} />
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {categories.map(cat => {
                      const selected = form.category_id === cat.id
                      return (
                        <button
                          key={cat.id}
                          onClick={() => set('category_id', cat.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 14,
                            padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
                            border: selected ? '2px solid #003B73' : '2px solid #e5e7eb',
                            background: selected ? 'linear-gradient(135deg, #f0f6ff, #e8f0ff)' : '#fafafa',
                            transition: 'all 0.2s', textAlign: 'left', width: '100%',
                            boxShadow: selected ? '0 4px 14px rgba(0,59,115,0.15)' : 'none',
                          }}
                        >
                          <span style={{ fontSize: 28, lineHeight: 1 }}>{getCategoryIcon(cat.name)}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{cat.name}</div>
                            {cat.description && <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{cat.description}</div>}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, color: '#003B73', fontSize: 16 }}>${cat.daily_price}</div>
                            <div style={{ color: '#9ca3af', fontSize: 10, fontWeight: 600 }}>/ día</div>
                          </div>
                          {selected && (
                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#003B73', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ color: '#fff', fontSize: 12 }}>✓</span>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                <button
                  onClick={() => setStep('dates')}
                  disabled={!form.category_id}
                  style={{
                    width: '100%', marginTop: 20, padding: '16px 0',
                    background: form.category_id ? '#FFD200' : '#e5e7eb',
                    color: form.category_id ? '#003B73' : '#9ca3af',
                    border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 16,
                    cursor: form.category_id ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: form.category_id ? '0 6px 20px rgba(255,210,0,0.4)' : 'none',
                    transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                  }}
                  className={form.category_id ? 'shimmer-btn' : ''}
                >
                  Seleccionar fechas
                  <span className="ms" style={{ fontSize: 20, fontVariationSettings: "'FILL' 0" }}>arrow_forward</span>
                </button>
              </div>
            )}

            {/* STEP 2: Dates & Locations */}
            {step === 'dates' && (
              <div className="step-enter">
                <h2 style={{ color: '#003B73', fontSize: 18, fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>¿Cuándo y dónde?</h2>
                <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 20px 0' }}>Define las fechas y lugares de entrega</p>

                {/* Pickup Location */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#003B73', letterSpacing: 1.2, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                    📍 Ciudad de Retiro
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span className="ms" style={{ position: 'absolute', left: 12, fontSize: 18, color: '#003B73', fontVariationSettings: "'FILL' 1", zIndex: 1 }}>flight_land</span>
                    <select
                      value={form.pickup_location_id}
                      onChange={e => {
                        const loc = locations.find(l => l.id === e.target.value)
                        setForm(f => ({
                          ...f,
                          pickup_location_id: e.target.value,
                          pickup_location: loc ? loc.name : f.pickup_location
                        }))
                      }}
                      style={{ width: '100%', height: 52, paddingLeft: 44, border: '2px solid #e5e7eb', borderRadius: 12, background: '#fafafa', fontSize: 14, fontWeight: 600, color: '#111827', outline: 'none', cursor: 'pointer' }}
                      onFocus={e => (e.target.style.borderColor = '#003B73')}
                      onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                    >
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Return Location */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: 1.2, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                    📍 Ciudad de Devolución
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span className="ms" style={{ position: 'absolute', left: 12, fontSize: 18, color: '#6b7280', zIndex: 1 }}>flight_takeoff</span>
                    <select
                      value={form.return_location_id}
                      onChange={e => {
                        const loc = locations.find(l => l.id === e.target.value)
                        setForm(f => ({
                          ...f,
                          return_location_id: e.target.value,
                          return_location: loc ? loc.name : f.return_location
                        }))
                      }}
                      style={{ width: '100%', height: 52, paddingLeft: 44, border: '2px solid #e5e7eb', borderRadius: 12, background: '#fafafa', fontSize: 14, fontWeight: 600, color: '#111827', outline: 'none', cursor: 'pointer' }}
                      onFocus={e => (e.target.style.borderColor = '#003B73')}
                      onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                    >
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Dates Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  {/* Pickup date */}
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: 1.2, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>📅 Fecha Retiro</label>
                    <input
                      type="date"
                      value={form.pickup_date}
                      min={today}
                      onChange={e => set('pickup_date', e.target.value)}
                      style={{ width: '100%', height: 48, padding: '0 12px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#fafafa', fontSize: 13, fontWeight: 600, color: '#111827', outline: 'none', marginBottom: 8 }}
                    />
                    <select
                      value={form.pickup_time}
                      onChange={e => set('pickup_time', e.target.value)}
                      style={{ width: '100%', height: 44, paddingLeft: 12, border: '2px solid #e5e7eb', borderRadius: 12, background: '#fafafa', fontSize: 13, fontWeight: 600, color: '#111827', outline: 'none' }}
                    >
                      {times.map(t => <option key={t} value={t}>{formatTime(t)}</option>)}
                    </select>
                  </div>
                  {/* Return date */}
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: 1.2, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>📅 Fecha Devolución</label>
                    <input
                      type="date"
                      value={form.return_date}
                      min={form.pickup_date}
                      onChange={e => set('return_date', e.target.value)}
                      style={{ width: '100%', height: 48, padding: '0 12px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#fafafa', fontSize: 13, fontWeight: 600, color: '#111827', outline: 'none', marginBottom: 8 }}
                    />
                    <select
                      value={form.return_time}
                      onChange={e => set('return_time', e.target.value)}
                      style={{ width: '100%', height: 44, paddingLeft: 12, border: '2px solid #e5e7eb', borderRadius: 12, background: '#fafafa', fontSize: 13, fontWeight: 600, color: '#111827', outline: 'none' }}
                    >
                      {times.map(t => <option key={t} value={t}>{formatTime(t)}</option>)}
                    </select>
                  </div>
                </div>

                {/* Estimate banner */}
                {rentalDays() > 0 && selectedCategory && (
                  <div style={{ background: 'linear-gradient(135deg, #003B73, #1a5fa8)', borderRadius: 14, padding: '14px 18px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600 }}>ESTIMADO PARA {rentalDays()} DÍA{rentalDays() > 1 ? 'S' : ''}</div>
                      <div style={{ color: '#FFD200', fontSize: 22, fontWeight: 900 }}>${totalEstimate().toFixed(2)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{selectedCategory.name}</div>
                      <div style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>${selectedCategory.daily_price}/día</div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setStep('vehicle')} style={{ padding: '14px 20px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#fff', color: '#6b7280', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                    ← Atrás
                  </button>
                  <button
                    onClick={() => setStep('contact')}
                    disabled={rentalDays() <= 0}
                    style={{
                      flex: 1, padding: '14px 0', border: 'none', borderRadius: 12,
                      background: rentalDays() > 0 ? '#FFD200' : '#e5e7eb',
                      color: rentalDays() > 0 ? '#003B73' : '#9ca3af',
                      fontWeight: 800, fontSize: 15, cursor: rentalDays() > 0 ? 'pointer' : 'not-allowed',
                      boxShadow: rentalDays() > 0 ? '0 6px 20px rgba(255,210,0,0.35)' : 'none',
                      position: 'relative', overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                    className={rentalDays() > 0 ? 'shimmer-btn' : ''}
                  >
                    Continuar
                    <span className="ms" style={{ fontSize: 18 }}>arrow_forward</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Contact */}
            {step === 'contact' && (
              <div className="step-enter">
                <h2 style={{ color: '#003B73', fontSize: 18, fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>Tus datos de contacto</h2>
                <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 20px 0' }}>Te enviaremos la cotización al instante por WhatsApp</p>

                {/* Summary card */}
                <div style={{ background: '#f8faff', border: '1px solid #dbeafe', borderRadius: 12, padding: '12px 14px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 24 }}>{selectedCategory ? getCategoryIcon(selectedCategory.name) : '🚗'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#003B73', fontSize: 13 }}>{selectedCategory?.name}</div>
                    <div style={{ color: '#6b7280', fontSize: 11 }}>{form.pickup_date} → {form.return_date} · {rentalDays()} día{rentalDays() > 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ fontWeight: 800, color: '#003B73', fontSize: 16 }}>${totalEstimate().toFixed(0)}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: '#003B73', letterSpacing: 1.2, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Nombre</label>
                    <input
                      type="text"
                      placeholder="María"
                      value={form.first_name}
                      onChange={e => set('first_name', e.target.value)}
                      style={{ width: '100%', height: 50, padding: '0 14px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#fafafa', fontSize: 14, fontWeight: 500, color: '#111827', outline: 'none' }}
                      onFocus={e => (e.target.style.borderColor = '#003B73')}
                      onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: '#003B73', letterSpacing: 1.2, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Apellido</label>
                    <input
                      type="text"
                      placeholder="García"
                      value={form.last_name}
                      onChange={e => set('last_name', e.target.value)}
                      style={{ width: '100%', height: 50, padding: '0 14px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#fafafa', fontSize: 14, fontWeight: 500, color: '#111827', outline: 'none' }}
                      onFocus={e => (e.target.style.borderColor = '#003B73')}
                      onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#003B73', letterSpacing: 1.2, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>📱 WhatsApp</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <div style={{ position: 'absolute', left: 14, fontSize: 12, fontWeight: 700, color: '#003B73', zIndex: 1, whiteSpace: 'nowrap' }}>+1</div>
                    <input
                      type="tel"
                      placeholder="(305) 555-0001"
                      value={form.phone}
                      onChange={e => set('phone', e.target.value)}
                      style={{ width: '100%', height: 50, padding: '0 14px 0 36px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#fafafa', fontSize: 14, fontWeight: 500, color: '#111827', outline: 'none' }}
                      onFocus={e => (e.target.style.borderColor = '#003B73')}
                      onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#003B73', letterSpacing: 1.2, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>✉️ Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="maria@ejemplo.com"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    style={{ width: '100%', height: 50, padding: '0 14px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#fafafa', fontSize: 14, fontWeight: 500, color: '#111827', outline: 'none' }}
                    onFocus={e => (e.target.style.borderColor = '#003B73')}
                    onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                  />
                </div>

                {error && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
                    ⚠️ {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setStep('dates')} style={{ padding: '14px 20px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#fff', color: '#6b7280', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                    ← Atrás
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{
                      flex: 1, padding: '14px 0', border: 'none', borderRadius: 12,
                      background: submitting ? '#e5e7eb' : '#FFD200',
                      color: submitting ? '#9ca3af' : '#003B73',
                      fontWeight: 800, fontSize: 15, cursor: submitting ? 'not-allowed' : 'pointer',
                      boxShadow: submitting ? 'none' : '0 6px 20px rgba(255,210,0,0.4)',
                      position: 'relative', overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                    className={!submitting ? 'shimmer-btn' : ''}
                  >
                    {submitting ? (
                      <>
                        <span style={{ width: 16, height: 16, border: '2.5px solid #9ca3af', borderTopColor: '#003B73', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <span className="ms" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>send</span>
                        Solicitar Cotización
                      </>
                    )}
                  </button>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

                <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 11, marginTop: 14, lineHeight: 1.5 }}>
                  🔒 Tus datos están protegidos. No compartimos tu información.
                </p>
              </div>
            )}

            {/* STEP 4: Success */}
            {step === 'success' && (
              <div className="step-enter" style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg, #22c55e, #16a34a)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(34,197,94,0.35)' }}>
                  <span className="ms" style={{ fontSize: 36, color: '#fff', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <h2 style={{ color: '#003B73', fontSize: 22, fontWeight: 900, margin: '0 0 8px 0' }}>¡Solicitud Recibida!</h2>
                <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px 0', maxWidth: 320, marginInline: 'auto' }}>
                  Nuestro equipo revisará tu solicitud y te enviará una cotización personalizada en los próximos minutos.
                </p>
                <div style={{ background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', border: '1px solid #bae6fd', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
                  <div style={{ color: '#0369a1', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>📋 Resumen de tu solicitud</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#6b7280' }}>Vehículo</span>
                      <span style={{ fontWeight: 700, color: '#111827' }}>{selectedCategory?.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#6b7280' }}>Retiro</span>
                      <span style={{ fontWeight: 700, color: '#111827' }}>{form.pickup_date}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#6b7280' }}>Devolución</span>
                      <span style={{ fontWeight: 700, color: '#111827' }}>{form.return_date}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#6b7280' }}>Estimado</span>
                      <span style={{ fontWeight: 800, color: '#003B73', fontSize: 15 }}>${totalEstimate().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <a
                  href="https://wa.me/14079999999"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    width: '100%', padding: '15px 0', background: '#25D366', color: '#fff',
                    borderRadius: 14, textDecoration: 'none', fontWeight: 800, fontSize: 15,
                    boxShadow: '0 6px 20px rgba(37,211,102,0.35)',
                  }}
                >
                  <span style={{ fontSize: 20 }}>💬</span>
                  Chatear por WhatsApp ahora
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WHY CHOOSE US Section */}
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '0 16px 80px' }}>
        <h3 style={{ color: '#003B73', fontWeight: 800, fontSize: 20, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="ms" style={{ fontSize: 22, color: '#FFD200', fontVariationSettings: "'FILL' 1" }}>stars</span>
          ¿Por qué elegir GoEasy?
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { icon: 'translate', emoji: '🇪🇸', bg: '#eff6ff', color: '#2563eb', title: 'Atención en Español', desc: 'Te entendemos perfectamente. Soporte nativo 24/7 sin barreras de idioma.' },
            { icon: 'visibility', emoji: '💰', bg: '#fffbeb', color: '#d97706', title: 'Precios Transparentes', desc: 'Lo que ves es lo que pagas. Sin cargos sorpresa ni letras chiquitas al llegar.' },
            { icon: 'support_agent', emoji: '⚡', bg: '#f0fdf4', color: '#16a34a', title: 'Cotización Express', desc: 'Recibes tu cotización personalizada en menos de 5 minutos por WhatsApp.' },
          ].map(({ bg, color, title, desc, emoji }) => (
            <div key={title} className="card-hover" style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: 20, borderRadius: 18, background: '#fff', border: '1px solid #f0f4f8', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>
                {emoji}
              </div>
              <div>
                <h4 style={{ fontWeight: 700, color: '#111827', fontSize: 15, margin: '0 0 4px 0' }}>{title}</h4>
                <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 40, padding: '20px 0', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ background: '#FFD200', padding: 6, borderRadius: 8 }}>
              <span className="ms" style={{ fontSize: 16, color: '#003B73', fontVariationSettings: "'FILL' 1" }}>directions_car</span>
            </div>
            <span style={{ fontWeight: 800, color: '#003B73', fontSize: 16 }}>GoEasy Rent-A-Car</span>
          </div>
          <p style={{ color: '#9ca3af', fontSize: 12, margin: 0 }}>© 2025 GoEasy Florida · Atención en Español · ☎️ +1 (407) 999-9999</p>
        </div>
      </div>
    </div>
  )
}
