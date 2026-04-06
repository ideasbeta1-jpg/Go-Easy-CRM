import { createClient } from '@/utils/supabase/server'
import { submitPublicLead } from '@/app/utils/actions/public'
import { 
  Car, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  ChevronRight, 
  ShieldCheck, 
  Star, 
  ArrowRight 
} from 'lucide-react'

export default async function PublicQuotePage({
  searchParams
}: {
  searchParams: { success?: string }
}) {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('daily_price', { ascending: true })

  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .order('name', { ascending: true })

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
       {/* Hero Section ... */}
       
       <main className="max-w-6xl mx-auto px-6 -mt-16 pb-32">
          {searchParams.success && (
            <div className="mb-12 p-8 bg-emerald-50 border border-emerald-100 rounded-[2.5rem] text-center space-y-4 animate-in fade-in slide-in-from-top-4">
               <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto text-emerald-500 shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
               </div>
               <h3 className="text-3xl font-black text-emerald-900 tracking-tight">¡Solicitud Enviada con Éxito! 🌴</h3>
               <p className="text-emerald-700 font-medium max-w-md mx-auto">Nuestro equipo de Go Easy Florida revisará tu solicitud y te enviará una cotización personalizada por WhatsApp en minutos.</p>
            </div>
          )}

          <div className="bg-white border border-slate-100 shadow-2xl rounded-[3rem] p-8 md:p-16 relative overflow-hidden">
             
             <form action={submitPublicLead}>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-16">
                   
                   {/* Inputs Area */}
                   <div className="lg:col-span-3 space-y-12">
                      <div className="space-y-2">
                         <h2 className="text-3xl font-black tracking-tight flex items-center gap-3 italic">
                            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0">1</div>
                            Datos de tu Reserva
                         </h2>
                         <div className="h-1 w-20 bg-indigo-600 rounded-full" />
                      </div>

                      <div className="space-y-10 group">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                               <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Nombre Completo</label>
                               <input 
                                  name="first_name"
                                  type="text" 
                                  required
                                  placeholder="Ej: Juan" 
                                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 placeholder:text-slate-300 font-bold focus:ring-2 focus:ring-indigo-600/20 transition-all"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Apellido</label>
                               <input 
                                  name="last_name"
                                  required
                                  type="text" 
                                  placeholder="Ej: Pérez" 
                                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 placeholder:text-slate-300 font-bold focus:ring-2 focus:ring-indigo-600/20 transition-all"
                               />
                            </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                               <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">WhatsApp de contacto</label>
                               <input 
                                  name="phone"
                                  required
                                  type="tel" 
                                  placeholder="+1 786-XX-XXXX" 
                                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 placeholder:text-slate-300 font-bold focus:ring-2 focus:ring-indigo-600/20 transition-all"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Correo Electrónico</label>
                               <input 
                                  name="email"
                                  required
                                  type="email" 
                                  placeholder="nombre@ejemplo.com" 
                                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 placeholder:text-slate-300 font-bold focus:ring-2 focus:ring-indigo-600/20 transition-all"
                               />
                            </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                               <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Fecha Recogida</label>
                               <div className="relative">
                                  <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600" />
                                  <input 
                                     name="pickup_date"
                                     required
                                     type="datetime-local" 
                                     className="w-full bg-slate-50 border-none rounded-2xl pl-14 pr-6 py-4 font-bold focus:ring-2 focus:ring-indigo-600/20 transition-all text-sm"
                                  />
                               </div>
                            </div>
                            <div className="space-y-2">
                               <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Fecha Devolución</label>
                               <div className="relative">
                                  <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500" />
                                  <input 
                                     name="return_date"
                                     required
                                     type="datetime-local" 
                                     className="w-full bg-slate-50 border-none rounded-2xl pl-14 pr-6 py-4 font-bold focus:ring-2 focus:ring-indigo-600/20 transition-all text-sm"
                                  />
                               </div>
                            </div>
                         </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                            <div className="space-y-2">
                               <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                                  <MapPin className="w-3 h-3" /> Pickup Location
                               </label>
                               <select name="pickup_location" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-sm focus:ring-2 focus:ring-indigo-600/20 transition-all appearance-none cursor-pointer">
                                  {locations?.map((loc) => (
                                     <option key={loc.id} value={loc.name}>{loc.name}</option>
                                  ))}
                               </select>
                            </div>
                            <div className="space-y-2">
                               <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                                  <MapPin className="w-3 h-3" /> Return Location
                               </label>
                               <select name="return_location" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-black text-sm focus:ring-2 focus:ring-indigo-600/20 transition-all appearance-none cursor-pointer">
                                  {locations?.map((loc) => (
                                     <option key={loc.id} value={loc.name}>{loc.name}</option>
                                  ))}
                               </select>
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* Categories Gallery Area */}
                   <div className="lg:col-span-2 space-y-12">
                      <div className="space-y-2">
                         <h2 className="text-3xl font-black tracking-tight flex items-center gap-3 italic">
                            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0">2</div>
                            Elige tu Vehículo
                         </h2>
                         <div className="h-1 w-20 bg-indigo-600 rounded-full" />
                      </div>

                      <div className="space-y-6">
                         {categories?.map((cat) => (
                            <div key={cat.id} className="relative group cursor-pointer">
                               <input type="radio" name="category_id" id={cat.id} value={cat.id} required className="peer hidden" />
                               <label 
                                  htmlFor={cat.id}
                                  className="block bg-slate-50 border-4 border-transparent peer-checked:border-indigo-600 peer-checked:bg-indigo-50/50 rounded-[2.5rem] p-6 transition-all group-hover:bg-slate-100"
                               >
                                  <div className="flex items-center gap-6">
                                     <div className="w-24 h-24 bg-white rounded-3xl overflow-hidden shadow-inner border border-slate-100 shrink-0">
                                        <img src={cat.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                     </div>
                                     <div className="space-y-1">
                                        <h4 className="text-xl font-black tracking-tight">{cat.name}</h4>
                                        <p className="text-sm font-black text-indigo-600">${cat.daily_price} <span className="text-[10px] text-slate-400 uppercase tracking-widest ml-1">/ día</span></p>
                                     </div>
                                  </div>
                               </label>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>

                {/* Footer Action */}
                <div className="mt-24 pt-16 border-t border-slate-100 flex flex-col items-center gap-8">
                   <div className="flex items-center gap-6 text-slate-400 font-black text-xs uppercase tracking-[0.3em]">
                      <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Seguro Incluido</span>
                      <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Cancelación Gratis</span>
                      <span className="flex items-center gap-2"><Star className="w-4 h-4 text-emerald-500" /> Soporte 24/7</span>
                   </div>
                   
                   <button 
                     type="submit"
                     className="bg-slate-900 text-white font-black text-2xl tracking-tight px-20 py-8 rounded-[3rem] hover:scale-105 active:scale-95 transition-all shadow-[0_35px_60px_-15px_rgba(30,41,59,0.3)] group flex items-center gap-4"
                   >
                      Solicitar Mi Cotización Florida
                      <ArrowRight className="w-8 h-8 group-hover:translate-x-3 transition-transform text-indigo-400" />
                   </button>
                </div>
             </form>
          </div>
       </main>

       {/* Floating Footer Decor */}
       <footer className="py-12 bg-slate-50 text-center space-y-4">
          <p className="text-sm font-black text-slate-300 uppercase tracking-[0.5em]">Go Easy Florida · 2026</p>
          <div className="flex items-center justify-center gap-12 text-slate-400 font-bold text-sm">
             <a href="#" className="hover:text-indigo-600 transition-colors">Términos</a>
             <a href="#" className="hover:text-indigo-600 transition-colors">Privacidad</a>
             <a href="#" className="hover:text-indigo-600 transition-colors">Contacto</a>
          </div>
       </footer>
    </div>
  )
}
