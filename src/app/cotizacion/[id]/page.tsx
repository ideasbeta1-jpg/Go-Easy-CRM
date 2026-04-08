import { createAdminClient } from '@/utils/supabase/admin'
import { notFound } from 'next/navigation'
import { 
  Car, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  CreditCard, 
  ShieldCheck, 
  Tag, 
  Star, 
  Clock, 
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  LayoutGrid
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
  
  // Fetch quote and associated lead
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

  if (error || !quote) {
     return (
       <div className="min-h-screen py-20 px-6 bg-slate-50 flex items-center justify-center">
         <div className="max-w-md w-full bg-white p-12 rounded-[3rem] shadow-xl border border-slate-100 text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto">
               <Shield className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 leading-none tracking-tight">Error al cargar cotización</h1>
            <p className="text-slate-500 font-medium">No hemos podido encontrar los detalles de tu cotización en este momento.</p>
            <div className="text-[10px] font-mono text-slate-400 bg-slate-50 p-3 rounded-xl overflow-auto">
               ID: {id}
            </div>
         </div>
       </div>
     )
  }

  const { lead } = quote
  const category = lead.category

  const isPaid = session_id || lead.status === 'reserva_confirmada' || lead.status === 'voucher_enviado'

  // Mock days calculation (simplified)
  const pickup = new Date(lead.pickup_date)
  const returnDate = new Date(lead.return_date)
  const diffDays = Math.max(1, Math.ceil((returnDate.getTime() - pickup.getTime()) / (1000 * 3600 * 24)))
  
  // Taxes & Fees logic (mock)
  const subtotal = lead.total_amount || (category.daily_price * diffDays)
  const taxes = subtotal * 0.15 // 15% Taxes & Fees
  const grandTotal = subtotal + taxes
  const deposit = subtotal * 0.2 // 20% Deposit

  const isPremium = lead.rate_plan === 'premium'

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20">
       
       {/* High-Impact Header */}
       <header className="relative py-28 md:py-40 px-6 overflow-hidden bg-slate-950 text-white rounded-b-[5rem] md:rounded-b-[7rem] shadow-[0_30px_60px_rgba(0,0,0,0.1)]">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent)] transition-all duration-1000" />
          <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.02] [mask-image:radial-gradient(ellipse_at_center,white,transparent)]" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 blur-[150px] rounded-full" />
          
          {/* Success Banner if paid */}
          {isPaid && (
            <div className="max-w-4xl mx-auto mb-16 p-8 md:p-10 bg-emerald-500/10 backdrop-blur-xl rounded-[3.5rem] border border-emerald-500/20 text-white animate-in zoom-in-95 duration-700 shadow-2xl relative z-30">
               <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-center md:text-left">
                  <div className="w-16 h-16 bg-emerald-500 rounded-[1.5rem] flex items-center justify-center text-white shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                     <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                     <h2 className="text-3xl font-black tracking-tight leading-none uppercase italic">¡Reserva Asegurada! 🌴</h2>
                     <p className="text-emerald-100/70 font-medium">Tu pago ha sido procesado con éxito. Un agente te contactará pronto.</p>
                  </div>
               </div>
            </div>
          )}

          <div className="max-w-5xl mx-auto text-center relative z-10 space-y-10">
             <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.4em] mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Sparkles className="w-4 h-4" /> Oferta Personalizada Florida
             </div>
             <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-none animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                Tu Reserva <br/>está <span className="text-indigo-400 italic">Lista</span>
             </h1>
             <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                Hola <span className="text-white font-black">{lead.first_name}</span>! Hemos bloqueado esta oferta exclusiva para ti.
             </p>
          </div>
       </header>

       {/* Detailed Quote Breakdown */}
       <main className="max-w-6xl mx-auto px-6 -mt-16 md:-mt-24 relative z-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
             
             {/* Left Column: Vehicle & Features */}
             <div className="lg:col-span-2 space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
                
                {/* Vehicle Showcase Card */}
                <div className="bg-white border border-slate-100 shadow-[0_40px_100px_rgba(0,0,0,0.04)] rounded-[4rem] p-8 md:p-14 overflow-hidden relative group">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full -mr-20 -mt-20" />
                   
                   <div className="flex flex-col xl:flex-row items-start gap-12 md:gap-16">
                      <div className="w-full xl:w-1/2 relative">
                         {/* Removed clunky gray container, using cleaner presentation */}
                         <div className="relative z-10 group-hover:scale-110 transition-transform duration-1000 ease-out">
                            <img 
                              src={category.image_url} 
                              className="w-full h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.15)]" 
                              alt={category.name}
                            />
                         </div>
                         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-4 bg-black/10 blur-2xl rounded-full" />
                      </div>

                      <div className="w-full xl:w-1/2 space-y-6">
                         <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50/50 text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-xl border border-indigo-100/50">
                            <Car className="w-3 h-3" /> Categoría Seleccionada
                         </div>
                         <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none italic">{category.name}</h2>
                         <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-md">
                            {category.description}
                         </p>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
                            {(isPremium 
                              ? ['Millas Ilimitadas (USA)', 'Full Cover $0 Deducible', 'SunPass Prepago', 'Conductor Adicional', 'Asistencia 24/7 VIP'] 
                              : ['Millas Sólo Florida', 'Seguro CDW (Básico)', 'Asistencia 24/7', 'Conductor Adicional']
                            ).map(item => (
                               <div key={item} className="flex items-center gap-3 px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-2xl group/item hover:bg-white hover:shadow-sm transition-all duration-300">
                                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isPremium ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                     {isPremium ? <Sparkles className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{item}</span>
                               </div>
                            ))}
                         </div>
                      </div>
                   </div>

                   <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 pt-12 border-t border-slate-50">
                      {[ 
                        { label: 'Entrega', val: lead.pickup_location, icon: MapPin, color: 'text-blue-500' },
                        { label: 'Devolución', val: lead.return_location, icon: MapPin, color: 'text-indigo-500' },
                        { label: 'Duración', val: `${diffDays} días`, icon: Calendar, color: 'text-emerald-500' },
                        { label: 'Protección', val: isPremium ? 'Premium VIP' : 'Estándar', icon: ShieldCheck, color: 'text-amber-500' }
                       ].map(item => (
                         <div key={item.label} className="space-y-2 group/info">
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                               <item.icon className={`w-3.5 h-3.5 ${item.color}`} /> {item.label}
                            </span>
                            <p className="font-extrabold text-slate-900 tracking-tight leading-tight md:text-lg group-hover:text-indigo-600 transition-colors">{item.val}</p>
                         </div>
                       ))}
                   </div>
                </div>

                {/* Benefits / Assurance */}
                <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
                   {isPremium ? (
                      <div className="bg-indigo-600 rounded-[3.5rem] p-10 md:p-14 text-white group overflow-hidden relative shadow-[0_30px_60px_rgba(79,70,229,0.25)] border border-white/10">
                         <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[100px] rounded-full -mr-40 -mt-40" />
                         <Zap className="absolute top-12 right-12 w-24 h-24 text-white/5 group-hover:scale-125 transition-transform duration-1000" />
                         
                         <div className="flex flex-col md:flex-row gap-10 relative z-10 items-center">
                            <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-[2rem] flex items-center justify-center text-white border border-white/20 shrink-0">
                               <Sparkles className="w-10 h-10" />
                            </div>
                            <div className="space-y-4 text-center md:text-left">
                               <h3 className="text-4xl font-black tracking-tight leading-none italic uppercase">Premium Full Cover 👑</h3>
                               <p className="text-indigo-100 text-lg font-medium leading-relaxed max-w-2xl opacity-90">
                                  Viaja con absoluta tranquilidad. Cobertura total sin deducible, SunPass prepago incluido y libertad total de movimiento en cualquier estado de USA.
                               </p>
                               <div className="flex items-center justify-center md:justify-start gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">
                                  <CheckCircle2 className="w-4 h-4 text-white" /> 100% Sin Costos Ocultos en el Counter
                               </div>
                            </div>
                         </div>
                      </div>
                   ) : (
                      <div className="bg-white border border-slate-100 rounded-[3.5rem] p-10 md:p-14 text-slate-900 group overflow-hidden relative shadow-sm">
                         <div className="flex flex-col md:flex-row gap-10 relative z-10 items-center">
                            <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-500 border border-emerald-100 shrink-0 shadow-sm">
                               <ShieldCheck className="w-10 h-10" />
                            </div>
                            <div className="space-y-3 text-center md:text-left">
                               <h3 className="text-3xl font-black tracking-tight leading-none italic uppercase">Protección Estándar</h3>
                               <p className="text-slate-500 font-medium leading-relaxed max-w-2xl">
                                  Incluye cobertura CDW (daños). Millas limitadas a Florida, asistencia 24/7 y conductor adicional (+25). Ideal para recorridos locales.
                               </p>
                            </div>
                         </div>
                      </div>
                   )}
                </div>
             </div>

             {/* Right Column: Pricing & Payment */}
             <div className="animate-in fade-in slide-in-from-right-10 duration-1000 delay-500">
                <div className="bg-white border border-slate-100 shadow-[0_30px_80px_rgba(0,0,0,0.06)] rounded-[4.5rem] p-10 md:p-12 sticky top-12 space-y-10 group overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full" />
                   
                   <div className="space-y-3">
                      <div className="flex items-center gap-3">
                         <div className="w-1 h-6 bg-indigo-600 rounded-full" />
                         <h3 className="text-2xl font-black tracking-tight uppercase italic">Resumen</h3>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-4">Detalles de Facturación</p>
                   </div>

                   <div className="space-y-6 pl-4">
                      <div className="flex justify-between items-center group/price">
                         <span className="text-sm font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-600 transition-colors">Renta ({diffDays} días)</span>
                         <span className="text-lg font-black text-slate-900 tracking-tight">${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center group/price">
                         <span className="text-sm font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-600 transition-colors">Taxes & Fees (15%)</span>
                         <span className="text-lg font-black text-slate-900 tracking-tight">${taxes.toFixed(2)}</span>
                      </div>
                      
                      <div className="pt-10 mt-6 border-t border-slate-100">
                         <div className="flex justify-between items-end mb-2">
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Total Final</span>
                            <div className="flex items-center gap-1.5 text-[9px] text-emerald-600 font-black uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-full animate-bounce">
                               <Tag className="w-3 h-3" /> Best Price
                            </div>
                         </div>
                         <div className="text-6xl font-black text-slate-950 tracking-tighter leading-none">${grandTotal.toFixed(2)}</div>
                      </div>
                   </div>

                   <div className="bg-slate-50 border border-slate-100 rounded-[3.5rem] p-10 space-y-8 text-center relative overflow-hidden group/pay shadow-inner">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-3xl rounded-full" />
                      <div className="space-y-2 relative z-10">
                         <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.25em]">Pago Inicial Requerido (Depósito)</p>
                         <div className="inline-flex items-baseline gap-1">
                            <span className="text-6xl font-black text-indigo-700 tracking-tighter">${deposit.toFixed(2)}</span>
                         </div>
                         <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest pt-2">Saldo a pagar en counter</p>
                      </div>
                      
                      {isPaid ? (
                        <div className="w-full bg-emerald-500 text-white font-black py-6 rounded-[2rem] shadow-[0_20px_40px_rgba(16,185,129,0.3)] flex items-center justify-center gap-3 animate-in fade-in zoom-in-95">
                           <CheckCircle2 className="w-6 h-6 animate-pulse" /> RESERVA PAGADA
                        </div>
                      ) : (
                        <div className="space-y-4 relative z-10">
                           <a 
                             href={quote.stripe_link || '#'} 
                             className="w-full bg-indigo-600 text-white font-black text-xl py-6 rounded-[2.5rem] hover:bg-indigo-700 hover:shadow-[0_25px_50px_rgba(79,70,229,0.4)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-4 group/btn shadow-[0_20px_40px_rgba(79,70,229,0.2)] active:scale-95"
                           >
                              Confirmar Ahora
                              <ArrowRight className="w-6 h-6 group-hover/btn:translate-x-3 transition-transform duration-500" />
                           </a>
                           <div className="flex items-center justify-center gap-2 opacity-30 group-hover/pay:opacity-60 transition-opacity">
                              <CreditCard className="w-5 h-5" />
                              <span className="text-[8px] font-black uppercase tracking-[0.3em]">Checkout Seguro · Stripe</span>
                           </div>
                        </div>
                      )}
                   </div>

                   <div className="flex items-center gap-5 p-6 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200 group/vence">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm group-hover/vence:rotate-12 transition-transform duration-500">
                         <Clock className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div className="space-y-0.5">
                         <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none">Esta oferta vence el</p>
                         <p className="text-sm font-black text-slate-800 tracking-tight">
                            {new Date(quote.expires_at || Date.now() + 86400000).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                         </p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
       </main>

       {/* Floating Footer Decor */}
       <footer className="mt-40 py-16 text-center space-y-8 max-w-4xl mx-auto border-t border-slate-100">
          <div className="flex items-center justify-center gap-4">
             <div className="h-px w-12 bg-slate-200" />
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.6em]">Go Easy Florida · Premium Fleet</p>
             <div className="h-px w-12 bg-slate-200" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 px-6 max-w-xl mx-auto leading-relaxed">
             © 2026 Go Easy CRM. Todos los derechos reservados. Las imágenes son ilustrativas y pueden variar según disponibilidad técnica al momento de la entrega.
          </p>
          <div className="flex items-center justify-center gap-12 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
             <a href="#" className="hover:text-indigo-600 transition-all hover:scale-105">Ayuda</a>
             <a href="#" className="hover:text-indigo-600 transition-all hover:scale-105">Condiciones</a>
             <a href="#" className="hover:text-indigo-600 transition-all hover:scale-105">Privacidad</a>
          </div>
       </footer>
    </div>
  )
}
