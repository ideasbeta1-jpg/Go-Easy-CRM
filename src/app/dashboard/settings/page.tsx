'use client'

import Link from 'next/link'
import { MapPin, Settings2, ShieldCheck, ChevronRight, User, Mail, Users } from 'lucide-react'

const SETTINGS_CATEGORIES = [
  {
    id: 'profile',
    title: 'Mi Perfil',
    description: 'Gestiona tu información personal, foto de perfil, datos de contacto y biografía.',
    icon: User,
    href: '/dashboard/profile',
    color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    badge: 'Cuenta'
  },
  {
    id: 'users',
    title: 'Usuarios y Roles',
    description: 'Gestiona los accesos del equipo, crea nuevos usuarios y asigna permisos de administrador o agente.',
    icon: Users,
    href: '/dashboard/settings/users',
    color: 'bg-amber-50 text-amber-600 border-amber-100',
    badge: 'Seguridad'
  },
  {
    id: 'locations',
    title: 'Sitios y Ubicaciones',
    description: 'Gestiona aeropuertos, oficinas centrales y otros puntos de recogida para tus partners.',
    icon: MapPin,
    href: '/dashboard/settings/locations',
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    badge: 'Logística'
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp Business API',
    description: 'Configura la conexión oficial con Meta, gestiona tus plantillas y automatiza mensajes.',
    icon: ShieldCheck,
    href: '/dashboard/settings/whatsapp',
    color: 'bg-blue-50 text-blue-600 border-blue-100',
    badge: 'Oficial API'
  },
  {
    id: 'emails',
    title: 'Plantillas de Email',
    description: 'Personaliza los correos electrónicos automáticos que se envían a los clientes en cada etapa.',
    icon: Mail,
    href: '/dashboard/settings/emails',
    color: 'bg-purple-50 text-purple-600 border-purple-100',
    badge: 'Automatización'
  },
  {
    id: 'system',
    title: 'Configuracion General',
    description: 'Personaliza la identidad del CRM, logo, favicon, SEO y parámetros globales del sistema.',
    icon: Settings2,
    href: '/dashboard/settings/system',
    color: 'bg-rose-50 text-rose-600 border-rose-100',
    badge: 'Admin Only'
  }
]

export default function SettingsPage() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Settings2 className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configuración del Sistema</h1>
        </div>
        <p className="text-sm font-medium text-slate-400">Personaliza los parámetros globales de Go Easy CRM.</p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {SETTINGS_CATEGORIES.map((category) => (
          <Link 
            key={category.id} 
            href={category.href}
            className="group block bg-white/70 backdrop-blur-xl border border-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 relative overflow-hidden"
          >
            {/* Background Decor */}
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 md:w-32 md:h-32 opacity-5 scale-150 rotate-12 transition-transform duration-700 group-hover:rotate-45 group-hover:scale-[1.7]`}>
              <category.icon className="w-full h-full" />
            </div>

            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <div className={`w-14 h-14 ${category.color} rounded-2xl flex items-center justify-center border shadow-sm group-hover:rotate-12 transition-transform`}>
                  <category.icon className="w-7 h-7" />
                </div>
                <span className={`px-3 py-1 ${category.color} text-[10px] font-black uppercase tracking-widest rounded-full border shadow-sm`}>
                  {category.badge}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 group-hover:text-primary transition-colors tracking-tight">
                  {category.title}
                </h3>
                <p className="text-xs font-semibold text-slate-400 leading-relaxed italic opacity-80">
                  {category.description}
                </p>
              </div>

              <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.2em] pt-2">
                <span>Configurar ahora</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        ))}

        {/* Placeholder for future settings */}
        <div className="border-2 border-dashed border-slate-200 p-8 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 group opacity-40">
           <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
             <ShieldCheck className="w-7 h-7 text-slate-300" />
           </div>
           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Próximamente</p>
        </div>
      </div>
    </div>
  )
}
