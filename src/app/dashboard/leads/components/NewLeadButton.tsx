'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { NewLeadModal } from './NewLeadModal'

interface NewLeadButtonProps {
  categories: any[]
  locations: any[]
  currentUserId: string
  variant?: 'default' | 'inline'
}

export function NewLeadButton({ categories, locations, currentUserId, variant = 'default' }: NewLeadButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {variant === 'inline' ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold border border-dashed border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Añadir reserva
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-primary hover:bg-primary-dim text-white font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl transition-all flex items-center gap-2 text-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Reserva</span>
        </button>
      )}

      <NewLeadModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        categories={categories}
        locations={locations}
        currentUserId={currentUserId}
      />
    </>
  )
}
