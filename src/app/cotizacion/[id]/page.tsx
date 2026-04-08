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
  Zap
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
       <div className="p-10 bg-red-50 text-red-900 font-mono">
         <h1 className="text-2xl font-bold mb-4">Error loading quote</h1>
         <p>ID: {id}</p>
         <pre className="mt-4 p-4 bg-red-100 rounded">
           {JSON.stringify(error, null, 2)}
         </pre>
         {!quote && <p className="mt-4">No quote found for this ID.</p>}
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20">
       
       {/* High-Impact Header */}
       <header className="relative py-32 px-6 overflow-hidden bg-slate-950 text-white rounded-b-[4rem] shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,#4338ca,transparent)] opacity-40 animate-pulse transition-all duration-1000" />
          <div className="absolute bottom-10 left-10 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full" />
          
          {/* Success Banner if paid */}
          {isPaid && (
            <div className="max-w-4xl mx-auto mb-16 p-10 bg-emerald-600 rounded-[3.5rem] text-white space-y-4 animate-in zoom-in-95 duration-700 shadow-[0_30px_60px_rgba(16,185,129,0.4)] border-4 border-emerald-400/30 relative z-30">
               <div className="flex items-center justify-center gap-6">
                  <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center text-emerald-600 shadow-xl">
                     <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="text-left">
                     <h2 className="text-4xl font-black tracking-tight leading-none italic uppercase">¡Reserva Asegurada! 🌴</h2>
                     <p className="text-emerald-50 font-medium text-lg opacity-90">Tu pago ha sido procesado con éxito. Un agente te contactará en breve.</p>
                  </div>
               </div>
            </div>
          )}

          <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
             <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-black uppercase tracking-[0.3em] mb-4">
                <Sparkles className="w-4 h-4" /> Oferta Personalizada Florida
             </div>
             <h1 className="text-6xl md:text-8xl font-black tracking-tighter italic leading-none">
                Tu Reserva está <span className="text-indigo-500 underline decoration-indigo-300">Lista</span>
             </h1>
             <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-2xl mx-auto">
                Hola <span className="text-white font-black">{lead.first_name}</span>! Hemos bloqueado esta oferta para ti. Confirma tu reserva con el pago del depósito.
             </p>
          </div>
       </header>

       {/* Detailed Quote Breakdown */}
       <main className="max-w-6xl mx-auto px-6 -mt-16 relative z-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
             
             {/* Left Column: Vehicle & Features */}
             <div className="lg:col-span-2 space-y-12">
                
                {/* Vehicle Showcase Card */}
                <div className="bg-white border border-slate-100 shadow-2xl rounded-[3.5rem] p-12 overflow-hidden relative group">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full" />
                   
                   <div className="flex flex-col md:flex-row items-center gap-12">
                      <div className="w-full md:w-1/2 aspect-video bg-slate-50 rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-inner group-hover:scale-105 transition-transform duration-700">
                         <img 
                           src={category.image_url} 
                           className="w-full h-full object-cover" 
                           alt={category.name}
                         />
                      </div>
                      <div className="w-full md:w-1/2 space-y-4">
                         <div className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                            Categoría Seleccionada
                         </div>
                         <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-none italic">{category.name}</h2>
                         <p className="text-slate-500 font-medium text-lg leading-relaxed">
                            {category.description}
                         </p>
                         <div className="flex flex-wrap gap-3 pt-4">
                            {(isPremium 
                              ? ['Millas Ilimitadas (Cualquier Estado)', 'Full Cover $0 Deducible', 'SunPass Prepago', 'Conductor Adicional (+25)', 'Asistencia 24/7 VIP'] 
                              : ['Millas Ilimitadas (Sólo Florida)', 'Seguro CDW (Básico)', 'Asistencia 24/7', 'Conductor Adicional (+25)']
                            ).map(item => (
                               <span key={item} className={`px-4 py-2 bg-slate-50 font-black text-[10px] uppercase tracking-widest rounded-2xl flex items-center gap-2 ${isPremium ? 'text-indigo-600' : 'text-slate-500'}`}>
                                  {isPremium ? <Sparkles className="w-4 h-4 text-indigo-500" /> : <ShieldCheck className="w-4 h-4 text-emerald-500" />} {item}
                               </span>
                            ))}
                         </div>
                      </div>
                   </div>

                   <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-slate-50">
                      {[ 
                        { label: 'Pick-up', val: lead.pickup_location, icon: MapPin },
                        { label: 'Return', val: lead.return_location, icon: MapPin },
                        { label: 'Duración', val: `${diffDays} días`, icon: Calendar },
                        { label: 'Asistencia', val: isPremium ? '24/7 VIP' : '24/7 Estándar', icon: Star }
                       ].map(item => (
                         <div key={item.label} className="space-y-1">
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.2em] flex items-center gap-1">
                               <item.icon className="w-3 h-3" /> {item.label}
                            </span>
                            <p className="font-black text-slate-800 tracking-tight leading-tight">{item.val}</p>
                         </div>
                       ))}
                   </div>
                </div>

                {/* Benefits / Assurance */}
                <div className="flex flex-col gap-8">
                   {isPremium ? (
                      <div className="bg-indigo-900 rounded-[3rem] p-10 text-white flex flex-col justify-between group overflow-hidden relative shadow-[0_20px_40px_rgba(49,46,129,0.2)] border border-indigo-800">
                         <Zap className="absolute top-8 right-8 w-24 h-24 text-indigo-500/20 group-hover:scale-125 transition-transform duration-700" />
                         <div className="space-y-4 relative z-10">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-indigo-300 backdrop-blur-md">
                               <Sparkles className="w-7 h-7" />
                            </div>
                            <h3 className="text-3xl font-black tracking-tight leading-none italic">Premium Full Cover 👑</h3>
                            <p className="text-indigo-200 font-medium italic">Cobertura total sin deducible. Incluye SunPass prepago, millas en cualquier estado de USA y conductor adicional (+25).</p>
                         </div>
                         <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-300">
                            <CheckCircle2 className="w-4 h-4" /> 100% Sin Costos Ocultos
                         </div>
                      </div>
                   ) : (
                      <div className="bg-emerald-600 rounded-[3rem] p-10 text-white flex flex-col justify-between group overflow-hidden relative shadow-sm">
                         <ShieldCheck className="absolute top-8 right-8 w-24 h-24 text-white/10 group-hover:scale-125 transition-transform duration-700" />
                         <div className="space-y-4 relative z-10">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white backdrop-blur-md">
                               <ShieldCheck className="w-7 h-7" />
                            </div>
                            <h3 className="text-3xl font-black tracking-tight leading-none italic">Protección Estándar</h3>
                            <p className="text-emerald-100 font-medium italic">Cobertura CDW (daños). Millas limitadas a Florida, incluye asistencia 24/7 y conductor adicional (+25).</p>
                         </div>
                      </div>
                   )}
                </div>
             </div>

             {/* Right Column: Pricing & Payment */}
             <div className="space-y-8">
                <div className="bg-white border border-slate-100 shadow-2xl rounded-[3.5rem] p-10 sticky top-12 space-y-10">
                   <div className="space-y-2">
                      <h3 className="text-2xl font-black tracking-tighter uppercase italic">Desglose de Pago</h3>
                      <div className="h-1 w-12 bg-indigo-600 rounded-full" />
                   </div>

                   <div className="space-y-6">
                      <div className="flex justify-between items-center text-sm font-bold text-slate-500 italic">
                         <span>Renta Estándar ({diffDays} días)</span>
                         <span className="text-slate-900">${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-bold text-slate-500 italic">
                         <span>Taxes & Service Fees (15%)</span>
                         <span className="text-slate-900">${taxes.toFixed(2)}</span>
                      </div>
                      <div className="pt-6 border-t border-slate-100 flex justify-between items-end">
                         <div className="space-y-1">
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Total Reservación</span>
                            <div className="text-4xl font-black text-slate-900 tracking-tighter">${grandTotal.toFixed(2)}</div>
                         </div>
                         <div className="text-right">
                             <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-lg mb-1">
                                <Tag className="w-3 h-3" /> Best Price
                             </div>
                         </div>
                      </div>
                   </div>

                   <div className="bg-slate-50 rounded-[2.5rem] p-8 space-y-6 border border-slate-100 text-center relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 blur-3xl rounded-full" />
                      <div className="space-y-1">
                         <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Pago Inicial Requerido (Booking Fee)</p>
                         <p className="text-5xl font-black text-indigo-700 tracking-tighter">${deposit.toFixed(2)}</p>
                      </div>
                      <p className="text-xs text-slate-500 font-medium px-4">El resto de la tarifa se abona directamente al recibir el vehículo en Florida.</p>
                      
                      {isPaid ? (
                        <div className="w-full bg-emerald-50 text-emerald-700 font-bold py-5 rounded-3xl border border-emerald-100 flex items-center justify-center gap-3">
                           <CheckCircle2 className="w-5 h-5" /> Reserva Confirmada
                        </div>
                      ) : (
                        <a 
                          href={quote.stripe_link || '#'} 
                          className="w-full bg-slate-900 text-white font-black text-lg py-5 rounded-3xl hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 group"
                        >
                           Confirmar & Pagar
                           <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform text-indigo-400" />
                        </a>
                      )}

                      <div className="flex items-center justify-center gap-4 pt-2 opacity-40">
                         <CreditCard className="w-6 h-6" />
                         <span className="text-[10px] font-bold uppercase tracking-widest">Pago Seguro via Stripe</span>
                      </div>
                   </div>

                   <div className="flex items-center gap-4 text-slate-400 p-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      <Clock className="w-5 h-5 text-indigo-400 shrink-0" />
                      <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                         Esta cotización vence el <br/>
                         <span className="text-slate-600">{new Date(quote.expires_at || Date.now() + 86400000).toLocaleDateString()}</span>
                      </p>
                   </div>
                </div>
             </div>
          </div>
       </main>

       {/* Floating Footer Decor */}
       <footer className="mt-32 py-12 text-center space-y-4 border-t border-slate-100 max-w-4xl mx-auto">
          <p className="text-sm font-black text-slate-300 uppercase tracking-[0.5em]">Go Easy Florida · Premium Car Rental · 2026</p>
          <div className="flex items-center justify-center gap-12 text-slate-400 font-bold text-sm">
             <a href="#" className="hover:text-indigo-600 transition-colors">Términos del Servicio</a>
             <a href="#" className="hover:text-indigo-600 transition-colors">Política de Devolución</a>
          </div>
       </footer>
    </div>
  )
}
