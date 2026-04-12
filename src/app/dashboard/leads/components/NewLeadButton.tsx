'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { NewLeadModal } from './NewLeadModal'

interface NewLeadButtonProps {
  categories: any[]
  locations: any[]
  currentUserId: string
}

export function NewLeadButton({ categories, locations, currentUserId }: NewLeadButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-primary hover:bg-primary-dim text-white font-black px-4 md:px-6 py-2.5 md:py-3.5 rounded-full shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 md:gap-3 text-[10px] md:text-xs uppercase tracking-widest ml-auto lg:ml-0"
      >
        <Plus className="w-4 h-4 md:w-5 md:h-5" />
        <span>Nuevo Lead</span>
      </button>

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
