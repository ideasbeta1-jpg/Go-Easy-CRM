'use client'

import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type ChartPoint = { label: string; leads: number }

/**
 * Parte del gráfico que depende de `recharts` (pesado). Se carga con
 * next/dynamic desde PipelineChart para mantenerlo fuera del bundle inicial
 * del dashboard.
 */
export default function PipelineChartArea({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4052b6" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#4052b6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
          labelStyle={{ fontWeight: 700, color: '#0f172a' }}
          itemStyle={{ color: '#4052b6' }}
          formatter={(value) => [`${value} leads`, 'Leads']}
        />
        <Area
          type="monotone"
          dataKey="leads"
          stroke="#4052b6"
          strokeWidth={2}
          fill="url(#leadGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#4052b6' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
