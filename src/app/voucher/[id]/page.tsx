import { createAdminClient } from '@/utils/supabase/admin'
import { notFound } from 'next/navigation'
import { 
  FileText, 
  MapPin, 
  Calendar, 
  Car, 
  User, 
  ShieldCheck, 
  QrCode, 
  Hash, 
  CheckCircle2, 
  Printer, 
  Download,
  Phone,
  Info,
  UserPlus,
  Zap,
  Globe,
  Mail,
  ShieldCheck as Shield
} from 'lucide-react'
import { VoucherActions } from './components/VoucherActions'

export default async function VoucherPage({
  params: paramsPromise
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await paramsPromise
  const supabase = createAdminClient()
  
  // Fetch voucher and associated lead
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

  // Attempt to find the specific office for this provider and location
  const { data: office } = await supabase
    .from('provider_offices')
    .select('*, locations!inner(name)')
    .eq('provider_id', lead.provider_id)
    .eq('locations.name', lead.pickup_location)
    .maybeSingle()

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-6 font-sans selection:bg-indigo-100 selection:selection:text-indigo-900 bg-dots">
       
       {/* Support Header (Floating) */}
       <div className="max-w-4xl mx-auto mb-12 flex flex-col md:flex-row items-center justify-between gap-6 no-print">
          <div className="flex items-center gap-4 group">
             <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-xl shadow-indigo-600/10 border border-slate-100 transition-all group-hover:scale-105 group-hover:-rotate-3">
                <Shield className="w-7 h-7" />
             </div>
             <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-2">
                   Voucher de Reserva {isPremium && <span className="bg-indigo-600 text-white text-[10px] px-3 py-1 rounded-full uppercase tracking-widest font-black flex items-center gap-1 shadow-lg shadow-indigo-600/30 ring-4 ring-indigo-50">PREMIUM</span>}
                </h1>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1 flex items-center gap-1.5 leading-none">
                   <CheckCircle2 className="w-3 h-3" /> RESERVA CONFIRMADA & PAGADA
                </p>
             </div>
          </div>
          
          <VoucherActions voucherNumber={voucher.confirmation_number} />
       </div>

       {/* The Voucher Document */}
       <main id="voucher-document" className="max-w-4xl mx-auto bg-white border border-slate-200 shadow-[0_80px_160px_rgba(30,41,59,0.1)] rounded-[3rem] overflow-hidden relative group/voucher">
          
          {/* Header Section */}
          <div className={`${isPremium ? 'bg-indigo-950' : 'bg-slate-950'} text-white p-12 lg:p-16 flex flex-col md:flex-row items-center justify-between gap-10 relative overflow-hidden`}>
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
             <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-indigo-500/20 blur-[140px] rounded-full -translate-y-1/2 translate-x-1/2" />
             <div className="absolute bottom-0 left-0 w-[20rem] h-[20rem] bg-rose-500/10 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />
             
             <div className="space-y-8 relative z-10">
                <div className="space-y-4">
                   <h2 className="text-5xl font-black tracking-tighter leading-none italic uppercase">
                      Go Easy <span className="text-indigo-400 italic decoration-indigo-400 underline decoration-8 underline-offset-8">Florida</span>
                   </h2>
                   {isPremium && (
                     <div className="inline-flex items-center gap-2 bg-indigo-500/10 backdrop-blur-xl border border-white/5 px-4 py-2 rounded-full">
                        <Zap className="w-4 h-4 text-indigo-400 fill-indigo-400" />
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-300">Platinum Coverage Active</span>
                     </div>
                   )}
                </div>
                
                <div className="flex items-center gap-8 border-t border-white/10 pt-8">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Número de Reserva</p>
                      <p className="text-3xl font-black tracking-widest font-mono text-indigo-400 drop-shadow-[0_0_15px_rgba(129,140,248,0.3)]">{voucher.confirmation_number}</p>
                   </div>
                   <div className="h-10 w-px bg-white/10" />
                   <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Fecha Emisión</p>
                      <p className="text-xs font-black uppercase text-indigo-200">{new Date(voucher.created_at).toLocaleDateString('es-ES', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                   </div>
                </div>
             </div>
             
             <div className="bg-white rounded-[2rem] p-6 shadow-2xl relative z-10 transition-transform group-hover/voucher:scale-105 group-hover/voucher:rotate-2">
                <QrCode className="w-24 h-24 text-slate-900" />
                <div className="absolute -top-3 -right-3 bg-indigo-600 p-2 rounded-full shadow-lg border-4 border-slate-950">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <p className="text-[9px] text-center font-black text-slate-400 uppercase tracking-widest mt-3">Escanear para Check-In</p>
             </div>
          </div>

          <div className="p-12 lg:p-16 space-y-20">
             
             {/* Driver & Car Summary Section */}
             <div className="grid grid-cols-1 md:grid-cols-12 gap-16 items-start">
                
                {/* Driver Identity */}
                <div className="md:col-span-12 lg:col-span-5 space-y-12">
                   <div className="space-y-6">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-2">
                         <User className="w-5 h-5 text-indigo-500" /> Datos del Cliente
                      </h3>
                      <div className="space-y-4">
                         <h4 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-[0.9]">{lead.first_name} <br/> {lead.last_name}</h4>
                         <div className="flex flex-wrap items-center gap-4">
                            <span className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 font-bold text-sm text-slate-600">
                               <Phone className="w-4 h-4 text-indigo-500" /> {lead.phone}
                            </span>
                            <span className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 font-bold text-sm text-slate-600">
                               <Hash className="w-4 h-4 text-indigo-500" /> {lead.id.slice(0, 8).toUpperCase()}
                            </span>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-2 font-mono">
                         <Car className="w-5 h-5 text-indigo-500" /> Vehículo Seleccionado
                      </h3>
                      <div className="group relative">
                         <div className="absolute -inset-4 bg-indigo-600/5 rounded-[3rem] opacity-0 group-hover:opacity-100 transition-opacity" />
                         <div className="flex items-center gap-8 relative z-10 transition-transform group-hover:translate-x-2">
                            <div className="w-32 h-32 bg-slate-100 rounded-[2.5rem] overflow-hidden flex items-center justify-center p-4 ring-1 ring-slate-200">
                               <img src={category.image_url} className="w-full h-auto object-contain drop-shadow-2xl" />
                            </div>
                            <div>
                               <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mb-1">Clase {category.name.split(' ')[0]}</p>
                               <p className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-2">{category.name}</p>
                               <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Modelos 2024 - 2026</span>
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Logistics Itinerary */}
                <div className="md:col-span-12 lg:col-span-7 space-y-12">
                   <div className="space-y-6">
                       <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-indigo-500" /> Itinerario de Viaje
                       </h3>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                          {/* Connection line for visual flow */}
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white border-4 border-slate-100 rounded-full z-10 hidden md:block" />
                          <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-100 -translate-y-1/2 hidden md:block" />

                          {/* Pickup */}
                          <div className="relative z-20 group">
                             <div className="p-8 bg-indigo-50 border border-indigo-100 rounded-[2.5rem] space-y-6 transition-all group-hover:bg-indigo-600 group-hover:border-indigo-600 group-hover:translate-y-[-4px] overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-150 transition-transform">
                                   <MapPin className="w-12 h-12 text-indigo-900 group-hover:text-white" />
                                </div>
                                <div className="space-y-4">
                                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 group-hover:text-indigo-200">Entrega de Llaves</span>
                                   <p className="text-indigo-900 font-extrabold text-2xl group-hover:text-white leading-tight underline decoration-2 decoration-indigo-400/30 underline-offset-4">{lead.pickup_location}</p>
                                </div>
                                <div className="space-y-2 pt-4 border-t border-indigo-200/50 group-hover:border-white/20">
                                   <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm group-hover:text-indigo-100">
                                      <Calendar className="w-4 h-4" /> 
                                      {new Date(lead.pickup_date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} • 
                                      {new Date(lead.pickup_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                   </div>
                                </div>
                             </div>
                          </div>

                          {/* Return */}
                          <div className="relative z-20 group">
                             <div className="p-8 bg-slate-50 border border-slate-200 rounded-[2.5rem] space-y-6 transition-all hover:bg-slate-900 hover:border-slate-900 hover:translate-y-[-4px] overflow-hidden group/return">
                                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover/return:scale-150 transition-transform">
                                   <MapPin className="w-12 h-12 text-slate-900 group-hover/return:text-white" />
                                </div>
                                <div className="space-y-4">
                                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover/return:text-slate-500">Devolución</span>
                                   <p className="text-slate-900 font-extrabold text-2xl group-hover/return:text-white leading-tight underline decoration-2 decoration-slate-400/30 underline-offset-4">{lead.return_location}</p>
                                </div>
                                <div className="space-y-2 pt-4 border-t border-slate-200 group-hover/return:border-white/20">
                                   <div className="flex items-center gap-2 text-slate-500 font-bold text-sm group-hover/return:text-slate-300">
                                      <Calendar className="w-4 h-4" /> 
                                      {new Date(lead.return_date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} • 
                                      {new Date(lead.return_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                   </div>
                                </div>
                             </div>
                          </div>
                       </div>
                   </div>
                </div>
             </div>

             {/* Provider Details Bar */}
             <div className="flex flex-col md:flex-row gap-12 pt-20 border-t border-slate-100">
                <div className="flex flex-col gap-6 flex-1">
                   <div className="space-y-2">
                       <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Compañía Operadora</h4>
                       <div className="space-y-1">
                          <p className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{provider?.name || 'Local Partner Florida'}</p>
                           <div className="flex flex-col gap-2">
                              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                 ID Sistema: #{voucher.confirmation_number}
                              </div>
                              {voucher.provider_confirmation ? (
                                <div className="inline-flex flex-col gap-1 p-4 bg-indigo-600 rounded-[1.5rem] shadow-xl shadow-indigo-600/20 border border-white/10 group-hover:scale-105 transition-transform">
                                   <span className="text-[8px] font-black text-indigo-200 uppercase tracking-widest leading-none flex items-center gap-1.5">
                                      <Hash className="w-3 h-3" /> Confirmación {provider?.name || 'Rentadora'}
                                   </span>
                                   <p className="text-xl font-mono font-black text-white tracking-widest uppercase leading-none">
                                      {voucher.provider_confirmation}
                                   </p>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-100/50">
                                   <Info className="w-3 h-3" /> Confirmación en proceso
                                </div>
                              )}
                           </div>
                       </div>
                   </div>

                   {office && (
                     <div className="inline-flex items-center gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-indigo-600">
                           <Phone className="w-5 h-5" />
                        </div>
                        <div>
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Contacto Local 24/7</p>
                           <p className="text-sm font-black text-slate-700">{office.phone}</p>
                        </div>
                     </div>
                   )}
                </div>

                <div className="flex-[1.5] bg-slate-950 p-10 rounded-[3rem] space-y-6 border border-white/5 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
                   <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 flex items-center gap-2 relative z-10">
                      <Info className="w-4 h-4" /> Instrucciones de Recogida
                   </h4>
                   <p className="text-sm font-bold text-slate-400 leading-relaxed italic relative z-10">
                      {office?.notes || office?.hours 
                        ? `${office.hours ? `Horario: ${office.hours}. ` : ''}${office.notes || 'Nuestro representante le estará esperando en la zona de llegadas.'}`
                        : "Al llegar al aeropuerto, proceda a la zona de Rental Car Center. Nuestro representante le estará esperando con un cartel de su nombre o el logo de Go Easy Florida. Por favor presente su licencia de conducir y este voucher."
                      }
                   </p>
                </div>
             </div>

             {/* Protection & Benefits Row */}
             <div className="pt-20 border-t border-slate-100">
                <div className="flex flex-wrap items-center justify-center gap-y-10 gap-x-16">
                    <div className={`group flex items-center gap-4 font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-105 ${isPremium ? 'text-indigo-600' : 'text-slate-900'}`}>
                       <div className={`p-4 rounded-2xl ${isPremium ? 'bg-indigo-50 text-indigo-600 shadow-xl shadow-indigo-600/10' : 'bg-slate-100 text-slate-600'} transition-all group-hover:rotate-12`}>
                          <Shield className="w-6 h-6" />
                       </div> 
                       <div className="space-y-1">
                          <p className="leading-none">{isPremium ? 'Full Cover Platinum' : 'Seguro Estándar'}</p>
                          <p className={`text-[9px] font-bold ${isPremium ? 'text-indigo-400' : 'text-slate-400'}`}>{isPremium ? '$0 Deducible / Total' : 'CDW & TP Incluidos'}</p>
                       </div>
                    </div>

                    <div className="group flex items-center gap-4 font-black text-xs uppercase tracking-[0.2em] text-slate-900 transition-all hover:scale-105">
                       <div className="p-4 bg-slate-100 text-slate-600 rounded-2xl transition-all group-hover:rotate-12">
                          <UserPlus className="w-6 h-6" />
                       </div>
                       <div className="space-y-1">
                          <p className="leading-none">2do Conductor</p>
                          <p className="text-[9px] font-bold text-slate-400">Gratis (Mayores de 25)</p>
                       </div>
                    </div>

                    <div className="group flex items-center gap-4 font-black text-xs uppercase tracking-[0.2em] text-slate-900 transition-all hover:scale-105">
                       <div className="p-4 bg-slate-100 text-slate-600 rounded-2xl transition-all group-hover:rotate-12">
                          <Zap className="w-6 h-6" />
                       </div>
                       <div className="space-y-1">
                          <p className="leading-none">Kilometraje</p>
                          <p className="text-[9px] font-bold text-slate-400">Ilimitado Florida</p>
                       </div>
                    </div>

                    {isPremium && (
                      <div className="group flex items-center gap-4 font-black text-xs uppercase tracking-[0.2em] text-amber-600 transition-all hover:scale-105">
                         <div className="p-4 bg-amber-50 text-amber-600 shadow-xl shadow-amber-600/10 rounded-2xl transition-all group-hover:rotate-12">
                            <Zap className="w-6 h-6 fill-amber-600" />
                         </div>
                         <div className="space-y-1">
                            <p className="leading-none">SunPass</p>
                            <p className="text-[9px] font-bold text-amber-500">Ilimitado Prepago</p>
                         </div>
                      </div>
                    )}
                </div>
             </div>
          </div>

          <div className="bg-slate-50 p-8 text-center border-t border-slate-200 relative group overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-200 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-1000" />
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.6em] relative z-10">
                Reserva Procesada por Go Easy CRM · {new Date().getFullYear()} Florida VIP Services
             </p>
          </div>
       </main>

       {/* Support Section Decor (no-print) */}
       <footer className="mt-20 max-w-4xl mx-auto border-t border-slate-200 pt-16 no-print">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center text-center md:text-left">
             <div className="space-y-4">
                <h5 className="text-sm font-black text-slate-900 uppercase tracking-widest">Atención 24/7</h5>
                <p className="text-xs text-slate-500 font-bold leading-relaxed px-10 md:px-0">
                  Si tiene algún inconveniente al recoger su vehículo o necesita asistencia en el camino, 
                  contáctenos inmediatamente vía WhatsApp.
                </p>
             </div>
             
             <div className="flex flex-col items-center gap-4">
                <button className="bg-emerald-500 text-white w-full max-w-[200px] h-14 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all">
                   <Phone className="w-5 h-5" /> Soporte WhatsApp
                </button>
                <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-tighter">
                   <Globe className="w-4 h-4" /> GoEasyFlorida.com
                </div>
             </div>

             <div className="space-y-4 md:text-right">
                <h5 className="text-sm font-black text-slate-900 uppercase tracking-widest">Oficina Principal</h5>
                <p className="text-xs text-slate-500 font-bold">
                   1234 Ocean Drive, Suite 201<br/>
                   Miami Beach, FL 33139<br/>
                   United States
                </p>
             </div>
          </div>
          
          <div className="mt-16 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center justify-center gap-8">
             <div className="flex items-center gap-2"><Shield className="w-3 h-3" /> Pago Seguro SSL</div>
             <div className="flex items-center gap-2"><Mail className="w-3 h-3" /> tickets@goeasy.com</div>
             <div className="flex items-center gap-2 cursor-pointer hover:text-indigo-600 transition-colors">Términos del Servicio</div>
          </div>
       </footer>
    </div>
  )
}
