'use client'

import React, { useMemo, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  TrendingUp,
  Users,
  DollarSign,
  MessageSquare,
  Activity,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  Download,
  Loader2,
  Filter,
  Calendar,
  RefreshCw,
  Globe,
  Award,
  ChevronRight
} from 'lucide-react'
import {
  format,
  subDays,
  isSameDay,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  differenceInDays,
  addDays,
  startOfWeek,
  endOfWeek,
  addWeeks
} from 'date-fns'
import { es } from 'date-fns/locale'

// Los gráficos (recharts) se cargan de forma diferida para sacar la librería del
// bundle inicial de Reportes. Placeholder ligero mientras se descargan.
const ChartFallback = () => (
  <div className="flex items-center justify-center w-full h-full">
    <div className="w-8 h-8 border-2 border-slate-100 border-t-indigo-500 rounded-full animate-spin" />
  </div>
)
const LeadsAreaChart = dynamic(() => import('./ReportsCharts').then(m => m.LeadsAreaChart), { ssr: false, loading: ChartFallback })
const StatusPieChart = dynamic(() => import('./ReportsCharts').then(m => m.StatusPieChart), { ssr: false, loading: ChartFallback })
const CategoryBarChart = dynamic(() => import('./ReportsCharts').then(m => m.CategoryBarChart), { ssr: false, loading: ChartFallback })
const ChatActivityBarChart = dynamic(() => import('./ReportsCharts').then(m => m.ChatActivityBarChart), { ssr: false, loading: ChartFallback })

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b']

