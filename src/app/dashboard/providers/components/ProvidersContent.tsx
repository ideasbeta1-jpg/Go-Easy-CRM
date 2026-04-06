'use client'

import { useState } from 'react'
import { 
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Phone, 
  BarChart3, 
  Cpu, 
  Edit2,
  Trash2,
  Loader2
} from 'lucide-react'
import ProviderDrawer from './ProviderDrawer'
import { deleteProvider } from '@/app/utils/actions/providers'

interface Provider {
  id: string
  name: string
  contact_name: string | null
  email: string | null
  whatsapp_group_id: string | null
  logo_url: string | null
  created_at: string
}

interface ProvidersContentProps {
  initialProviders: Provider[]
}

export default function ProvidersContent({ initialProviders }: ProvidersContentProps) {
  const [providers, setProviders] = useState(initialProviders)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este partner?')) return
    
    setIsDeleting(id)
    setErrorStatus(null)

    try {
      await deleteProvider(id)
      setProviders(providers.filter(p => p.id !== id))
    } catch (err: any) {
      alert(err.message)
      setErrorStatus(err.message)
    } finally {
      setIsDeleting(null)
    }
  }

  // Filter providers based on search
  const filteredProviders = providers.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calculate dynamic stats
  const totalProviders = providers.length
  const configuredProviders = providers.filter(p => p.whatsapp_group_id).length
  const whatsappPercentage = totalProviders > 0 ? Math.round((configuredProviders / totalProviders) * 100) : 0
  
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()
  const newThisMonth = providers.filter(p => {
    const createdDate = new Date(p.created_at)
    return createdDate.getMonth() === thisMonth && createdDate.getFullYear() === thisYear
  }).length

  const handleCreate = () => {
    setSelectedProvider(null)
    setIsDrawerOpen(true)
  }

  const handleEdit = (provider: Provider) => {
    setSelectedProvider(provider)
    setIsDrawerOpen(true)
  }

  const handleSuccess = (updatedProvider: Provider) => {
    const exists = providers.find(p => p.id === updatedProvider.id)
    if (exists) {
      setProviders(providers.map(p => p.id === updatedProvider.id ? updatedProvider : p))
    } else {
      setProviders([...providers, updatedProvider])
    }
  }

  // Mock roles for the design
  const roles = ['Head of Sales', 'Operations', 'Account Manager', 'Strategic Partnerships', 'Project Lead']
  const colors = [
    'bg-indigo-100 text-indigo-600',
    'bg-purple-100 text-purple-600',
    'bg-teal-100 text-teal-600',
    'bg-orange-100 text-orange-600',
    'bg-rose-100 text-rose-600'
  ]

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Directorio de Partners</h1>
          <div className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border border-emerald-100 shadow-sm animate-pulse">
            <ShieldCheck className="w-3.5 h-3.5" />
            Authorized Providers
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar aliado..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-11 pr-4 py-2.5 bg-slate-100/50 border-none rounded-2xl w-full sm:w-64 focus:ring-2 focus:ring-primary/20 text-sm font-medium transition-all outline-none"
            />
          </div>
          <button 
            onClick={handleCreate}
            className="bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-bold px-6 py-2.5 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 text-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Aliado</span>
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Proveedor</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Contacto Directo</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Email Corporativo</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Logística (WhatsApp)</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProviders.map((provider, index) => {
                const colorClass = colors[index % colors.length]
                const role = roles[index % roles.length]
                
                return (
                  <tr key={provider.id} className="group hover:bg-slate-50/40 transition-all cursor-pointer">
                    <td className="px-8 py-5" onClick={() => handleEdit(provider)}>
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 ${colorClass} rounded-2xl flex items-center justify-center font-black text-lg shadow-sm group-hover:scale-110 transition-transform duration-300 overflow-hidden`}>
                          {provider.logo_url ? (
                            <img src={provider.logo_url} alt={provider.name} className="w-full h-full object-cover" />
                          ) : (
                            provider.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-primary transition-colors text-[15px]">{provider.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">{provider.contact_name || 'N/A'}</span>
                        <span className="text-[11px] text-slate-400 font-medium">{role}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <a href={`mailto:${provider.email}`} className="text-sm text-primary hover:underline font-medium hover:text-primary-dim transition-colors">
                        {provider.email || 'N/A'}
                      </a>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex justify-center">
                        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight shadow-sm transition-all duration-300 ${
                          provider.whatsapp_group_id 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:bg-emerald-100' 
                            : 'bg-amber-50 text-amber-600 border border-amber-100 group-hover:bg-amber-100'
                        }`}>
                          <Phone className="w-3 h-3" />
                          {provider.whatsapp_group_id ? 'Configurado' : 'Pendiente'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleDelete(provider.id)}
                          disabled={isDeleting === provider.id}
                          className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isDeleting === provider.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                        <button 
                          onClick={() => handleEdit(provider)}
                          className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filteredProviders.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-300 gap-4">
                      <Cpu className="w-16 h-16 opacity-20 animate-bounce" />
                      <p className="text-sm font-black uppercase tracking-[0.3em] opacity-40 italic">No se encontraron resultados</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="px-8 py-6 flex flex-col sm:flex-row items-center justify-between border-t border-slate-50 bg-slate-50/30 gap-4">
          <p className="text-xs font-medium text-slate-400">
            Mostrando <span className="text-slate-900 font-bold">{filteredProviders.length}</span> de <span className="text-slate-900 font-bold">{totalProviders}</span> aliados premium registrados
          </p>
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200 disabled:opacity-30 cursor-pointer" disabled>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-lg bg-primary text-white text-xs font-bold shadow-lg shadow-primary/20 scale-110">1</button>
              <button className="w-8 h-8 rounded-lg hover:bg-white text-slate-500 text-xs font-bold transition-all border border-transparent hover:border-slate-200">2</button>
            </div>
            <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200 cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Cards Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Network Expansion Card */}
        <div className="bg-oceanic p-10 rounded-[2.5rem] text-white relative overflow-hidden group shadow-2xl shadow-primary/20">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-700">
            <BarChart3 className="w-40 h-40" />
          </div>
          <div className="relative z-10 space-y-6">
            <div className="space-y-2">
              <h3 className="text-3xl font-black tracking-tight">Expansión de Red</h3>
              <div className="h-1 w-12 bg-white/30 rounded-full" />
            </div>
            <p className="text-indigo-50 text-xl max-w-sm leading-relaxed font-medium">
              Has añadido <span className="text-white font-black underline decoration-4 decoration-primary-fixed/50 underline-offset-8">
                {newThisMonth} {newThisMonth === 1 ? 'aliado nuevo' : 'aliados nuevos'}
              </span> este mes. 
              Tu red de partners está en crecimiento constante.
            </p>
            <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 px-10 py-4 rounded-2xl font-black transition-all active:scale-[0.98] shadow-lg text-sm uppercase tracking-widest">
              Ver Reporte
            </button>
          </div>
        </div>

        {/* System Status Card */}
        <div className="bg-white/70 backdrop-blur-xl border border-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 flex flex-col justify-between group hover:shadow-2xl transition-all duration-500">
          <div className="flex items-center justify-between">
            <div className="w-16 h-16 bg-cyan-50 text-cyan-600 rounded-[1.5rem] flex items-center justify-center shadow-sm group-hover:rotate-12 transition-transform">
              <Cpu className="w-8 h-8" />
            </div>
            <span className="bg-cyan-50 text-cyan-700 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest border border-cyan-100 shadow-sm">
              Estado Sistema
            </span>
          </div>

          <div className="space-y-6 pt-10">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Integración WhatsApp</p>
                <div className="flex items-baseline gap-2 mt-1">
                   <h4 className="text-6xl font-black text-slate-900 tracking-tighter">{whatsappPercentage}%</h4>
                   <span className="text-emerald-500 font-bold text-sm mb-2">↑ Activo</span>
                </div>
              </div>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-50 relative group">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-1500 ease-out shadow-lg shadow-emerald-500/30 relative overflow-hidden" 
                style={{ width: `${whatsappPercentage}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 animate-shimmer" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-medium text-center italic">
               Sincronización en tiempo real con Evolution API
            </p>
          </div>
        </div>
      </div>

      {/* Drawer Component */}
      <ProviderDrawer 
        provider={selectedProvider}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
