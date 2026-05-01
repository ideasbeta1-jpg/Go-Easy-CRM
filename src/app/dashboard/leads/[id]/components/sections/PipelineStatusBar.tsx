'use client'

import { CheckCircle2 } from 'lucide-react'
import { STAGE_LABELS } from '@/lib/leads/transitions'

const STAGES = ['lead_nuevo', 'en_cotizacion', 'reserva_confirmada', 'voucher_enviado', 'cerrado_ganado', 'cerrado_perdido']

interface Props {
  currentStatus: string
  onStatusChange: (status: string) => void
}

export function PipelineStatusBar({ currentStatus, onStatusChange }: Props) {
  const currentIndex = STAGES.indexOf(currentStatus)

  return (
    <div className="max-w-[1600px] mx-auto px-1 sm:px-8 lg:px-12 pt-6 md:pt-8 -mb-4">
      <div className="bg-slate-50/80 backdrop-blur-sm rounded-full border border-slate-100 p-2 flex items-center lg:justify-between shadow-[0_5px_15px_rgba(0,0,0,0.03)] overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {STAGES.map((stage, idx) => {
          const isActive = currentStatus === stage
          const isPast = idx < currentIndex
          return (
            <button
              key={stage}
              onClick={() => onStatusChange(stage)}
              className={`flex-none min-w-[150px] flex-1 py-3 px-4 rounded-full text-[10px] lg:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                isActive ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' :
                isPast   ? 'bg-primary/5 text-primary hover:bg-primary/10' :
                           'text-slate-400 hover:bg-white hover:shadow-sm'
              }`}
            >
              {isPast && <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{STAGE_LABELS[stage]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