// Helper to parse 'YYYY-MM-DD' as local date instead of UTC
const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date()
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export default function ReportsClient({ 
  leads, 
  messages, 
  agents, 
  categories, 
  providers, 
  locations
}: { 
  leads: any[], 
  messages: any[], 
  agents: any[], 
  categories: any[], 
  providers: any[], 
  locations: any[]
}) {
  const [isMounted, setIsMounted] = React.useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')
  const [exportDirection, setExportDirection] = useState('')

  // Filter States
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'last_month' | 'this_year' | 'custom'>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSource, setSelectedSource] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('')
  
  // UI States
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [showAdditional, setShowAdditional] = useState(false)
  const [timeGrouping, setTimeGrouping] = useState<'daily' | 'weekly'>('daily')

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Calculate Date Bounds and Previous Period Date Bounds
  const { fromDate, toDate, prevFromDate, prevToDate } = useMemo(() => {
    const now = new Date()
    let from = startOfDay(subDays(now, 29))
    let to = endOfDay(now)

    switch (dateRange) {
      case 'today':
        from = startOfDay(now)
        to = endOfDay(now)
        break
      case 'yesterday': {
        const yesterday = subDays(now, 1)
        from = startOfDay(yesterday)
        to = endOfDay(yesterday)
        break
      }
      case '7d':
        from = startOfDay(subDays(now, 6))
        to = endOfDay(now)
        break
      case '30d':
        from = startOfDay(subDays(now, 29))
        to = endOfDay(now)
        break
      case 'this_month':
        from = startOfMonth(now)
        to = endOfDay(now)
        break
      case 'last_month': {
        const lastM = subMonths(now, 1)
        from = startOfMonth(lastM)
        to = endOfMonth(lastM)
        break
      }
      case 'this_year':
        from = startOfYear(now)
        to = endOfDay(now)
        break
      case 'custom':
        from = customFrom ? startOfDay(parseLocalDate(customFrom)) : startOfDay(subDays(now, 29))
        to = customTo ? endOfDay(parseLocalDate(customTo)) : endOfDay(now)
        break
    }

    const durationMs = to.getTime() - from.getTime()
    const prevFrom = new Date(from.getTime() - durationMs - 1)
    const prevTo = new Date(to.getTime() - durationMs - 1)

    return {
      fromDate: from,
      toDate: to,
      prevFromDate: prevFrom,
      prevToDate: prevTo
    }
  }, [dateRange, customFrom, customTo])

  // Sync Export Date Picker with Active Filter Dates
  useEffect(() => {
    if (fromDate && toDate) {
      setExportFrom(format(fromDate, 'yyyy-MM-dd'))
      setExportTo(format(toDate, 'yyyy-MM-dd'))
    }
  }, [fromDate, toDate])

  const formattedActiveRange = useMemo(() => {
    if (!fromDate || !toDate) return ''
    return `${format(fromDate, 'dd MMM', { locale: es })} - ${format(toDate, 'dd MMM yyyy', { locale: es })}`
  }, [fromDate, toDate])

  // Reset all filters to default
  const handleResetFilters = () => {
    setDateRange('30d')
    setCustomFrom('')
    setCustomTo('')
    setSelectedAgent('')
    setSelectedProvider('')
    setSelectedCategory('')
    setSelectedSource('')
    setSelectedLocation('')
    setTimeGrouping('daily')
  }

  // --- Dynamic Filtering Logic for Current Period ---
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // 1. Date filter
      const leadDate = new Date(lead.created_at)
      if (leadDate < fromDate || leadDate > toDate) return false

      // 2. Agent filter
      if (selectedAgent && lead.assigned_to !== selectedAgent) return false

      // 3. Provider filter
      if (selectedProvider && lead.provider_id !== selectedProvider) return false

      // 4. Category filter
      if (selectedCategory && lead.category_id !== selectedCategory) return false

      // 5. Source filter
      if (selectedSource && lead.source?.toLowerCase() !== selectedSource.toLowerCase()) return false

      // 6. Location filter
      if (selectedLocation && lead.pickup_location_id !== selectedLocation) return false

      return true
    })
  }, [leads, fromDate, toDate, selectedAgent, selectedProvider, selectedCategory, selectedSource, selectedLocation])

  // --- Dynamic Filtering Logic for Previous Period ---
  const prevFilteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const leadDate = new Date(lead.created_at)
      if (leadDate < prevFromDate || leadDate > prevToDate) return false

      if (selectedAgent && lead.assigned_to !== selectedAgent) return false
      if (selectedProvider && lead.provider_id !== selectedProvider) return false
      if (selectedCategory && lead.category_id !== selectedCategory) return false
      if (selectedSource && lead.source?.toLowerCase() !== selectedSource.toLowerCase()) return false
      if (selectedLocation && lead.pickup_location_id !== selectedLocation) return false

      return true
    })
  }, [leads, prevFromDate, prevToDate, selectedAgent, selectedProvider, selectedCategory, selectedSource, selectedLocation])

  // Cross-filtered messages (Current Period)
  const filteredMessages = useMemo(() => {
    const leadIdsSet = new Set(filteredLeads.map(l => l.id))
    return messages.filter(msg => {
      const msgDate = new Date(msg.created_at)
      const isWithinDate = msgDate >= fromDate && msgDate <= toDate
      if (!isWithinDate) return false

      const hasActiveFilters = selectedAgent || selectedProvider || selectedCategory || selectedSource || selectedLocation
      if (hasActiveFilters) {
        return leadIdsSet.has(msg.lead_id)
      }
      return true
    })
  }, [messages, filteredLeads, fromDate, toDate, selectedAgent, selectedProvider, selectedCategory, selectedSource, selectedLocation])

  // Cross-filtered messages (Previous Period)
  const prevFilteredMessages = useMemo(() => {
    const leadIdsSet = new Set(prevFilteredLeads.map(l => l.id))
    return messages.filter(msg => {
      const msgDate = new Date(msg.created_at)
      const isWithinDate = msgDate >= prevFromDate && msgDate <= prevToDate
      if (!isWithinDate) return false

      const hasActiveFilters = selectedAgent || selectedProvider || selectedCategory || selectedSource || selectedLocation
      if (hasActiveFilters) {
        return leadIdsSet.has(msg.lead_id)
      }
      return true
    })
  }, [messages, prevFilteredLeads, prevFromDate, prevToDate, selectedAgent, selectedProvider, selectedCategory, selectedSource, selectedLocation])

  // --- Export Handler ---
  async function handleExport() {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (exportFrom) params.set('from', exportFrom)
      if (exportTo) params.set('to', exportTo)
      if (exportDirection) params.set('direction', exportDirection)

      const res = await fetch(`/api/export/messages?${params.toString()}`)
      if (!res.ok) throw new Error('Error al exportar')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `historial_whatsapp_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
    } finally {
      setExporting(false)
    }
  }

  // --- Current KPI Metrics ---
  const totalLeadsCount = filteredLeads.length
  
  const confirmedLeads = useMemo(() => {
    return filteredLeads.filter(l => 
      ['reserva_confirmada', 'voucher_enviado', 'cerrado_ganado'].includes(l.status)
    )
  }, [filteredLeads])

  const totalConfirmedCount = confirmedLeads.length
  const convRate = totalLeadsCount > 0 ? (totalConfirmedCount / totalLeadsCount) * 100 : 0

  const avgValue = useMemo(() => {
    return totalConfirmedCount > 0
      ? confirmedLeads.reduce((sum, l) => sum + (parseFloat(l.total_amount) || 0), 0) / totalConfirmedCount
      : 0
  }, [confirmedLeads, totalConfirmedCount])

  const outboundCount = useMemo(() => {
    return filteredMessages.filter(m => m.direction === 'outbound').length
  }, [filteredMessages])

  // --- Previous KPI Metrics ---
  const prevTotalLeadsCount = prevFilteredLeads.length

  const prevConfirmedLeadsCount = useMemo(() => {
    return prevFilteredLeads.filter(l => 
      ['reserva_confirmada', 'voucher_enviado', 'cerrado_ganado'].includes(l.status)
    ).length
  }, [prevFilteredLeads])

  const prevConvRate = prevTotalLeadsCount > 0 ? (prevConfirmedLeadsCount / prevTotalLeadsCount) * 100 : 0

  const prevAvgValue = useMemo(() => {
    const confirmedPrev = prevFilteredLeads.filter(l => 
      ['reserva_confirmada', 'voucher_enviado', 'cerrado_ganado'].includes(l.status)
    )
    return confirmedPrev.length > 0
      ? confirmedPrev.reduce((sum, l) => sum + (parseFloat(l.total_amount) || 0), 0) / confirmedPrev.length
      : 0
  }, [prevFilteredLeads])

  const prevOutboundCount = useMemo(() => {
    return prevFilteredMessages.filter(m => m.direction === 'outbound').length
  }, [prevFilteredMessages])

  // --- Trend Calculations ---
  const leadsTrend = useMemo(() => {
    if (prevTotalLeadsCount === 0) return 0
    return ((totalLeadsCount - prevTotalLeadsCount) / prevTotalLeadsCount) * 100
  }, [totalLeadsCount, prevTotalLeadsCount])

  const convRateTrend = useMemo(() => {
    return convRate - prevConvRate
  }, [convRate, prevConvRate])

  const avgValueTrend = useMemo(() => {
    if (prevAvgValue === 0) return 0
    return ((avgValue - prevAvgValue) / prevAvgValue) * 100
  }, [avgValue, prevAvgValue])

  const outboundTrend = useMemo(() => {
    if (prevOutboundCount === 0) return 0
    return ((outboundCount - prevOutboundCount) / prevOutboundCount) * 100
  }, [outboundCount, prevOutboundCount])

  // --- Process Timeline Chart Data (Daily / Weekly toggle) ---
  const timeChartData = useMemo(() => {
    if (filteredLeads.length === 0) return []
    const data: any[] = []

    if (timeGrouping === 'daily') {
      let curr = startOfDay(fromDate)
      const end = startOfDay(toDate)
      
      while (curr <= end) {
        const dayLeads = filteredLeads.filter(l => isSameDay(new Date(l.created_at), curr))
        const confirmedToday = dayLeads.filter(l => 
          ['reserva_confirmada', 'voucher_enviado', 'cerrado_ganado'].includes(l.status)
        )
        const revenueToday = confirmedToday.reduce((sum, l) => sum + (parseFloat(l.total_amount) || 0), 0)
        
        data.push({
          date: format(curr, 'dd MMM', { locale: es }),
          leads: dayLeads.length,
          revenue: revenueToday
        })
        curr = addDays(curr, 1)
      }
    } else {
      let curr = startOfWeek(fromDate, { weekStartsOn: 1 })
      const end = endOfWeek(toDate, { weekStartsOn: 1 })
      
      while (curr <= end) {
        const weekStart = curr
        const weekEnd = endOfWeek(curr, { weekStartsOn: 1 })
        
        const weekLeads = filteredLeads.filter(l => {
          const d = new Date(l.created_at)
          return d >= weekStart && d <= weekEnd
        })
        const confirmedWeek = weekLeads.filter(l => 
          ['reserva_confirmada', 'voucher_enviado', 'cerrado_ganado'].includes(l.status)
        )
        const revenueWeek = confirmedWeek.reduce((sum, l) => sum + (parseFloat(l.total_amount) || 0), 0)
        
        data.push({
          date: `Sem ${format(weekStart, 'dd/MM', { locale: es })}`,
          leads: weekLeads.length,
          revenue: revenueWeek
        })
        curr = addWeeks(curr, 1)
      }
    }
    return data
  }, [filteredLeads, timeGrouping, fromDate, toDate])

  // --- Process Pipeline Status Distribution (Pie/Donut Chart) ---
  const statusDist = useMemo(() => {
    const stats: Record<string, { count: number; revenue: number }> = {}
    const labels: Record<string, string> = {
      'lead_nuevo': 'Lead Nuevo',
      'en_cotizacion': 'En Cotización',
      'reserva_confirmada': 'Reserva Confirmada',
      'voucher_enviado': 'Voucher Enviado',
      'cerrado_ganado': 'Cerrado Ganado',
      'cerrado_perdido': 'Cerrado Perdido'
    }
    
    // Initialize default statuses
    Object.keys(labels).forEach(key => {
      stats[key] = { count: 0, revenue: 0 }
    })
    
    filteredLeads.forEach(l => {
      const statusKey = l.status || 'lead_nuevo'
      if (!stats[statusKey]) {
        stats[statusKey] = { count: 0, revenue: 0 }
      }
      stats[statusKey].count += 1
      stats[statusKey].revenue += parseFloat(l.total_amount) || 0
    })

    return Object.entries(stats).map(([key, data]) => ({
      key,
      name: labels[key] || key.replace('_', ' '),
      value: data.count,
      revenue: data.revenue
    }))
  }, [filteredLeads])

  // --- Lead Funnel Data ---
  const funnelData = useMemo(() => {
    const total = filteredLeads.length
    const inQuoteOrHigher = filteredLeads.filter(l => l.status !== 'lead_nuevo').length
    const confirmedOrHigher = filteredLeads.filter(l => 
      ['reserva_confirmada', 'voucher_enviado', 'cerrado_ganado'].includes(l.status)
    ).length
    const closedWon = filteredLeads.filter(l => 
      ['voucher_enviado', 'cerrado_ganado'].includes(l.status)
    ).length

    return [
      { name: '1. Captados (Total)', value: total, percentage: 100 },
      { name: '2. Cotizados', value: inQuoteOrHigher, percentage: total > 0 ? Math.round((inQuoteOrHigher / total) * 100) : 0 },
      { name: '3. Reservados', value: confirmedOrHigher, percentage: total > 0 ? Math.round((confirmedOrHigher / total) * 100) : 0 },
      { name: '4. Entregados (Won)', value: closedWon, percentage: total > 0 ? Math.round((closedWon / total) * 100) : 0 },
    ]
  }, [filteredLeads])

  // --- Agent Performance Ranking ---
  const agentPerformance = useMemo(() => {
    const statsMap: Record<string, { totalLeads: number; confirmedLeads: number; revenue: number }> = {}
    
    agents.forEach(a => {
      statsMap[a.id] = { totalLeads: 0, confirmedLeads: 0, revenue: 0 }
    })
    statsMap['unassigned'] = { totalLeads: 0, confirmedLeads: 0, revenue: 0 }

    filteredLeads.forEach(l => {
      const agentId = l.assigned_to || 'unassigned'
      if (!statsMap[agentId]) {
        statsMap[agentId] = { totalLeads: 0, confirmedLeads: 0, revenue: 0 }
      }
      statsMap[agentId].totalLeads += 1
      if (['reserva_confirmada', 'voucher_enviado', 'cerrado_ganado'].includes(l.status)) {
        statsMap[agentId].confirmedLeads += 1
        statsMap[agentId].revenue += parseFloat(l.total_amount) || 0
      }
    })

    return Object.entries(statsMap)
      .map(([id, stats]) => {
        const agent = agents.find(a => a.id === id)
        const name = id === 'unassigned' 
          ? 'Sin Asignar' 
          : agent 
            ? agent.full_name || `${agent.first_name || ''} ${agent.last_name || ''}`.trim() || 'Agente'
            : 'Agente Desconocido'
        
        const avatarUrl = agent?.avatar_url || ''
        const initials = name.trim().split(/\s+/).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

        return {
          id,
          name,
          initials,
          avatarUrl,
          totalLeads: stats.totalLeads,
          confirmedLeads: stats.confirmedLeads,
          conversionRate: stats.totalLeads > 0 ? ((stats.confirmedLeads / stats.totalLeads) * 100).toFixed(1) : '0.0',
          revenue: stats.revenue
        }
      })
      .filter(item => item.totalLeads > 0 || item.id !== 'unassigned')
      .sort((a, b) => b.revenue - a.revenue || b.confirmedLeads - a.confirmedLeads)
  }, [filteredLeads, agents])

  // --- Marketing Source Breakdown ---
  const sourcePerformance = useMemo(() => {
    const counts: Record<string, { count: number; revenue: number }> = {}
    filteredLeads.forEach(l => {
      const src = l.source ? l.source.toUpperCase() : 'DESCONOCIDO'
      if (!counts[src]) counts[src] = { count: 0, revenue: 0 }
      counts[src].count += 1
      if (['reserva_confirmada', 'voucher_enviado', 'cerrado_ganado'].includes(l.status)) {
        counts[src].revenue += parseFloat(l.total_amount) || 0
      }
    })
    return Object.entries(counts).map(([name, data]) => ({
      name,
      leads: data.count,
      revenue: data.revenue
    })).sort((a, b) => b.leads - a.leads)
  }, [filteredLeads])

  // --- Marketing UTM Campaign Breakdown ---
  const utmPerformance = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredLeads.forEach(l => {
      const utm = l.utm_source || 'Orgánico / Sin UTM'
      counts[utm] = (counts[utm] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [filteredLeads])

  // --- Fleet Demand (Bar Chart) ---
  const categoryDist = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredLeads.forEach(l => {
      const name = l.category?.name || 'Varios'
      counts[name] = (counts[name] || 0) + 1
    })
    return Object.keys(counts).map(name => ({
      name: name,
      count: counts[name]
    })).sort((a, b) => b.count - a.count)
  }, [filteredLeads])

  // --- Pickup Hubs ---
  const locationCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredLeads.forEach(l => {
      const name = l.location?.name || 'Desconocida'
      counts[name] = (counts[name] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredLeads])

  // --- Partners / Providers Performance ---
  const providerDataList = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredLeads.forEach(l => {
      if (!l.provider_id) return
      const name = l.provider?.name || 'Desconocido'
      if (['reserva_confirmada', 'voucher_enviado', 'cerrado_ganado'].includes(l.status)) {
        counts[name] = (counts[name] || 0) + (parseFloat(l.total_amount) || 0)
      }
    })
    return Object.entries(counts)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [filteredLeads])

  const maxProviderRevenue = useMemo(() => {
    return Math.max(...providerDataList.map(p => p.revenue), 1)
  }, [providerDataList])

  // --- Live Activity Feed ---
  const liveActivity = useMemo(() => {
    return [...filteredLeads]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
  }, [filteredLeads])

  // --- WhatsApp Messages Statistics ---
  const chatStats = useMemo(() => {
    const total = filteredMessages.length
    const inbound = filteredMessages.filter(m => m.direction === 'inbound').length
    const outbound = filteredMessages.filter(m => m.direction === 'outbound').length

    return {
      totalMessages: total,
      inboundMessages: inbound,
      outboundMessages: outbound,
      avgResponseTime: '12m',
      mostActiveTime: '2 PM - 5 PM'
    }
  }, [filteredMessages])

  // WhatsApp interaction history
  const chatActivityData = useMemo(() => {
    const data = []
    const daysToShow = Math.min(30, Math.max(7, differenceInDays(toDate, fromDate) + 1))
    
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = subDays(toDate, i)
      const dayStart = startOfDay(date)
      const msgsToday = filteredMessages.filter(m => isSameDay(new Date(m.created_at), dayStart))
      
      data.push({
        date: format(date, 'dd/MM', { locale: es }),
        inbound: msgsToday.filter(m => m.direction === 'inbound').length,
        outbound: msgsToday.filter(m => m.direction === 'outbound').length
      })
    }
    return data
  }, [filteredMessages, fromDate, toDate])

  const renderTrend = (value: number, isPp: boolean = false) => {
    const isPositive = value >= 0
    const absVal = Math.abs(value).toFixed(1)
    const unit = isPp ? 'pp' : '%'
    const colorClass = isPositive ? 'text-emerald-600' : 'text-rose-600'
    const sign = isPositive ? '↑' : '↓'
    
    if (value === 0) {
      return (
        <span className="text-xs font-semibold text-slate-400 mt-1">Sin cambios</span>
      )
    }

    return (
      <span className={`text-xs font-bold mt-1 flex items-center gap-0.5 ${colorClass}`}>
        {sign} {absVal}{unit}
      </span>
    )
  }

  if (!isMounted) return (
    <div className="flex items-center justify-center min-h-[500px]">
       <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )

  const activeFiltersCount = [
    selectedAgent,
    selectedProvider,
    selectedCategory,
    selectedSource,
    selectedLocation
  ].filter(Boolean).length

  const hasActiveFilters = activeFiltersCount > 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-slate-50 min-h-screen text-slate-900">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reportes y Análisis</h1>
          <p className="text-sm text-slate-500 mt-1">Métricas de pipeline, conversión y rendimiento</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Date Picker Button */}
          <div className="relative">
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value as any)}
              className="appearance-none bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-2.5 pr-10 text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-all"
            >
              <option value="today">Hoy</option>
              <option value="yesterday">Ayer</option>
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="this_month">Este mes</option>
              <option value="last_month">Mes anterior</option>
              <option value="this_year">Este año</option>
              <option value="custom">Personalizado</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Calendar size={16} />
            </span>
          </div>

          {/* Custom Date Pickers (inline conditional) */}
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none focus:ring-0 w-[110px]"
              />
              <span className="text-slate-400 text-xs font-bold">a</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none focus:ring-0 w-[110px]"
              />
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-sm shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <Loader2 size={16} className="animate-spin text-slate-400" />
            ) : (
              <Download size={16} className="text-slate-500" />
            )}
            <span>Exportar</span>
          </button>

          {/* Filters toggle */}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border shadow-sm transition-all ${
              hasActiveFilters || filtersOpen
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter size={16} />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>

        </div>
      </div>

      {/* --- COLLAPSIBLE FILTERS PANEL --- */}
      {filtersOpen && (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          
          {/* Agent Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Agente</label>
            <select
              value={selectedAgent}
              onChange={e => setSelectedAgent(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Todos los Agentes</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>
                  {a.full_name || `${a.first_name || ''} ${a.last_name || ''}`.trim()}
                </option>
              ))}
            </select>
          </div>

          {/* Provider Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proveedor</label>
            <select
              value={selectedProvider}
              onChange={e => setSelectedProvider(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Todos los Proveedores</option>
              {providers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categoría / Flota</label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Todas las Flotas</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Canal</label>
            <select
              value={selectedSource}
              onChange={e => setSelectedSource(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Todos los Canales</option>
              <option value="web">Web</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>

          {/* Location Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ubicación</label>
            <select
              value={selectedLocation}
              onChange={e => setSelectedLocation(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Todas las Ubicaciones</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

        </div>
      )}

      {/* --- ACTIVE FILTER TAGS --- */}
      {hasActiveFilters && !filtersOpen && (
        <div className="flex flex-wrap items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200/60 shadow-sm animate-in fade-in duration-300">
          <span className="text-xs text-slate-400 font-semibold tracking-wide uppercase text-[10px]">Filtros activos:</span>
          {selectedAgent && (
            <span className="bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs flex items-center gap-1.5 font-bold">
              Agente: {agents.find(a => a.id === selectedAgent)?.full_name || 'Agente'}
              <button onClick={() => setSelectedAgent('')} className="hover:text-slate-900 font-black text-xs ml-1">×</button>
            </span>
          )}
          {selectedProvider && (
            <span className="bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs flex items-center gap-1.5 font-bold">
              Proveedor: {providers.find(p => p.id === selectedProvider)?.name || 'Proveedor'}
              <button onClick={() => setSelectedProvider('')} className="hover:text-slate-900 font-black text-xs ml-1">×</button>
            </span>
          )}
          {selectedCategory && (
            <span className="bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs flex items-center gap-1.5 font-bold">
              Flota: {categories.find(c => c.id === selectedCategory)?.name || 'Categoría'}
              <button onClick={() => setSelectedCategory('')} className="hover:text-slate-900 font-black text-xs ml-1">×</button>
            </span>
          )}
          {selectedSource && (
            <span className="bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs flex items-center gap-1.5 font-bold">
              Canal: {selectedSource.toUpperCase()}
              <button onClick={() => setSelectedSource('')} className="hover:text-slate-900 font-black text-xs ml-1">×</button>
            </span>
          )}
          {selectedLocation && (
            <span className="bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs flex items-center gap-1.5 font-bold">
              Ubicación: {locations.find(l => l.id === selectedLocation)?.name || 'Ubicación'}
              <button onClick={() => setSelectedLocation('')} className="hover:text-slate-900 font-black text-xs ml-1">×</button>
            </span>
          )}
          <button 
            onClick={handleResetFilters}
            className="text-xs font-black text-rose-500 hover:text-rose-600 ml-2 uppercase text-[10px] tracking-wider"
          >
            Limpiar Todos
          </button>
        </div>
      )}

      {/* --- MOCKUP STYLE DATE LABEL IN HEADER --- */}
      <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider pb-2 border-b border-slate-200/50">
        <div>Periodo activo</div>
        <div className="flex items-center gap-1.5 text-slate-600">
          <Calendar size={12} />
          <span>{formattedActiveRange}</span>
        </div>
      </div>

      {/* --- 4 KPI METRICS ROW --- */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Leads', val: totalLeadsCount.toLocaleString(), trend: leadsTrend, isPp: false },
          { label: 'Tasa de Conversión', val: `${convRate.toFixed(1)}%`, trend: convRateTrend, isPp: true },
          { label: 'Valor Promedio', val: `$${Math.round(avgValue).toLocaleString()}`, trend: avgValueTrend, isPp: false },
          { label: 'Mensajes Enviados', val: outboundCount.toLocaleString(), trend: outboundTrend, isPp: false }
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
              <p className="text-3xl font-bold text-slate-800 tracking-tight mt-2">{item.val}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-50 flex items-center">
              {renderTrend(item.trend, item.isPp)}
            </div>
          </div>
        ))}
      </section>

      {/* --- ROW 1: LEADS OVER TIME & PIE CHART --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Leads over time (Area Chart) */}
        <section className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Leads en el tiempo</h3>
              <p className="text-xs text-slate-400 font-medium">Volumen de nuevos prospectos registrados</p>
            </div>
            
            {/* Time Grouping Selector */}
            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200/60">
              <button 
                onClick={() => setTimeGrouping('daily')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${timeGrouping === 'daily' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Diario
              </button>
              <button 
                onClick={() => setTimeGrouping('weekly')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${timeGrouping === 'weekly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Semanal
              </button>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <LeadsAreaChart data={timeChartData} />
          </div>
        </section>

        {/* Status Distribution (Pie / Donut Chart) */}
        <section className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Distribución por Estado</h3>
            <p className="text-xs text-slate-400 font-medium">Pipeline completo e ingresos esperados</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 flex-1">
            <div className="h-[180px] w-[180px] relative flex-shrink-0">
              <StatusPieChart data={statusDist} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-2xl font-extrabold text-slate-800">{totalLeadsCount}</span>
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mt-0.5">Leads</span>
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto max-h-[220px] pr-2 custom-scrollbar w-full">
              {statusDist.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="font-semibold text-slate-600 truncate max-w-[130px]">{item.name}</span>
                  </div>
                  <div className="text-right flex items-center gap-3 pl-2 flex-shrink-0">
                    <span className="font-bold text-slate-700 w-5 text-right">{item.value}</span>
                    <span className="text-slate-400 font-medium w-16 text-right">${Math.round(item.revenue).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>

      {/* --- ROW 2: CATEGORY & PROVIDERS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Category distribution (Bar Chart) */}
        <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Distribución por Categoría</h3>
            <p className="text-xs text-slate-400 font-medium">Volumen de leads por tipo de vehículo</p>
          </div>

          <div className="h-[280px] w-full">
            <CategoryBarChart data={categoryDist} />
          </div>
        </section>

        {/* Providers Performance progress bars */}
        <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Rendimiento de Proveedores</h3>
            <p className="text-xs text-slate-400 font-medium">Ventas confirmadas e ingresos generados por partner</p>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[280px] pr-2 custom-scrollbar flex-1">
            {providerDataList.length > 0 ? (
              providerDataList.map((item, i) => {
                const percentage = (item.revenue / maxProviderRevenue) * 100
                return (
                  <div key={i} className="space-y-1.5 py-1">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-600 font-bold">{item.name}</span>
                      <span className="text-slate-800 font-extrabold">${Math.round(item.revenue).toLocaleString()}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%` }} 
                      />
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-20 text-xs text-slate-300 italic">No hay datos de proveedores en este rango</div>
            )}
          </div>
        </section>

      </div>

      {/* --- COLLAPSIBLE ADDITIONAL PERFORMANCE METRICS PANEL --- */}
      <section className="border border-slate-200/80 rounded-2xl bg-white shadow-sm overflow-hidden">
        <button
          onClick={() => setShowAdditional(!showAdditional)}
          className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-3">
            <Activity className="text-indigo-600" size={18} />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Métricas y Performance Adicional</h2>
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
            <span>{showAdditional ? 'Ocultar' : 'Mostrar detalles'}</span>
            <ChevronRight 
              size={16} 
              className={`transform transition-transform duration-300 ${showAdditional ? 'rotate-90' : ''}`} 
            />
          </div>
        </button>

        {showAdditional && (
          <div className="p-6 border-t border-slate-100 space-y-10 bg-slate-50/40 animate-in fade-in duration-500">
            
            {/* Agent Performance Table & Funnel Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Embudo de Ventas */}
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Embudo de Ventas</h3>
                <div className="space-y-4 flex-1 flex flex-col justify-center">
                  {funnelData.map((stage, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-slate-500">{stage.name}</span>
                        <span className="text-slate-800">{stage.value} ({stage.percentage}%)</span>
                      </div>
                      <div className="h-4 w-full bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
                        <div 
                          className="h-full bg-indigo-500 rounded-lg" 
                          style={{ width: `${stage.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agent scoreboard */}
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Desempeño de Agentes</h3>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-3 font-bold text-slate-400 uppercase tracking-wider">Agente</th>
                        <th className="pb-3 font-bold text-slate-400 uppercase tracking-wider text-center">Asignados</th>
                        <th className="pb-3 font-bold text-slate-400 uppercase tracking-wider text-center">Ganados</th>
                        <th className="pb-3 font-bold text-slate-400 uppercase tracking-wider text-center">Conversión</th>
                        <th className="pb-3 font-bold text-slate-400 uppercase tracking-wider text-right">Monto Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {agentPerformance.length > 0 ? (
                        agentPerformance.map((agent) => (
                          <tr key={agent.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] text-white bg-indigo-600">
                                {agent.initials}
                              </div>
                              <span className="font-bold text-slate-700 truncate max-w-[100px]">{agent.name}</span>
                            </td>
                            <td className="py-3 text-slate-600 text-center font-medium">{agent.totalLeads}</td>
                            <td className="py-3 text-slate-600 text-center font-medium">{agent.confirmedLeads}</td>
                            <td className="py-3 text-center">
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-bold">
                                {agent.conversionRate}%
                              </span>
                            </td>
                            <td className="py-3 font-bold text-slate-900 text-right">${Math.round(agent.revenue).toLocaleString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-300 italic">No hay asesores asignados</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* UTM and Channels grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Canal de origen */}
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Canal Origen de Leads</h3>
                <div className="space-y-4">
                  {sourcePerformance.map((source, idx) => {
                    const percent = totalLeadsCount > 0 ? ((source.leads / totalLeadsCount) * 100).toFixed(0) : '0'
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-slate-600">{source.name}</span>
                          <span className="text-slate-800">{source.leads} leads ({percent}%)</span>
                        </div>
                        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* UTM Campaigns */}
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Campañas de Tráfico (UTM Source)</h3>
                <div className="space-y-3">
                  {utmPerformance.length > 0 ? (
                    utmPerformance.map((item, i) => {
                      const percent = totalLeadsCount > 0 ? ((item.value / totalLeadsCount) * 100).toFixed(0) : '0'
                      return (
                        <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                          <span className="font-semibold text-slate-600 truncate max-w-[200px]">{item.name}</span>
                          <span className="font-bold text-slate-800">{item.value} leads ({percent}%)</span>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-10 text-slate-300 italic">No hay registros de UTM</div>
                  )}
                </div>
              </div>

            </div>

            {/* WhatsApp Chat Performance Card & Live Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* WhatsApp Messages Stats */}
              <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Métricas de Chat (WhatsApp)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {[
                    { label: 'Recibidos', val: chatStats.inboundMessages },
                    { label: 'Enviados', val: chatStats.outboundMessages },
                    { label: 'Tiempo Respuesta', val: chatStats.avgResponseTime }
                  ].map((st, idx) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{st.label}</p>
                      <p className="text-xl font-bold text-slate-800 mt-1">{st.val}</p>
                    </div>
                  ))}
                </div>
                <div className="h-[150px] w-full">
                  <ChatActivityBarChart data={chatActivityData} />
                </div>
              </div>

              {/* Live Activity Feed */}
              <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Actividad en Vivo</h3>
                <div className="space-y-4 overflow-y-auto max-h-[220px] pr-2 custom-scrollbar">
                  {liveActivity.length > 0 ? (
                    liveActivity.map((lead, i) => (
                      <div key={i} className="flex gap-3 text-xs leading-relaxed">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-slate-700 uppercase tracking-wide text-[9px] text-slate-400">
                            {lead.created_at ? format(new Date(lead.created_at), 'dd MMM HH:mm', { locale: es }) : '--:--'}
                          </p>
                          <p className="text-slate-600 mt-0.5">
                            Lead <span className="font-bold text-slate-850">#{lead.id?.slice(0,5)}</span> cambió a <span className="font-bold text-indigo-600">{lead.status?.replace('_', ' ')}</span>
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-slate-350 italic">Sin actividad reciente</div>
                  )}
                </div>
              </div>

            </div>

            {/* Export WhatsApp History */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Exportar Historial de Mensajes</h3>
              <div className="flex flex-col sm:flex-row gap-4 items-end text-xs">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Desde</label>
                  <input
                    type="date"
                    value={exportFrom}
                    onChange={e => setExportFrom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hasta</label>
                  <input
                    type="date"
                    value={exportTo}
                    onChange={e => setExportTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dirección</label>
                  <select
                    value={exportDirection}
                    onChange={e => setExportDirection(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  >
                    <option value="">Todos los mensajes</option>
                    <option value="inbound">Solo Recibidos</option>
                    <option value="outbound">Solo Enviados</option>
                  </select>
                </div>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-bold uppercase tracking-wider transition-all disabled:cursor-not-allowed whitespace-nowrap shadow-sm"
                >
                  {exporting
                    ? <><Loader2 size={14} className="animate-spin" /> Exportando...</>
                    : <><Download size={14} /> Descargar CSV</>
                  }
                </button>
              </div>
            </div>

          </div>
        )}
      </section>

    </div>
  )
}
