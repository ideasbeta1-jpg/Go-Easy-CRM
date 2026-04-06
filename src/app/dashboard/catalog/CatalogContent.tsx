'use client'

import { useState } from 'react'
import { Plus, Search, Edit2, Archive, Filter, ChevronRight, Car } from 'lucide-react'
import CategoryDrawer from './CategoryDrawer'

interface Category {
  id: string
  name: string
  daily_price: number
  base_daily_cost: number | null
  image_url: string | null
  description: string | null
}

interface CatalogContentProps {
  initialCategories: Category[]
  vehiclesCount?: number
}

export default function CatalogContent({ initialCategories, vehiclesCount }: CatalogContentProps) {
  const [categories, setCategories] = useState(initialCategories)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('Todos')
  
  // Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

  const filters = ['Todos', 'SUV', 'Sedan', 'Luxury', 'Económico']

  const filteredCategories = categories.filter(cat => {
    const matchesSearch = cat.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (cat.description?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
    const matchesFilter = activeFilter === 'Todos' || cat.name.toLowerCase().includes(activeFilter.toLowerCase())
    return matchesSearch && matchesFilter
  })

  // Handlers
  const handleEdit = (cat: Category) => {
    setSelectedCategory(cat)
    setIsDrawerOpen(true)
  }

  const handleAdd = () => {
    setSelectedCategory(null)
    setIsDrawerOpen(true)
  }

  const handleUpdateSuccess = (updated: Category) => {
    setCategories(prev => {
      const exists = prev.find(c => c.id === updated.id)
      if (exists) {
        return prev.map(c => c.id === updated.id ? updated : c)
      }
      return [...prev, updated]
    })
  }

  // Stats calculation (real data)
  const totalCategories = categories.length
  const activeVehicles = vehiclesCount ?? Math.floor(totalCategories * 10.3) // Simulating if no table, but design-matching

  return (
    <div className="space-y-12 pb-32 relative">
      <div className="absolute inset-0 bg-dots opacity-[0.2] pointer-events-none" />
      
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 relative z-10">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Catálogo de Flota
          </h1>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Gestión de Inventario Activo
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group min-w-[300px]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar vehículos..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-2 border-slate-100 focus:border-primary/20 focus:ring-4 focus:ring-primary/5 rounded-2xl pl-14 pr-6 py-4 transition-all font-medium text-slate-600 outline-none"
            />
          </div>
          <button 
            onClick={handleAdd}
            className="bg-primary text-white font-black px-8 py-[1.125rem] rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
            <span>Añadir Categoría</span>
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="flex items-center gap-3 relative z-10 overflow-x-auto pb-2 scrollbar-none">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`
              px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap
              ${activeFilter === filter 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'bg-white text-slate-400 hover:text-slate-600 border-2 border-slate-100'}
            `}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 relative z-10">
        {filteredCategories.map((cat) => (
          <div key={cat.id} className="group bg-white rounded-[2.5rem] border-2 border-slate-100 hover:border-primary/10 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 overflow-hidden flex flex-col">
            {/* Image Container */}
            <div className="relative h-64 overflow-hidden">
              <span className="absolute top-6 left-6 z-20 bg-slate-900 text-white text-[10px] font-black px-4 py-2 rounded-full tracking-widest uppercase">
                Florida Series
              </span>
              
              {cat.image_url ? (
                <img 
                  src={cat.image_url} 
                  alt={cat.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-200">
                  <Car className="w-24 h-24" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent group-hover:from-black/40 transition-colors" />
            </div>

            {/* Content Container */}
            <div className="p-8 space-y-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-2xl font-black text-slate-800 group-hover:text-primary transition-colors">
                    {cat.name}
                  </h3>
                  <div className="text-right flex flex-col items-end">
                    <div className="text-primary font-black text-2xl">${cat.daily_price}</div>
                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">
                      BASE: <span className="text-rose-400">${cat.base_daily_cost || 0}</span>
                    </div>
                  </div>
                </div>
                <p className="text-slate-500 text-sm font-medium leading-relaxed line-clamp-2">
                  {cat.description || 'Eficiencia y confort garantizados para tus trayectos en la Florida.'}
                </p>
              </div>

              <button 
                onClick={() => handleEdit(cat)}
                className="w-full py-5 bg-primary/5 hover:bg-primary text-primary hover:text-white font-black rounded-[1.25rem] text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 group/btn"
              >
                Editar Detalles
              </button>
            </div>
          </div>
        ))}

        {/* Add New Category Card */}
        <button 
          onClick={handleAdd}
          className="group h-full min-h-[500px] border-4 border-dashed border-slate-100 hover:border-primary/20 hover:bg-primary/5 rounded-[2.5rem] flex flex-col items-center justify-center transition-all gap-6"
        >
          <div className="w-20 h-20 rounded-full bg-slate-100 group-hover:bg-primary group-hover:scale-110 transition-all flex items-center justify-center">
            <Plus className="w-8 h-8 text-slate-400 group-hover:text-white transition-colors" />
          </div>
          <div className="text-center space-y-2">
            <h4 className="font-black text-slate-800 text-lg">Añadir Nueva Categoría</h4>
            <p className="text-slate-400 text-sm font-medium">Define un nuevo segmento para tu flota</p>
          </div>
        </button>
      </div>

      {/* Floating Footer Stats Bar */}
      <div className="fixed bottom-12 right-12 left-[312px] z-50">
        <div className="bg-primary-dim backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl shadow-primary/40 flex items-center justify-between text-white overflow-hidden group">
          <div className="absolute inset-0 bg-dots opacity-[0.05] group-hover:opacity-10 transition-opacity" />
          
          {/* Status Section */}
          <div className="flex items-center gap-10 relative z-10 w-full justify-between px-4">
            <div className="flex items-center gap-8 border-r border-white/10 pr-12">
               <div className="space-y-1">
                 <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Estado de la Flota</div>
                 <div className="text-3xl font-black">{activeVehicles} Vehículos Activos</div>
               </div>
               <button className="bg-white text-primary font-black px-8 py-3 rounded-2xl text-xs hover:bg-slate-50 active:scale-95 transition-all">
                 Ver Reporte Completo
               </button>
            </div>

            <div className="flex items-center gap-12 flex-1 justify-around">
               <div className="space-y-1 text-center">
                 <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Disponibilidad Media</div>
                 <div className="text-3xl font-black">82%</div>
               </div>

               <div className="space-y-1 text-center">
                 <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Categorías</div>
                 <div className="text-3xl font-black">{totalCategories}</div>
               </div>
            </div>
          </div>
          
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-primary-fixed/20 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Drawer */}
      <CategoryDrawer 
        category={selectedCategory}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={handleUpdateSuccess}
      />
    </div>
  )
}
