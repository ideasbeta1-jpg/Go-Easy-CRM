'use client'

import { useState } from 'react'
import { Plus, Search, MapPin, Edit2, Trash2, Loader2, Plane, Building, Bus } from 'lucide-react'
import LocationDrawer from './LocationDrawer'
import { deleteLocation, Location } from '@/app/utils/actions/locations'

interface LocationsContentProps {
  initialLocations: Location[]
}

export default function LocationsContent({ initialLocations }: LocationsContentProps) {
  const [locations, setLocations] = useState(initialLocations)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta ubicación?')) return
    
    setIsDeleting(id)
    setErrorStatus(null)

    try {
      await deleteLocation(id)
      setLocations(locations.filter(l => l.id !== id))
    } catch (err: any) {
      alert(err.message)
      setErrorStatus(err.message)
    } finally {
      setIsDeleting(null)
    }
  }

  const filteredLocations = locations.filter(l => 
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (l.code && l.code.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleCreate = () => {
    setSelectedLocation(null)
    setIsDrawerOpen(true)
  }

  const handleEdit = (location: Location) => {
    setSelectedLocation(location)
    setIsDrawerOpen(true)
  }

  const handleSuccess = (updatedLocation: Location) => {
    const exists = locations.find(l => l.id === updatedLocation.id)
    if (exists) {
      setLocations(locations.map(l => l.id === updatedLocation.id ? updatedLocation : l))
    } else {
      setLocations([...locations, updatedLocation])
    }
  }

  const getTypeIcon = (type: string | null) => {
    switch (type) {
      case 'aeropuerto': return <Plane className="w-4 h-4" />
      case 'terminal': return <Bus className="w-4 h-4" />
      default: return <Building className="w-4 h-4" />
    }
  }

  const getTypeLabel = (type: string | null) => {
    switch (type) {
      case 'aeropuerto': return 'Aeropuerto'
      case 'terminal': return 'Terminal'
      case 'ciudad': return 'Ciudad'
      default: return 'Otro'
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Search and Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="relative group flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o código..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-11 pr-4 py-2.5 bg-white/70 backdrop-blur-xl border border-white rounded-[1.25rem] w-full focus:ring-2 focus:ring-primary/20 text-sm font-bold transition-all outline-none shadow-xl shadow-slate-200/20"
          />
        </div>
        <button 
          onClick={handleCreate}
          className="bg-primary hover:bg-primary-dim active:scale-[0.98] text-white font-black px-8 py-3.5 rounded-[1.25rem] shadow-xl shadow-primary/30 transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-widest"
        >
          <Plus className="w-4 h-4" />
          <span>Añadir Sitio</span>
        </button>
      </div>

      {/* Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredLocations.map((location) => (
          <div 
            key={location.id} 
            className="group block bg-white/70 backdrop-blur-xl border border-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 relative overflow-hidden"
          >
             <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 bg-slate-50 text-slate-400 group-hover:bg-primary/5 group-hover:text-primary rounded-2xl flex items-center justify-center border border-slate-100 group-hover:border-primary/10 transition-all shadow-sm`}>
                    {getTypeIcon(location.type)}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 group-hover:text-primary transition-colors text-base tracking-tight leading-tight">
                      {location.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                         {location.code || 'N/A'}
                       </span>
                       <span className="w-1 h-1 bg-slate-200 rounded-full" />
                       <span className="text-[10px] font-bold text-slate-400 italic">
                         {getTypeLabel(location.type)}
                       </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    onClick={() => handleEdit(location)}
                    className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(location.id)}
                    disabled={isDeleting === location.id}
                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50"
                  >
                    {isDeleting === location.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
             </div>
          </div>
        ))}

        {filteredLocations.length === 0 && (
          <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-200 rounded-[3rem] p-12 bg-slate-50/50">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl shadow-slate-200 text-slate-200">
                 <MapPin className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                 <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-300">No se encontraron sitios</p>
                 <p className="text-xs font-bold text-slate-400 leading-relaxed italic">
                   Intenta ajustar tu búsqueda o crea una nueva ubicación estratégica.
                 </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <LocationDrawer 
        location={selectedLocation}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
