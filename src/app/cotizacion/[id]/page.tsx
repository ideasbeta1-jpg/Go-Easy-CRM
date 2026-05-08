import { createAdminClient } from '@/utils/supabase/admin'
import {
  Car,
  MapPin,
  Calendar,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  Clock,
  ArrowRight,
  AlertTriangle,
  Shield,
  Sparkles,
} from 'lucide-react'

export default async function QuoteLandingPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>,
  searchParams: Promise<{ session_id?: string }>
}) {
  const { id } = await params
  const { session_id } = await searchParams
  const supabase = createAdminClient()

  const { data: quote, error } = await supabase
    .from('quotes')
    .select(`
      *,
      lead:leads(
        *,
        category:categories(*)
      )
    `)
    .eq('id', id)
    .single()

  const agentProfile = quote?.lead?.assigned_to
    ? await supabase.from('profiles').select('full_name').eq('id', quote.lead.assigned_to).single().then(r => r.data)
    : null

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center space-y-5">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900">Cotización no encontrada</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">No pudimos cargar los detalles en este momento.</p>
          </div>
          <p className="text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg">ID: {id}</p>
        </div>
      </div>
    )
  }

  const { lead } = quote
  const category = lead.category

  if (quote.is_active === false) {
    return (
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center space-y-5">
          <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900">Esta cotización ya no está vigente</h1>
            <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">
              Hola <span className="font-black text-slate-800">{lead.first_name}</span>, tu agente actualizó
              los términos de tu cotización. Revisa tu WhatsApp o email para el nuevo enlace.
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Generada el</p>
            <p className="text-sm font-black text-slate-700 mt-0.5">
              {new Date(quote.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <a
            href={`https://wa.me/18052406345?text=${encodeURIComponent(`Hola${agentProfile?.full_name ? ` ${agentProfile.full_name}` : ''}, me gustaría recibir una mejor oferta para mi cotización de renta de auto.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#1ebe5d] active:bg-[#19a852] text-white font-black py-3.5 rounded-xl text-sm transition-colors shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
            Contactar a{agentProfile?.full_name ? ` ${agentProfile.full_name}` : ' tu asesor'}
          </a>
          <p className="text-xs text-slate-400 font-medium -mt-1">Habla con tu asesor para recibir una mejor oferta</p>
          <p className="text-[11px] text-slate-400 font-bold">Go Easy Florida · goeasyflorida.com</p>
        </div>
      </div>
    )
  }

  const isPaid = session_id || lead.status === 'reserva_confirmada' || lead.status === 'voucher_enviado'

  const pickupDateStr = quote.pickup_date || lead.pickup_date
  const returnDateStr = quote.return_date || lead.return_date

  const pickup = new Date(pickupDateStr)
  const returnDate = new Date(returnDateStr)
  const diffDays = Math.max(1, Math.ceil((returnDate.getTime() - pickup.getTime()) / (1000 * 3600 * 24)))

  const grandTotal = Number(quote.total_amount || lead.total_amount || 0)

  const deposit = quote.deposit_amount
    ? Number(quote.deposit_amount)
    : (() => {
        const dailyMargin = lead.agreed_daily_price !== null
          ? Number(lead.agreed_daily_price)
          : Number(category?.daily_price || 0)
        return dailyMargin * diffDays
      })()

  const balanceAtCounter = Math.max(0, grandTotal - deposit)
  const isPremium = lead.rate_plan === 'premium'

  const expiryDate = new Date(quote.expires_at || Date.now() + 86400000).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  const pickupFormatted = new Date(pickupDateStr).toLocaleDateString('es-ES', {
    weekday: 'short', day: 'numeric', month: 'short'
  }) + ' · ' + new Date(pickupDateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  const returnFormatted = new Date(returnDateStr).toLocaleDateString('es-ES', {
    weekday: 'short', day: 'numeric', month: 'short'
  }) + ' · ' + new Date(returnDateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  const premiumFeatures = [
    'Protección Total (Robo y Choque)',
    'Seguro a Terceros ($1M)',
    'Asistencia Carretera 24/7',
    'GPS Incluido',
    'Conductor Adicional',
    'Kilometraje Ilimitado',
    'Combustible: Lleno/Lleno',
  ]

  const standardFeatures = [
    'Protección Básica (con Deducible)',
    'Seguro a Terceros Básico',
    'Asistencia Carretera 24/7',
    'GPS Incluido',
    'Conductor Adicional',
    'Millas Solo Florida',
    'Combustible: Lleno/Lleno',
  ]

  const features = isPremium ? premiumFeatures : standardFeatures

  return (
    <div className="min-h-screen bg-[#F0F4F8] font-sans text-slate-900">

      {/* Top bar */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#1a2035] rounded-xl flex items-center justify-center shrink-0">
              <span className="text-white font-black text-sm">G</span>
            </div>
            <div>
              <p className="font-black text-slate-900 text-sm leading-none">Go Easy Florida</p>
              <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">Renta de Autos · Premium Fleet</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
            isPaid
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-indigo-50 border-indigo-200 text-indigo-700'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPaid ? 'bg-emerald-500' : 'bg-indigo-500 animate-pulse'}`} />
            {isPaid ? 'Reserva Confirmada' : 'Cotización Activa'}
          </div>
        </div>
      </header>

      {/* Paid banner */}
      {isPaid && (
        <div className="bg-emerald-500 text-white">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <p className="text-sm font-bold">
              ¡Reserva confirmada! Tu pago fue procesado con éxito. Un agente te contactará pronto con todos los detalles.
            </p>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Page title row */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-1">
              {isPaid ? 'Reserva Confirmada' : 'Cotización Personalizada'}
            </p>
            <h1 className="text-2xl font-black text-slate-900">Hola, {lead.first_name}</h1>
            <p className="text-sm text-slate-500 font-medium mt-1 max-w-md">
              {isPaid
                ? 'Tu pago fue recibido con éxito. Aquí tienes el resumen completo de tu reserva.'
                : 'Revisa los detalles y confirma con el depósito para asegurar tu disponibilidad.'}
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white border border-amber-200 rounded-xl px-4 py-3 shadow-sm shrink-0 self-start">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none">Oferta vence</p>
              <p className="text-sm font-black text-slate-800 leading-tight mt-0.5">{expiryDate}</p>
            </div>
          </div>
        </div>

        {/* KPI stats row — 4 cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Duración</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{diffDays} días</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              {new Date(pickupDateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} →{' '}
              {new Date(returnDateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Renta</p>
            <p className="text-2xl font-black text-slate-900 mt-1">${grandTotal.toFixed(2)}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Incluye seguro y fees</p>
          </div>
          <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Depósito Online</p>
            <p className="text-2xl font-black text-indigo-700 mt-1">${deposit.toFixed(2)}</p>
            <p className="text-[11px] text-indigo-400 font-medium mt-0.5">Para confirmar ahora</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Saldo en Counter</p>
            <p className="text-2xl font-black text-slate-900 mt-1">${balanceAtCounter.toFixed(2)}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Se paga al recoger</p>
          </div>
        </div>

        {/* Main 2-col grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left: Vehicle + trip + protection */}
          <div className="lg:col-span-2 space-y-5">

            {/* Vehicle card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-slate-400" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Vehículo</span>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  isPremium ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                }`}>
                  {isPremium ? 'Premium Full Cover' : 'Protección Estándar'}
                </span>
              </div>
              <div className="p-6 flex flex-col md:flex-row gap-8 items-center">
                <div className="w-full md:w-48 shrink-0">
                  <img
                    src={category.image_url}
                    alt={category.name}
                    className="w-full h-auto object-contain drop-shadow-md"
                  />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">{category.name}</h2>
                    <p className="text-sm text-slate-500 font-medium mt-1 leading-relaxed">{category.description}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                    {features.map(feature => (
                      <div key={feature} className="flex items-center gap-2">
                        <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isPremium ? 'text-indigo-500' : 'text-emerald-500'}`} />
                        <span className="text-xs font-medium text-slate-600">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Trip details card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Detalles del Viaje</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1 mb-1.5">
                    <MapPin className="w-3 h-3 text-blue-400" /> Entrega
                  </p>
                  <p className="text-sm font-black text-slate-800 leading-tight">{lead.pickup_location}</p>
                  <p className="text-[11px] text-indigo-500 font-bold mt-1">{pickupFormatted}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1 mb-1.5">
                    <MapPin className="w-3 h-3 text-indigo-400" /> Devolución
                  </p>
                  <p className="text-sm font-black text-slate-800 leading-tight">{lead.return_location}</p>
                  <p className="text-[11px] text-indigo-500 font-bold mt-1">{returnFormatted}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1 mb-1.5">
                    <Calendar className="w-3 h-3 text-emerald-400" /> Duración
                  </p>
                  <p className="text-sm font-black text-slate-800">{diffDays} días</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1 mb-1.5">
                    <ShieldCheck className="w-3 h-3 text-amber-400" /> Protección
                  </p>
                  <p className="text-sm font-black text-slate-800">{isPremium ? 'Premium VIP' : 'Estándar'}</p>
                </div>
              </div>
            </div>

            {/* Protection card */}
            <div className={`rounded-2xl border p-6 ${
              isPremium
                ? 'bg-indigo-600 border-indigo-500'
                : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  isPremium ? 'bg-white/20' : 'bg-emerald-50 border border-emerald-200'
                }`}>
                  {isPremium
                    ? <Sparkles className="w-5 h-5 text-white" />
                    : <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  }
                </div>
                <div>
                  <h3 className={`text-base font-black ${isPremium ? 'text-white' : 'text-slate-900'}`}>
                    {isPremium ? 'Premium Full Cover 👑' : 'Protección Estándar'}
                  </h3>
                  <p className={`text-sm font-medium mt-1 leading-relaxed ${isPremium ? 'text-indigo-200' : 'text-slate-500'}`}>
                    {isPremium
                      ? 'Protección total contra robo y choque, seguro a terceros de $1M, asistencia 24/7 y kilometraje ilimitado. Sin costos ocultos en el counter.'
                      : 'Cobertura básica con deducible, asistencia 24/7, GPS, conductor adicional y política combustible lleno/lleno.'
                    }
                  </p>
                  {isPremium && (
                    <div className="flex items-center gap-2 mt-3 text-[10px] font-black uppercase tracking-wider text-indigo-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      100% Sin Costos Ocultos en el Counter
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Right: Pricing + CTA */}
          <div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">

              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Resumen de Pago</span>
              </div>

              <div className="p-6 space-y-6">

                {/* Breakdown */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                    <span className="text-sm font-medium text-slate-500">Total Renta ({diffDays} días)</span>
                    <span className="text-sm font-black text-slate-900">${grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                    <span className="text-sm font-medium text-slate-500">Depósito online</span>
                    <span className="text-sm font-black text-indigo-600">−${deposit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3">
                    <div>
                      <p className="text-sm font-bold text-slate-700">Saldo en counter</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <CreditCard className="w-3 h-3 text-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Pay at Pickup</span>
                      </div>
                    </div>
                    <span className="text-2xl font-black text-slate-900">${balanceAtCounter.toFixed(2)}</span>
                  </div>
                </div>

                {/* CTA block */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Confirma hoy con solo</p>
                    <p className="text-4xl font-black text-indigo-700 mt-1.5">${deposit.toFixed(2)}</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-1">Asegura tarifa y disponibilidad</p>
                  </div>

                  {isPaid ? (
                    <div className="w-full bg-emerald-500 text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4" /> Reserva Pagada
                    </div>
                  ) : (
                    <a
                      href={quote.stripe_link || '#'}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors shadow-sm"
                    >
                      Confirmar Ahora
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  )}

                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400">
                    <CreditCard className="w-3 h-3" /> Checkout seguro · Stripe
                  </div>
                </div>

                {/* Expiry */}
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">Oferta vence</p>
                    <p className="text-sm font-black text-slate-800 mt-0.5">{expiryDate}</p>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-10 py-6">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#1a2035] rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-[9px]">G</span>
            </div>
            <p className="text-[11px] font-bold text-slate-400">© 2026 Go Easy Florida. Las imágenes son ilustrativas.</p>
          </div>
          <div className="flex items-center gap-6 text-[11px] font-black uppercase tracking-widest text-slate-400">
            <a href="#" className="hover:text-indigo-600 transition-colors">Ayuda</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Condiciones</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Privacidad</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
