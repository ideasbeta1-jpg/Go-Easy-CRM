import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { PipelineChart } from './components/PipelineChart'

type ChartPoint = { label: string; leads: number }
type ChartDatasets = { '24h': ChartPoint[]; '7d': ChartPoint[]; '30d': ChartPoint[] }

export default async function DashboardPage() {
  const supabase = await createClient()

  const now = new Date()
  const startOf30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)


  const [
    { count: newLeads },
    { count: inQuote },
    { count: confirmed },
    { count: voucher },
    { count: won },
    { count: lost },
    { data: recentLeads },
    { data: monthLeads },
    { data: profiles },
    { data: categoryLeads },
    { count: unassignedNew },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'lead_nuevo').is('deleted_at', null),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'en_cotizacion').is('deleted_at', null),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'reserva_confirmada').is('deleted_at', null),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'voucher_enviado').is('deleted_at', null),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'cerrado_ganado').is('deleted_at', null),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'cerrado_perdido').is('deleted_at', null),
    supabase.from('leads').select('created_at').is('deleted_at', null).gte('created_at', startOf30d.toISOString()),
    supabase.from('leads').select('assigned_to, status, total_amount').is('deleted_at', null).gte('created_at', startOf30d.toISOString()),
    supabase.from('profiles').select('id, first_name, last_name, full_name'),
    supabase.from('leads').select('category_id, categories(name)').is('deleted_at', null).not('category_id', 'is', null),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'lead_nuevo').is('assigned_to', null).is('deleted_at', null),
  ])

  // Build chart datasets from raw leads
  const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  // 24h: group by 2-hour slots
  const start24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const leads24h = (recentLeads || []).filter(l => new Date(l.created_at) >= start24h)
  const chart24h: ChartPoint[] = Array.from({ length: 12 }, (_, i) => {
    const slotStart = new Date(start24h.getTime() + i * 2 * 60 * 60 * 1000)
    const slotEnd = new Date(slotStart.getTime() + 2 * 60 * 60 * 1000)
    const count = leads24h.filter(l => {
      const t = new Date(l.created_at)
      return t >= slotStart && t < slotEnd
    }).length
    const h = slotStart.getHours()
    return { label: `${h}:00`, leads: count }
  })

  // 7d: group by day
  const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const chart7d: ChartPoint[] = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(now)
    day.setDate(day.getDate() - (6 - i))
    day.setHours(0, 0, 0, 0)
    const nextDay = new Date(day)
    nextDay.setDate(nextDay.getDate() + 1)
    const count = (recentLeads || []).filter(l => {
      const t = new Date(l.created_at)
      return t >= day && t < nextDay
    }).length
    return { label: DAY_NAMES[day.getDay()], leads: count }
  })

  // 30d: group by week
  const chart30d: ChartPoint[] = Array.from({ length: 4 }, (_, i) => {
    const weekStart = new Date(now.getTime() - (4 - i) * 7 * 24 * 60 * 60 * 1000)
    const weekEnd = new Date(now.getTime() - (3 - i) * 7 * 24 * 60 * 60 * 1000)
    const count = (recentLeads || []).filter(l => {
      const t = new Date(l.created_at)
      return t >= weekStart && t < weekEnd
    }).length
    return { label: `S${i + 1}`, leads: count }
  })

  const chartDatasets: ChartDatasets = { '24h': chart24h, '7d': chart7d, '30d': chart30d }

  // Period-over-period change (last 7d vs prev 7d)
  const leadsThisWeek = (recentLeads || []).filter(l => new Date(l.created_at) >= start7d).length
  const leadsPrevWeek = (recentLeads || []).filter(l => {
    const t = new Date(l.created_at)
    return t >= startOf30d && t < start7d
  }).length
  const weeklyChange = leadsPrevWeek > 0
    ? Math.round(((leadsThisWeek - leadsPrevWeek) / leadsPrevWeek) * 100)
    : leadsThisWeek > 0 ? 100 : 0
  const weeklyChangeStr = weeklyChange >= 0 ? `+${weeklyChange}%` : `${weeklyChange}%`

  const stats = [
    { label: 'NUEVOS', value: newLeads ?? 0, change: weeklyChangeStr, positive: weeklyChange >= 0 },
    { label: 'COTIZACIÓN', value: inQuote ?? 0, change: null, positive: true },
    { label: 'CONFIRMADAS', value: confirmed ?? 0, change: null, positive: true },
    { label: 'VOUCHER', value: voucher ?? 0, change: null, positive: true },
    { label: 'GANADAS', value: won ?? 0, change: null, positive: true },
    { label: 'PERDIDAS', value: lost ?? 0, change: null, positive: false },
  ]

  // Top agents for current month
  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
  const agentStats: Record<string, { reservas: number; revenue: number }> = {}
  for (const lead of monthLeads || []) {
    if (!lead.assigned_to) continue
    if (!agentStats[lead.assigned_to]) agentStats[lead.assigned_to] = { reservas: 0, revenue: 0 }
    if (['cerrado_ganado', 'reserva_confirmada', 'voucher_enviado'].includes(lead.status)) {
      agentStats[lead.assigned_to].reservas++
      agentStats[lead.assigned_to].revenue += Number(lead.total_amount) || 0
    }
  }

  const AVATAR_COLORS = ['bg-blue-500', 'bg-orange-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500']
  const topAgents = Object.entries(agentStats)
    .sort((a, b) => b[1].reservas - a[1].reservas || b[1].revenue - a[1].revenue)
    .slice(0, 3)
    .map(([id, s], i) => {
      const p = profileMap[id]
      const name = p?.full_name || [p?.first_name, p?.last_name].filter(Boolean).join(' ') || 'Agente'
      const initials = name.trim().split(/\s+/).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
      return {
        rank: i + 1,
        initials,
        name,
        reservas: s.reservas,
        amount: s.revenue > 0 ? `$${s.revenue.toLocaleString('en-US')}` : '-',
        color: AVATAR_COLORS[i] || 'bg-slate-500',
      }
    })

  // If no agents with stats, show all profiles as placeholders
  const agentList = topAgents.length > 0 ? topAgents : (profiles || []).slice(0, 3).map((p, i) => {
    const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Agente'
    const initials = name.trim().split(/\s+/).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    return { rank: i + 1, initials, name, reservas: 0, amount: '-', color: AVATAR_COLORS[i] || 'bg-slate-500' }
  })

  // Categories breakdown from real leads
  const catCount: Record<string, number> = {}
  for (const lead of categoryLeads || []) {
    const name = (lead as any).categories?.name || 'Sin categoría'
    catCount[name] = (catCount[name] || 0) + 1
  }
  const totalCatLeads = (categoryLeads || []).length
  const CAT_COLORS = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500']
  const categories = Object.entries(catCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count], i) => ({
      name,
      pct: totalCatLeads > 0 ? Math.round((count / totalCatLeads) * 100) : 0,
      color: CAT_COLORS[i] || 'bg-slate-500',
    }))

  const actionCount = unassignedNew ?? newLeads ?? 0

  return (
    <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Inicio</h1>
          <p className="text-sm text-slate-400 mt-0.5">Vista densa · más métricas en menos espacio</p>
        </div>
        <div className="flex gap-2.5">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
            Esta semana
          </button>
          <Link
            href="/dashboard/leads"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dim transition-all shadow-lg shadow-primary/20"
          >
            + Nuevo Lead
          </Link>
        </div>
      </div>

      {/* Pipeline Chart */}
      <PipelineChart data={chartDatasets} />

      {/* 6 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col gap-1.5 hover:shadow-md transition-shadow"
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</span>
            <div className="flex items-end justify-between gap-1">
              <span className="text-3xl font-black text-slate-900 leading-none">{stat.value}</span>
              {stat.change && (
                <span className={`text-xs font-bold pb-0.5 ${stat.positive ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {stat.change}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom 3-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Agents */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-5">Top agentes (30 días)</h3>
          <div className="flex flex-col gap-4">
            {agentList.length === 0 ? (
              <p className="text-sm text-slate-400">Sin datos este mes</p>
            ) : (
              agentList.map((agent) => (
                <div key={agent.rank} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-300 w-5 shrink-0">#{agent.rank}</span>
                  <div className={`w-9 h-9 rounded-full ${agent.color} flex items-center justify-center text-white text-xs font-black shrink-0`}>
                    {agent.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-800 truncate">{agent.name}</div>
                    <div className="text-xs text-slate-400">{agent.reservas} reservas</div>
                  </div>
                  <span className="text-sm font-black text-slate-900 shrink-0">{agent.amount}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Popular Categories */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-5">Categorías populares</h3>
          <div className="flex flex-col gap-3.5">
            {categories.length === 0 ? (
              <p className="text-sm text-slate-400">Sin datos de categorías</p>
            ) : (
              categories.map((cat) => (
                <div key={cat.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 font-medium">{cat.name}</span>
                    <span className="font-bold text-slate-500">{cat.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${cat.color} rounded-full`}
                      style={{ width: `${cat.pct}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Suggested Action */}
        <div className="bg-slate-900 rounded-2xl p-6 flex flex-col gap-4 justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Acción sugerida</span>
            <h3 className="text-2xl font-black text-white mt-2 leading-tight">
              {actionCount} leads sin asignar
            </h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              {actionCount > 0
                ? `Hay ${actionCount} leads nuevos sin agente asignado. La tasa de cierre cae 60% después de 2 horas.`
                : 'Todos los leads nuevos tienen agente asignado. ¡Buen trabajo!'
              }
            </p>
          </div>
          <Link
            href="/dashboard/leads"
            className="bg-primary text-white text-sm font-bold py-3 px-6 rounded-xl text-center hover:bg-primary-dim transition-all block"
          >
            {actionCount > 0 ? 'Asignar ahora →' : 'Ver leads →'}
          </Link>
        </div>
      </div>
    </div>
  )
}
