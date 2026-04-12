'use client'

import { Search, Filter, X, ChevronDown, Check } from 'lucide-react'
import { useKanbanFilter, SortOption, DateFilterOption } from './KanbanFilterContext'
import { useState, useRef, useEffect } from 'react'

interface Agent {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export function KanbanSearchControls({ agents = [] }: { agents?: Agent[] }) {
  const { 
    searchTerm, setSearchTerm, 
    sortBy, setSortBy, 
    agentFilter, setAgentFilter,
    dateFilter, setDateFilter
  } = useKanbanFilter()
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const activeFiltersCount = (sortBy !== 'newest' ? 1 : 0) + (agentFilter !== null ? 1 : 0) + (dateFilter !== 'all' ? 1 : 0)

  return (
    <>
      <div className="relative group flex-1 min-w-[200px] lg:w-64">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar lead (nombre, email, teléfono)..." 
          className="w-full pl-11 pr-10 py-2.5 md:py-3 bg-slate-100/50 rounded-full text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-all"
          >
            <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
        )}
      </div>

      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`flex items-center gap-2 px-3 md:px-4 py-2.5 md:py-3 transition-all font-bold text-sm rounded-full border ${
            activeFiltersCount > 0 
              ? 'bg-blue-50/80 text-primary border-primary/20 shadow-sm' 
              : 'text-slate-500 hover:text-primary hover:bg-slate-50/80 border-transparent hover:border-slate-200/60'
          }`}
        >
          <Filter className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="hidden sm:inline">Filtrar</span>
          {activeFiltersCount > 0 && (
            <span className="flex items-center justify-center w-4 h-4 text-[10px] bg-primary text-white rounded-full">
              {activeFiltersCount}
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 top-[calc(100%+0.5rem)] w-60 max-h-[80vh] overflow-y-auto overflow-x-hidden scrollbar-hide bg-white/90 backdrop-blur-xl border border-white rounded-[1.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.08)] p-2 z-50 animate-in fade-in slide-in-from-top-2">
            
            <div className="p-3 pb-2 text-xs font-black text-slate-400 uppercase tracking-wider">
              Ordenar Por
            </div>
            <div className="flex flex-col gap-1 px-1">
              {[
                { id: 'newest', label: 'Más Recientes' },
                { id: 'oldest', label: 'Más Antiguos' },
                { id: 'highest_value', label: 'Mayor Valor' },
                { id: 'lowest_value', label: 'Menor Valor' },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSortBy(option.id as SortOption)}
                  className={`flex items-center justify-between px-3 py-2 text-sm font-bold rounded-xl transition-colors ${
                    sortBy === option.id 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-slate-600 hover:bg-slate-100/50'
                  }`}
                >
                  {option.label}
                  {sortBy === option.id && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>

            <div className="p-3 pt-4 pb-2 text-xs font-black text-slate-400 uppercase tracking-wider border-t border-slate-100 mt-2">
              Fecha de Creación
            </div>
            <div className="flex flex-col gap-1 px-1">
              {[
                { id: 'all', label: 'Cualquier Fecha' },
                { id: 'today', label: 'Hoy' },
                { id: 'this_week', label: 'Esta Semana' },
                { id: 'this_month', label: 'Este Mes' },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setDateFilter(option.id as DateFilterOption)}
                  className={`flex items-center justify-between px-3 py-2 text-sm font-bold rounded-xl transition-colors ${
                    dateFilter === option.id 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-slate-600 hover:bg-slate-100/50'
                  }`}
                >
                  {option.label}
                  {dateFilter === option.id && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>

            {agents.length > 0 && (
              <>
                <div className="p-3 pt-4 pb-2 text-xs font-black text-slate-400 uppercase tracking-wider border-t border-slate-100 mt-2">
                  Asesor
                </div>
                <div className="flex flex-col gap-1 px-1">
                  {agents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => setAgentFilter(agent.id === agentFilter ? null : agent.id)}
                      className={`flex items-center gap-3 px-3 py-2 text-sm font-bold rounded-xl transition-colors ${
                        agentFilter === agent.id 
                          ? 'bg-primary/10 text-primary' 
                          : 'text-slate-600 hover:bg-slate-100/50'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 bg-slate-200">
                        <img 
                          src={agent.avatar_url || `https://ui-avatars.com/api/?name=${agent.full_name || 'Agente'}&background=f1f5f9&color=64748b`} 
                          alt={agent.full_name} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <span className="flex-1 text-left truncate">{agent.full_name || 'Agente Desconocido'}</span>
                      {agentFilter === agent.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="mt-2 pt-2 border-t border-slate-100 px-1">
              <button
                onClick={() => {
                  setSortBy('newest')
                  setAgentFilter(null)
                  setDateFilter('all')
                  setIsDropdownOpen(false)
                }}
                className="w-full text-center px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
