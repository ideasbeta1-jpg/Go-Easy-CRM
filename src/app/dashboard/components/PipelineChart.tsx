'use client'

import { useState } from 'react'
import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type ChartPoint = { label: string; leads: number }
type ChartDatasets = { '24h': ChartPoint[]; '7d': ChartPoint[]; '30d': ChartPoint[] }
type Period = '24h' | '7d' | '30d'

interface PipelineChartProps {
  data: ChartDatasets
}

export function PipelineChart({ data }: PipelineChartProps) {
  const [period, setPeriod] = useState<Period>('7d')

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h2 className="font-bold text-slate-900 flex items-center gap-1.5">
            Pipeline en tiempo real
            <span className="text-amber-400">⚡</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Leads ingresados por período</p>
        </div>
        <div className="flex gap-1 bg-slate-50 rounded-lg p-1 border border-slate-100">
          {(['24h', '7d', '30d'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                period === p
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data[period]} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
    </div>
  )
}
