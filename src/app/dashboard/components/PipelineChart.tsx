'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

// recharts es pesado; se carga solo en cliente y fuera del bundle inicial.
const PipelineChartArea = dynamic(() => import('./PipelineChartArea'), {
  ssr: false,
  loading: () => <div className="h-[160px] w-full animate-pulse rounded-xl bg-slate-50" />,
})

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

      <PipelineChartArea data={data[period]} />
    </div>
  )
}
