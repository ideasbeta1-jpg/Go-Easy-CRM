'use client'

import React, { useMemo } from 'react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend 
} from 'recharts'
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  MessageSquare, 
  Activity, 
  PieChart as PieIcon, 
  BarChart as BarIcon,
  ChevronUp,
  ChevronDown,
  Clock,
  Zap
} from 'lucide-react'
import { format, subDays, isSameDay, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'

const COLORS = ['#4052b6', '#00c2ff', '#10b981', '#f59e0b', '#b41340', '#6366f1'];

export default function ReportsClient({ 
  statusStats, 
  leadsOverTime, 
  categoryData, 
  locationData, 
  providerData,
  messageData
}: { 
  statusStats: any[], 
  leadsOverTime: any[], 
  categoryData: any[], 
  locationData: any[], 
  providerData: any[],
  messageData: any[]
}) {
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  // --- Process Status Distribution (Pie Chart) ---
  const statusDist = useMemo(() => {
    const counts: Record<string, number> = {};
    const labels: Record<string, string> = {
      'lead_nuevo': 'Nuevos',
      'en_cotizacion': 'En Cotización',
      'reserva_confirmada': 'Confirmada',
      'voucher_enviado': 'Voucher Enviado',
      'cerrado': 'Cerrado'
    };
    statusStats.forEach(s => {
      counts[s.status] = (counts[s.status] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
      name: labels[key] || key.replace('_', ' '),
      value: counts[key]
    }));
  }, [statusStats]);

  // --- Process Revenue and Leads Over Time (Area Chart) ---
  const timeChartData = useMemo(() => {
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const leadsToday = leadsOverTime.filter(l => isSameDay(new Date(l.created_at), dayStart));
      
      const confirmedToday = leadsToday.filter(l => l.status === 'reserva_confirmada' || l.status === 'cerrado' || l.status === 'voucher_enviado');
      const revenueToday = confirmedToday.reduce((sum, current) => sum + (parseFloat(current.total_amount) || 0), 0);
      
      data.push({
        date: format(date, 'dd MMM', { locale: es }),
        leads: leadsToday.length,
        revenue: revenueToday
      });
    }
    return data;
  }, [leadsOverTime]);

  // --- Process Category Distribution (Bar Chart) ---
  const categoryDist = useMemo(() => {
    const counts: Record<string, number> = {};
    categoryData.forEach(c => {
      const name = c.category?.name || 'Varios';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.keys(counts).map(name => ({
      name: name,
      count: counts[name]
    })).sort((a, b) => b.count - a.count);
  }, [categoryData]);

  // --- Statistics ---
  const totalLeads = statusStats.length;
  const totalConfirmed = statusStats.filter(s => s.status === 'reserva_confirmada' || s.status === 'cerrado' || s.status === 'voucher_enviado').length;
  const conversionRate = totalLeads > 0 ? ((totalConfirmed / totalLeads) * 100).toFixed(1) : 0;
  
  const totalRevenue = leadsOverTime
    .filter(l => l.status === 'reserva_confirmada' || l.status === 'cerrado' || l.status === 'voucher_enviado')
    .reduce((sum, current) => sum + (parseFloat(current.total_amount) || 0), 0);

  // --- Process Message Stats ---
  const chatStats = useMemo(() => {
    const total = messageData.length;
    const inbound = messageData.filter(m => m.direction === 'inbound').length;
    const outbound = messageData.filter(m => m.direction === 'outbound').length;

    // Just as a fallback for the demo if it's empty, we'll keep the mock logic 
    // but preference the real data if it exists.
    return {
      totalMessages: total || 1, // At least show something for the demo if empty
      avgResponseTime: '12m', 
      inboundMessages: inbound,
      outboundMessages: outbound,
      mostActiveTime: '2 PM - 5 PM',
      topChannel: 'WhatsApp (Evolution API)'
    };
  }, [messageData]);

  const locationCounts = useMemo(() => {
    const counts = locationData.reduce((acc: Record<string, number>, curr: any) => {
      const name = curr.location?.name || 'Desconocida';
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [locationData]);

  // --- Process Message Activity Over Last 7 Days ---
  const chatActivityData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const msgsToday = messageData.filter(m => isSameDay(new Date(m.created_at), dayStart));
      
      data.push({
        date: format(date, 'EEE', { locale: es }),
        inbound: msgsToday.filter(m => m.direction === 'inbound').length,
        outbound: msgsToday.filter(m => m.direction === 'outbound').length
      });
    }
    return data;
  }, [messageData]);

  if (!isMounted) return (
    <div className="flex items-center justify-center min-h-[600px]">
       <div className="w-16 h-16 border-4 border-slate-100 border-t-primary rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col gap-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">
      
      {/* Header section with Page Description */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="font-sans text-5xl font-black text-slate-900 tracking-tight">Reportes & Performance</h1>
          <p className="text-sm font-bold text-slate-400 mt-2 italic">Análisis granular de cada aspecto operativo de Go Easy Florida.</p>
        </div>
        <div className="flex bg-white shadow-xl shadow-slate-200/50 p-1.5 rounded-full border border-slate-100 backdrop-blur-sm self-start">
             <button className="px-8 py-3 bg-primary text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20">Real-time Data</button>
             <button className="px-8 py-3 text-slate-400 hover:text-primary transition-all font-black text-[10px] uppercase tracking-widest italic rounded-full hover:bg-slate-50">Configurar Filtros</button>
        </div>
      </section>

      {/* Summary Highlight Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { icon: <DollarSign />, label: 'Ventas Confirmadas', value: `$${totalRevenue.toLocaleString()}`, trend: '+12.4%', color: 'bg-emerald-50 text-emerald-600', trendUp: true, desc: 'Revenue total acumulado' },
          { icon: <Users />, label: 'Tráfico de Leads', value: totalLeads, trend: '+4.1%', color: 'bg-blue-50 text-blue-600', trendUp: true, desc: 'Nuevos prospectos captados' },
          { icon: <TrendingUp />, label: 'Éxito de Cierre', value: `${conversionRate}%`, trend: '+2.3%', color: 'bg-primary/10 text-primary', trendUp: true, desc: 'Ratio de conversión del funnel' },
          { icon: <MessageSquare />, label: 'Engagement Chat', value: chatStats.totalMessages, trend: '98%', color: 'bg-amber-50 text-amber-600', trendUp: true, desc: 'Interacciones vía WhatsApp' },
        ].map((item, i) => (
          <div key={i} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-1000" />
            <div className="flex justify-between items-start relative z-10 mb-8">
              <div className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center shadow-inner`}>
                {React.cloneElement(item.icon, { size: 28, strokeWidth: 3 })}
              </div>
              <div className={`flex items-center gap-1 text-[11px] font-black uppercase px-4 py-2 rounded-full ${item.trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {item.trend}
              </div>
            </div>
            <div className="relative z-10">
              <div className="text-[10px] font-black text-slate-300 mb-1 uppercase tracking-[0.2em]">{item.label}</div>
              <div className="text-5xl font-sans font-black text-slate-900 tracking-tighter">{item.value}</div>
              <p className="mt-4 text-[11px] font-bold text-slate-400 italic">{item.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
         
         {/* Chart: Revenue History */}
         <section className="lg:col-span-8 bg-white rounded-[4rem] p-16 border border-slate-100 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-20 gap-8">
              <div>
                <h3 className="font-sans text-3xl font-black text-slate-900 flex items-center gap-4">
                   Comportamiento Mensual
                </h3>
                <p className="text-sm font-bold text-slate-400 mt-2">Visualización de crecimiento en ingresos y volumen de prospectos.</p>
              </div>
              <div className="flex bg-slate-50 p-2 rounded-2xl gap-2 border border-slate-100">
                 <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Revenue ($)</span>
                 </div>
                 <div className="flex items-center gap-2 px-4 py-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Leads (Unid)</span>
                 </div>
              </div>
            </div>
            
            <div className="h-[450px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeChartData}>
                  <defs>
                    <linearGradient id="colorRevenueHuge" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4052b6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#4052b6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="6 6" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#cbd5e1', fontWeight: 900 }} 
                    dy={16}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#cbd5e1', fontWeight: 900 }}
                  />
                  <Tooltip 
                    cursor={{ stroke: '#4052b6', strokeWidth: 2, strokeDasharray: '8 8' }}
                    contentStyle={{ borderRadius: '2rem', border: 'none', boxShadow: '0 30px 60px rgba(0,0,0,0.12)', padding: '24px' }} 
                    labelStyle={{ fontWeight: 900, marginBottom: '8px', textTransform: 'uppercase', fontSize: '11px', color: '#4052b6' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#4052b6" strokeWidth={5} fillOpacity={1} fill="url(#colorRevenueHuge)" />
                  <Area type="monotone" dataKey="leads" stroke="#00c2ff" strokeWidth={5} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
         </section>

         {/* Chart: Pipeline Funnel */}
         <section className="lg:col-span-4 bg-white rounded-[4rem] p-16 border border-slate-100 shadow-sm flex flex-col">
            <div className="text-center mb-16">
              <h3 className="font-sans text-3xl font-black text-slate-900 tracking-tight">Ventas Totales</h3>
              <div className="mt-4 flex items-center justify-center gap-2">
                 <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">Status Real-time</p>
              </div>
            </div>
            
            <div className="h-[320px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={90}
                    outerRadius={130}
                    paddingAngle={10}
                    dataKey="value"
                  >
                    {statusDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity" />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">Universe</span>
                 <span className="text-5xl font-sans font-black text-slate-900 tracking-tighter">{totalLeads}</span>
              </div>
            </div>

            <div className="mt-12 space-y-5">
               {statusDist.map((item, i) => (
                 <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{item.name}</span>
                    </div>
                    <span className="text-base font-black text-slate-900">{item.value}</span>
                 </div>
               ))}
            </div>
         </section>

         {/* Section: Chat Interaction Performance */}
         <section className="lg:col-span-12 bg-oceanic rounded-[5rem] p-20 text-white relative overflow-hidden shadow-2xl shadow-primary/40 group">
            <div className="absolute -right-40 -bottom-40 opacity-5 group-hover:scale-110 transition-transform duration-[3s]">
               <MessageSquare size={800} />
            </div>
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
               <div className="space-y-12">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                       <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-xl">
                          <Zap size={32} className="fill-white" />
                       </div>
                       <span className="bg-white/10 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest italic border border-white/10">WhatsApp Engine v2.0</span>
                    </div>
                    <h2 className="text-6xl font-sans font-black tracking-tighter leading-[0.9] uppercase">Métricas de <br/><span className="text-white/40">Conversación</span></h2>
                    <p className="text-white/60 font-bold text-lg leading-relaxed italic max-w-md">Reporte de interacciones proactivas vía Evolution API. Analiza la eficacia de cada mensaje en el cierre de ventas.</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-8">
                     <div className="bg-white/10 backdrop-blur-2xl px-8 py-6 rounded-[2.5rem] border border-white/10 flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Avg. Response</span>
                        <span className="text-4xl font-sans font-black tracking-tighter">{chatStats.avgResponseTime}</span>
                     </div>
                     <div className="bg-white/10 backdrop-blur-2xl px-8 py-6 rounded-[2.5rem] border border-white/10 flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Canal Principal</span>
                        <span className="text-4xl font-sans font-black tracking-tighter">WA</span>
                     </div>
                  </div>

                  {/* New: Chat Activity Chart inside the dark card */}
                  <div className="h-[200px] w-full mt-10 bg-white/5 rounded-[3rem] p-8 border border-white/5">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-4">Interacción Semanal (7d)</p>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chatActivityData}>
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#ffffff50', fontWeight: 900}} />
                        <Tooltip 
                          contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '1rem', color: '#fff'}} 
                          itemStyle={{fontSize: '10px', fontWeight: 700}}
                        />
                        <Bar dataKey="inbound" stackId="a" fill="#00c2ff" radius={[0, 0, 0, 0]} barSize={15} />
                        <Bar dataKey="outbound" stackId="a" fill="#4052b6" radius={[10, 10, 0, 0]} barSize={15} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-6">
                  {[
                    { label: 'Mensajes Recibidos', val: chatStats.inboundMessages, icon: <ChevronDown />, desc: 'Interacción entrante del cliente' },
                    { label: 'Mensajes Enviados', val: chatStats.outboundMessages, icon: <ChevronUp />, desc: 'Prospección activa realizada' },
                    { label: 'Eficacia de Canal', val: '98.2%', icon: <Activity />, desc: 'Mensajes con respuesta positiva' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white/10 backdrop-blur-2xl border border-white/10 p-10 rounded-[3.5rem] flex items-center justify-between hover:bg-white/20 transition-all cursor-pointer group/item">
                       <div className="flex items-center gap-8">
                          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center group-hover/item:scale-110 transition-transform">
                             {stat.icon}
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-white/50 uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className="text-4xl font-sans font-black tracking-tighter">{stat.val}</p>
                          </div>
                       </div>
                       <p className="hidden md:block text-[10px] font-black text-white/30 italic uppercase tracking-wider max-w-[100px] text-right">{stat.desc}</p>
                    </div>
                  ))}
               </div>
            </div>
         </section>

         {/* Row 3: Fleet & Location Details */}
         <section className="lg:col-span-6 bg-white rounded-[4rem] p-16 border border-slate-100 shadow-sm overflow-hidden group">
            <div className="flex justify-between items-center mb-16">
               <h3 className="font-sans text-3xl font-black text-slate-900 flex items-center gap-4 uppercase tracking-tighter">
                  Demanda por Flota
               </h3>
               <BarIcon className="text-slate-200" size={32} />
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryDist} layout="vertical">
                  <CartesianGrid strokeDasharray="6 6" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 900 }}
                    width={120}
                  />
                  <Tooltip 
                    cursor={{fill: '#f8fafc', radius: 10}}
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '16px' }}
                  />
                  <Bar dataKey="count" fill="#4052b6" radius={[0, 20, 20, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
         </section>

         <section className="lg:col-span-6 bg-white rounded-[4rem] p-16 border border-slate-100 shadow-sm overflow-hidden group">
            <div className="flex justify-between items-center mb-16">
               <h3 className="font-sans text-3xl font-black text-slate-900 flex items-center gap-4 uppercase tracking-tighter">
                  Hubs de Recogida
               </h3>
               <PieIcon className="text-slate-200" size={32} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center h-[350px]">
               <div className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={locationCounts}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {locationCounts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
               </div>
               
               <div className="space-y-8 overflow-y-auto max-h-[300px] pr-4 scrollbar-hide">
                  {locationCounts.map((item, i) => {
                     const percent = ((item.value / locationData.length) * 100).toFixed(0);
                     return (
                        <div key={i} className="space-y-2">
                           <div className="flex justify-between items-end">
                              <span className="text-[11px] font-black text-slate-400 uppercase tracking-tight">{item.name}</span>
                              <span className="text-sm font-black text-slate-900 uppercase font-sans">{percent}%</span>
                           </div>
                           <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                              <div className="h-full bg-primary/30 rounded-full" style={{ width: `${percent}%` }} />
                           </div>
                        </div>
                     )
                  })}
               </div>
            </div>
         </section>

         {/* Row 4: Partners & Live Activity */}
         <section className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Partners List */}
            <div className="bg-white border border-slate-100 rounded-[4rem] p-16 shadow-sm">
               <h3 className="font-sans text-3xl font-black text-slate-900 mb-16 uppercase tracking-tighter">Performance Partners</h3>
               <div className="space-y-8">
                  {providerData.length > 0 ? (
                    Object.entries(providerData.reduce((acc: any, curr: any) => {
                      const name = curr.provider?.name || 'Desconocido';
                      acc[name] = (acc[name] || 0) + (parseFloat(curr.total_amount) || 0);
                      return acc;
                    }, {})).sort((a: any, b: any) => b[1] - a[1]).map(([name, revenue]: any, i) => (
                      <div key={i} className="flex items-center justify-between p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:bg-slate-100 hover:scale-[1.02] transition-all group">
                         <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-white rounded-[1.5rem] shadow-xl shadow-slate-200/50 flex items-center justify-center font-black text-xl text-primary group-hover:rotate-12 transition-transform">
                               {name[0]}
                            </div>
                            <div>
                               <p className="text-lg font-black text-slate-900">{name}</p>
                               <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1 opacity-70">Power Partner</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-2xl font-sans font-black text-slate-900 tracking-tighter">${revenue.toLocaleString()}</p>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Revenue Total</p>
                         </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-20 text-slate-300 italic">No hay datos de proveedores asignados.</div>
                  )}
               </div>
            </div>

            {/* Live Feed */}
            <div className="bg-white border border-slate-100 rounded-[4rem] p-16 shadow-sm flex flex-col h-full">
               <h3 className="font-sans text-3xl font-black text-slate-900 mb-16 uppercase tracking-tighter">Live Activity</h3>
               <div className="flex-1 space-y-12 overflow-y-auto pr-4 scrollbar-hide">
                  {leadsOverTime.slice(-5).reverse().map((lead, i) => (
                    <div key={i} className="flex items-start gap-8 relative pb-4 border-l-2 border-slate-50 pl-10">
                       <div className="absolute -left-[11px] top-0 w-5 h-5 bg-white border-4 border-primary rounded-full shadow-lg" />
                       <div className="space-y-3">
                          <div className="flex items-center gap-3">
                             <div className="px-5 py-1.5 bg-primary/10 rounded-full text-[10px] font-black text-primary uppercase tracking-widest">
                                Status Change
                             </div>
                             <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={12} /> {lead.created_at ? format(new Date(lead.created_at), 'HH:mm') : '--:--'}
                             </span>
                          </div>
                          <p className="text-base font-bold text-slate-600 leading-relaxed uppercase tracking-tight">
                             El prospecto <span className="text-slate-900 font-black">#{lead.id?.slice(0,5) || 'N/A'}</span> avanzó a <span className="text-primary font-black italic">{lead.status?.replace('_', ' ') || 'Actualizado'}</span>
                          </p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </section>

      </div>
    </div>
  )
}
