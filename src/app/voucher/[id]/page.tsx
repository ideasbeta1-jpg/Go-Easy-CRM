import { createAdminClient } from '@/utils/supabase/admin'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'
import {
  MapPin,
  Calendar,
  Car,
  User,
  Hash,
  CheckCircle2,
  Phone,
  Info,
  UserPlus,
  Zap,
  Globe,
  Mail,
  ShieldCheck,
  Navigation,
  Fuel,
  Gauge,
} from 'lucide-react'
import { VoucherActions } from './components/VoucherActions'

export default async function VoucherPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await paramsPromise
  const supabase = createAdminClient()

  const { data: voucher, error } = await supabase
    .from('vouchers')
    .select(`
      *,
      lead:leads(
        *,
        category:categories(*),
        provider:providers(*)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !voucher) {
    return notFound()
  }

  const { lead } = voucher
  const category = lead.category
  const provider = lead.provider
  const isPremium = lead.rate_plan === 'premium'

  const diffDays = Math.max(1, Math.ceil(
    (new Date(lead.return_date).getTime() - new Date(lead.pickup_date).getTime()) / 86400000
  ))

  const [{ data: activeQuote }, { data: office }] = await Promise.all([
    supabase
      .from('quotes')
      .select('deposit_amount, total_amount')
      .eq('lead_id', lead.id)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('provider_offices')
      .select('*, locations!inner(name)')
      .eq('provider_id', lead.provider_id)
      .eq('locations.name', lead.pickup_location)
      .maybeSingle(),
  ])

  const grandTotal = Number(lead.total_amount || 0)
  const deposit = activeQuote?.deposit_amount
    ? Number(activeQuote.deposit_amount)
    : lead.agreed_daily_price != null
      ? Number(lead.agreed_daily_price) * diffDays
      : Number(category?.daily_price || 0) * diffDays
  const balanceAtCounter = Math.max(0, grandTotal - deposit)

  const pickupFormatted = new Date(lead.pickup_date).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const pickupTime = new Date(lead.pickup_date).toLocaleTimeString('es-ES', {
    hour: '2-digit', minute: '2-digit',
  })
  const returnFormatted = new Date(lead.return_date).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const returnTime = new Date(lead.return_date).toLocaleTimeString('es-ES', {
    hour: '2-digit', minute: '2-digit',
  })
  const issueDate = new Date(voucher.created_at).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const benefits = [
    { label: isPremium ? 'Protección Total' : 'Protección Básica', icon: ShieldCheck },
    { label: isPremium ? 'Terceros $1M' : 'Terceros Básico', icon: Zap },
    { label: '2do Conductor', icon: UserPlus },
    { label: isPremium ? 'Km Ilimitado (USA)' : 'Km Ilimitado (FL)', icon: Gauge },
    { label: 'Asistencia 24/7', icon: Phone },
    { label: 'GPS Incluido', icon: Navigation },
    { label: 'Combustible Lleno/Lleno', icon: Fuel },
  ]

  return (
    <div className="min-h-screen bg-slate-100 py-12 px-4 font-sans selection:bg-indigo-100">

      {/* Controls (no-print) */}
      <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between no-print">
        <div>
          <h1 className="text-base font-black text-slate-900 flex items-center gap-2">
            Voucher de Reserva
            {isPremium && (
              <span className="bg-indigo-600 text-white text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-widest font-bold">
                PREMIUM
              </span>
            )}
          </h1>
          <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
            <CheckCircle2 className="w-3 h-3" /> Reserva confirmada
          </p>
        </div>
        <VoucherActions voucherNumber={voucher.confirmation_number} />
      </div>

      {/* Document */}
      <main
        id="voucher-document"
        className="max-w-3xl mx-auto bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-[0_4px_24px_rgba(15,23,42,0.08)]"
      >

        {/* Header — dark, compact */}
        <div className={`${isPremium ? 'bg-indigo-950' : 'bg-slate-950'} px-10 py-7 flex items-center justify-between`}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-white font-black text-xs">G</span>
              </div>
              <span className="text-white font-black text-sm tracking-tight">Go Easy Florida</span>
              {isPremium && (
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full">
                  Premium
                </span>
              )}
            </div>
            <div className="flex items-center gap-5 flex-wrap">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-500">Confirmación</p>
                <p className="text-lg font-black font-mono tracking-widest text-indigo-400 leading-tight">
                  {voucher.confirmation_number}
                </p>
              </div>
              <div className="w-px h-7 bg-white/10" />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-500">Emitido</p>
                <p className="text-xs font-bold text-slate-300">{issueDate}</p>
              </div>
              <div className="w-px h-7 bg-white/10" />
              <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-3 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Confirmada</span>
              </div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">

          {/* Sección 1: Cliente + Itinerario */}
          <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-100">

            {/* Columna izquierda: Cliente, Conductor, Vehículo */}
            <div className="md:col-span-2 p-8 space-y-7">

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Cliente
                </p>
                <p className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                  {lead.first_name} {lead.last_name}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600">
                    <Phone className="w-3 h-3 text-indigo-500" /> {lead.phone}
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-semibold text-slate-500">
                    <Hash className="w-3 h-3" /> {lead.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
              </div>

              {(voucher.conductor_nombre || voucher.conductor_telefono) && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Conductor Principal
                  </p>
                  <p className="text-base font-black text-slate-800">{voucher.conductor_nombre}</p>
                  {voucher.conductor_telefono && (
                    <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600">
                      <Phone className="w-3 h-3 text-indigo-500" /> {voucher.conductor_telefono}
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5" /> Vehículo
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-16 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden flex items-center justify-center p-2 shrink-0">
                    <img
                      src={category.image_url}
                      alt={category.name}
                      className="w-full h-auto object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5">
                      Clase {category.name.split(' ')[0]}
                    </p>
                    <p className="text-base font-black text-slate-900 leading-tight">{category.name}</p>
                    <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Modelos 2024 – 2026</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna derecha: Itinerario */}
            <div className="md:col-span-3 p-8 space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Itinerario de Viaje
              </p>

              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500">
                  Entrega de Llaves
                </span>
                <p className="text-base font-black text-indigo-900 leading-snug">{lead.pickup_location}</p>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span className="capitalize">{pickupFormatted}</span>
                  <span className="text-indigo-300">·</span>
                  <span>{pickupTime}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 px-1">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  {diffDays} {diffDays === 1 ? 'día' : 'días'}
                </span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Devolución
                </span>
                <p className="text-base font-black text-slate-800 leading-snug">{lead.return_location}</p>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span className="capitalize">{returnFormatted}</span>
                  <span className="text-slate-300">·</span>
                  <span>{returnTime}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sección 2: Pago en counter */}
          {grandTotal > 0 && (
            <div className="px-8 py-5 bg-amber-50 flex items-center justify-between gap-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-700 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> A pagar en counter al recoger el vehículo
                </p>
                <p className="text-xs font-semibold text-amber-600/70 mt-0.5">
                  Presenta este voucher y tu licencia de conducir.
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-3xl font-black text-amber-700 tracking-tight font-mono">
                  ${balanceAtCounter.toFixed(2)}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mt-0.5">
                  USD · Pay at Pickup
                </p>
              </div>
            </div>
          )}

          {/* Sección 3: Proveedor */}
          <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <div className="md:col-span-2 p-8 space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                Compañía Operadora
              </p>
              <div className="space-y-3">
                <p className="text-xl font-black text-slate-900 tracking-tight">
                  {provider?.name || 'Local Partner Florida'}
                </p>
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide">
                    ID: {voucher.confirmation_number}
                  </span>
                  {voucher.provider_confirmation ? (
                    <div className="flex flex-col gap-1 bg-indigo-600 rounded-xl px-4 py-3">
                      <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-1">
                        <Hash className="w-3 h-3" /> Confirmación {provider?.name}
                      </span>
                      <p className="text-lg font-black font-mono text-white tracking-widest">
                        {voucher.provider_confirmation}
                      </p>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg px-3 py-1.5 text-[11px] font-bold">
                      <Info className="w-3 h-3" /> Confirmación en proceso
                    </div>
                  )}
                </div>
                {office && (
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <div className="w-8 h-8 bg-white rounded-lg shadow-sm border border-slate-100 flex items-center justify-center text-indigo-500 shrink-0">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                        Contacto Local 24/7
                      </p>
                      <p className="text-sm font-black text-slate-700 mt-0.5">{office.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-3 p-8 bg-slate-950 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Instrucciones de Recogida
              </p>
              <p className="text-sm font-medium text-slate-400 leading-relaxed">
                {office?.notes || office?.hours
                  ? `${office.hours ? `Horario: ${office.hours}. ` : ''}${office.notes || 'Nuestro representante le estará esperando en la zona de llegadas.'}`
                  : 'Al llegar al aeropuerto, proceda a la zona de Rental Car Center. Nuestro representante le estará esperando con un cartel de su nombre o el logo de Go Easy Florida. Por favor presente su licencia de conducir y este voucher.'
                }
              </p>
            </div>
          </div>

          {/* Sección 4: Beneficios — compactos */}
          <div className="px-8 py-5">
            <div className="flex flex-wrap gap-2">
              {benefits.map((b, i) => (
                <div
                  key={i}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${
                    isPremium
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <b.icon className="w-3 h-3" />
                  {b.label}
                </div>
              ))}
            </div>
          </div>

          {/* Sección 5: Términos y condiciones (solo tarifa base) */}
          {!isPremium && (
            <div className="px-8 py-7 space-y-5 border-t border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                Términos y Condiciones
              </p>

              {/* Resumen */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Resumen</p>
                <p className="text-xs font-medium text-slate-600 leading-relaxed">
                  Este precio incluye millas ilimitadas, reserva vehicular, 2 conductores (+25 años) y seguro exigido por el estado. No incluye SunPass, el cual deberá ser activado en el counter, ni el hold de seguridad de $300 a $500 USD. Recuerde que los pagos realizados por este medio no son reembolsables, sin embargo, de verse obligado a algún cambio, usted cuenta con 18 meses para reprogramar los días de reserva adquiridos.
                </p>
              </div>

              {/* Detalle */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Condiciones Detalladas</p>
                <div className="text-[11px] font-medium text-slate-500 leading-relaxed space-y-2">
                  <p>Imprima esta confirmación y preséntala al agente de alquiler en el momento de recoger el vehículo. El pago deberá efectuarse directamente a la empresa de alquiler de coches en el momento de recoger el vehículo; es indispensable tener una tarjeta de crédito para el depósito de seguridad.</p>
                  <p>Se cobrará una tasa adicional (15,99 $/día) a los conductores de entre 21 y 24 años. Los conductores de entre 21 y 24 años no podrán alquilar vehículos de las siguientes clases: coches de lujo, descapotables, vehículos deportivos o vehículos con capacidad para más de 5 pasajeros. Algunos países y categorías específicas de vehículos pueden tener normas de edad específicas.</p>
                  <p>Combustible: El vehículo se entrega con el depósito lleno y deberá devolverse también lleno para evitar cargos por repostaje, a menos que el plan de alquiler seleccionado incluya un depósito de combustible gratuito.</p>
                  <p>En el Estado de Florida todos los vehículos están equipados con el sistema TollPass; sin embargo, el costo de los peajes no está incluido en las tarifas publicadas.</p>
                  <p>Las tarifas solo son válidas para viajeros internacionales, que no residan en el mismo país en el que se alquila el vehículo, con un permiso de conducir original válido de su país de residencia.</p>
                  <p>Al recoger el vehículo, el agente de alquiler puede ofrecer servicios adicionales y cobertura de seguro, así como mejoras en la categoría del vehículo. Dichos servicios son opcionales y el cliente puede rechazarlos. La no aceptación de dichos servicios opcionales no impide al cliente alquilar el vehículo. Lea detenidamente el contrato de alquiler antes de firmarlo para asegurarse de que solo se han incluido los servicios solicitados, ya que una vez aceptados los servicios opcionales se modificará el importe total del alquiler y no se devolverá ninguna cantidad.</p>
                  <p>Tenga en cuenta que las reservas dobles, o las reservas con fechas que se solapen, no están permitidas y pueden dar lugar a la cancelación de la reserva. Para más información, visite las páginas de preguntas frecuentes o de términos y condiciones de nuestro sitio web.</p>
                </div>
              </div>
            </div>
          )}

          {/* Footer del documento */}
          <div className="px-8 py-4 bg-slate-50 flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Go Easy CRM · {new Date().getFullYear()} Florida VIP Services
            </p>
            <p className="text-[10px] font-mono font-bold text-slate-400">
              {voucher.confirmation_number}
            </p>
          </div>

        </div>
      </main>

      {/* Support footer (no-print) */}
      <footer className="mt-10 max-w-3xl mx-auto border-t border-slate-200 pt-10 no-print">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="space-y-2">
            <h5 className="text-xs font-black text-slate-900 uppercase tracking-widest">Atención 24/7</h5>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Si tiene algún inconveniente al recoger su vehículo o necesita asistencia, contáctenos vía WhatsApp.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <button className="bg-emerald-500 text-white w-full max-w-[180px] h-11 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-colors">
              <Phone className="w-4 h-4" /> Soporte WhatsApp
            </button>
            <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-xs">
              <Globe className="w-3.5 h-3.5" /> GoEasyFlorida.com
            </div>
          </div>
          <div className="space-y-2 md:text-right">
            <h5 className="text-xs font-black text-slate-900 uppercase tracking-widest">Oficina Principal</h5>
            <p className="text-xs text-slate-500 font-medium">
              1234 Ocean Drive, Suite 201<br />
              Miami Beach, FL 33139<br />
              United States
            </p>
          </div>
        </div>
        <div className="mt-8 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center justify-center gap-6">
          <div className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Pago Seguro SSL</div>
          <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> tickets@goeasy.com</div>
        </div>
      </footer>
    </div>
  )
}
