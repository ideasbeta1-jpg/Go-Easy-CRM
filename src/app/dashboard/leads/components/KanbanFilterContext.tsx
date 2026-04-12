'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export type SortOption = 'newest' | 'oldest' | 'highest_value' | 'lowest_value';
export type DateFilterOption = 'all' | 'today' | 'this_week' | 'this_month';

interface KanbanFilterContextType {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  agentFilter: string | null;
  setAgentFilter: (agentId: string | null) => void;
  dateFilter: DateFilterOption;
  setDateFilter: (date: DateFilterOption) => void;
}

const KanbanFilterContext = createContext<KanbanFilterContextType | undefined>(undefined)

export function KanbanFilterProvider({ children }: { children: ReactNode }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [agentFilter, setAgentFilter] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all')
  
  return (
    <KanbanFilterContext.Provider value={{ 
      searchTerm, setSearchTerm, 
      sortBy, setSortBy,
      agentFilter, setAgentFilter,
      dateFilter, setDateFilter
    }}>
      {children}
    </KanbanFilterContext.Provider>
  )
}

export function useKanbanFilter() {
  const context = useContext(KanbanFilterContext)
  if (!context) throw new Error('useKanbanFilter must be used within KanbanFilterProvider')
  return context
}
