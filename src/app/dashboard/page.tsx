import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // Fetch real counts from DB
  const { count: newLeads } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'lead_nuevo')
  const { count: inQuote } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'en_cotizacion')
  const { count: confirmed } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'reserva_confirmada')
  const { count: totalLeads } = await supabase.from('leads').select('*', { count: 'exact', head: true })

  const { data: recentLeads } = (await supabase
    .from('leads')
    .select('*, category:categories(name), location:locations(name)')
    .order('created_at', { ascending: false })
    .limit(4)) as { data: any[] | null }

  return (
    <div className="flex flex-col gap-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {/* Stats Grid - Precise Image Matching */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Card 1 - New Leads */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 hover:border-primary/20 transition-all duration-500 flex flex-col gap-6 shadow-sm hover:shadow-xl group">
          <div className="flex justify-between items-start">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">group</span>
            </div>
            <span className="bg-[#00c2ff]/10 text-[#00c2ff] px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-[#00c2ff]/10 italic">Real-time</span>
          </div>
          <div>
            <div className="text-5xl font-sans font-black text-slate-900 tracking-tighter">{newLeads}</div>
            <div className="text-xs font-bold text-slate-400 mt-2">Leads Nuevos</div>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600/30" style={{ width: '60%' }}></div>
          </div>
        </div>

        {/* Card 2 - In Quote */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 hover:border-primary/20 transition-all duration-500 flex flex-col gap-6 shadow-sm hover:shadow-xl group">
          <div className="flex justify-between items-start">
            <div className="w-16 h-16 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">trending_up</span>
            </div>
            <span className="bg-[#00c2ff]/10 text-[#00c2ff] px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-[#00c2ff]/10 italic">Real-time</span>
          </div>
          <div>
            <div className="text-5xl font-sans font-black text-slate-900 tracking-tighter">{inQuote}</div>
            <div className="text-xs font-bold text-slate-400 mt-2">En Cotización</div>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600/30" style={{ width: '40%' }}></div>
          </div>
        </div>

        {/* Card 3 - Confirmed */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 hover:border-primary/20 transition-all duration-500 flex flex-col gap-6 shadow-sm hover:shadow-xl group">
          <div className="flex justify-between items-start">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">assignment_turned_in</span>
            </div>
            <span className="bg-[#00c2ff]/10 text-[#00c2ff] px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-[#00c2ff]/10 italic">Real-time</span>
          </div>
          <div>
            <div className="text-5xl font-sans font-black text-slate-900 tracking-tighter">{confirmed}</div>
            <div className="text-xs font-bold text-slate-400 mt-2">Reservas Pagadas</div>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600/30" style={{ width: '80%' }}></div>
          </div>
        </div>

        {/* Card 4 - Histórico */}
        <div className="bg-oceanic p-10 rounded-[2.5rem] text-white hover:scale-[1.02] transition-all duration-500 flex flex-col gap-6 group shadow-2xl shadow-primary/20 relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">directions_car</span>
            </div>
            <span className="bg-white/20 backdrop-blur-md px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest italic font-sans">Real-time</span>
          </div>
          <div className="relative z-10">
            <div className="text-5xl font-sans font-black tracking-tighter">{totalLeads?.toLocaleString()}</div>
            <div className="text-xs font-bold opacity-80 mt-2">Total Histórico</div>
          </div>
          <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden relative z-10">
            <div className="h-full bg-white" style={{ width: '100%' }}></div>
          </div>
        </div>
      </section>

      {/* Bento Grid Part 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Recent Activity List */}
        <section className="lg:col-span-8 bg-white rounded-[3rem] p-12 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-16">
            <div>
              <h2 className="font-sans text-3xl font-black text-slate-900">Actividad Reciente</h2>
              <p className="text-sm font-bold text-slate-400 mt-2">Gestión de últimos movimientos y prospectos</p>
            </div>
            <Link href="/dashboard/leads" className="bg-slate-100/80 text-primary px-8 py-3.5 rounded-full font-sans font-bold text-sm tracking-tight hover:bg-primary hover:text-white transition-all duration-300">Ver Todo</Link>
          </div>
          
          <div className="flex flex-col gap-6">
            {recentLeads?.map((lead, idx) => {
              const avatars = [
                { bg: 'bg-blue-100', text: 'text-blue-700' },
                { bg: 'bg-emerald-100', text: 'text-emerald-700' },
                { bg: 'bg-amber-100', text: 'text-amber-700' },
                { bg: 'bg-slate-100', text: 'text-slate-700' }
              ];
              const colors = avatars[idx % avatars.length];
              return (
                <Link key={lead.id} href={`/dashboard/leads/${lead.id}`} className="flex items-center justify-between p-6 hover:bg-slate-50/80 rounded-[2rem] transition-all duration-500 cursor-pointer group">
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-full ${colors.bg} ${colors.text} flex items-center justify-center font-sans font-black text-xl italic group-hover:scale-110 transition-transform`}>
                      {lead.first_name?.[0].toUpperCase()}{lead.last_name?.[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-sans font-black text-lg text-slate-800 transition-colors">{lead.first_name} {lead.last_name}</div>
                      <div className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tight opacity-70">
                        {lead.category?.name || 'SUV Luxury'} <span className="mx-2 opacity-30">/</span> {lead.location?.name || 'Miami Int Airport'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-12">
                    <div className="hidden xl:flex flex-col items-end">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-1">Categoría</div>
                      <div className="text-sm font-black text-slate-800 font-sans tracking-tight">{lead.category?.name || 'Premium Fleet'}</div>
                    </div>
                    <span className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest italic ${
                      lead.status === 'lead_nuevo' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100/80 text-slate-500'
                    }`}>
                      {lead.status.replace('_', ' ')}
                    </span>
                  </div>
                </Link>
              );
            })}

            {(!recentLeads || recentLeads.length === 0) && (
              <div className="py-24 text-center bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
                <p className="text-slate-400 font-bold text-lg italic tracking-tight uppercase opacity-50">Silencio en el puerto de leads</p>
              </div>
            )}
          </div>
        </section>

        {/* Sidebar Info/Promos */}
        <aside className="lg:col-span-4 flex flex-col gap-12">
          <div className="bg-white rounded-[3rem] p-12 flex flex-col gap-10 border border-slate-100 shadow-sm relative overflow-hidden">
            <h3 className="font-sans font-black text-2xl text-slate-900 tracking-tight">Top Performance</h3>
            <div className="flex flex-col gap-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-400">Conversion Rate</span>
                  <span className="text-lg font-black text-emerald-600 font-sans italic tracking-tighter">24.5%</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-emerald-500/30 w-1/4 rounded-full"></div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-400">Avg. Order Value</span>
                  <span className="text-lg font-black text-primary font-sans italic tracking-tighter">$485.00</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-primary/30 w-3/4 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-oceanic rounded-[3rem] p-12 relative overflow-hidden text-white shadow-2xl shadow-primary/20 group cursor-pointer active:scale-[0.98] transition-all duration-500 min-h-[400px] flex flex-col justify-between">
            <div className="relative z-10 flex flex-col gap-4">
              <h3 className="font-sans font-black text-3xl tracking-tight leading-tight">Summer Drive '24</h3>
              <p className="text-sm font-bold leading-relaxed opacity-80 mt-2 italic max-w-[200px]">Prepare the convertible fleet for the seasonal peak in Miami Beach.</p>
            </div>
            
            <button className="relative z-10 bg-white text-primary px-10 py-5 rounded-full font-sans font-black text-xs uppercase tracking-widest shadow-xl group-hover:scale-105 transition-all w-full">Schedule Fleet</button>
            
            <div className="absolute -right-16 -bottom-16 opacity-10 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[300px] select-none">beach_access</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Floating Action Button */}
      <button className="fixed bottom-12 right-12 bg-primary text-white w-20 h-20 rounded-full flex items-center justify-center shadow-[0_20px_50px_rgba(64,82,182,0.4)] hover:scale-110 active:scale-95 transition-all z-50 border-[6px] border-white group">
        <span className="material-symbols-outlined text-4xl font-bold group-hover:rotate-90 transition-transform duration-500">add</span>
      </button>
    </div>
  )
}
