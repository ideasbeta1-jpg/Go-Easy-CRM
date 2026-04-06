import { getLocations } from '@/app/utils/actions/locations'
import LocationsContent from './components/LocationsContent'

export default async function LocationsPage() {
  const locations = await getLocations()
  
  return (
    <div className="space-y-12">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
         <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestión de Sitios</h1>
         <p className="text-sm font-medium text-slate-400 max-w-2xl italic leading-relaxed">
           Crea y administra los sitios de recogida y entrega (aeropuertos, ciudades, terminales). Estos sitios podrán ser asignados posteriormente a tus partners estratégicos.
         </p>
      </div>

      <LocationsContent initialLocations={locations} />
    </div>
  )
}
