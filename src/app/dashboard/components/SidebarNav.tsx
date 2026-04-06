'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface MenuItem {
  name: string;
  href: string;
}

export function SidebarNav({ menuItems }: { menuItems: MenuItem[] }) {
  const pathname = usePathname();

  const iconMap: Record<string, string> = {
    'Inicio': 'grid_view',
    'Leads (Kanban)': 'view_kanban',
    'Catálogo Flota': 'directions_car',
    'Proveedores': 'inventory_2',
    'Reportes': 'monitoring',
    'Mensajes / n8n': 'forum'
  };

  return (
    <nav className="flex flex-col gap-3">
      {menuItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-4 px-6 py-4 rounded-full transition-all duration-300 ${
              isActive 
              ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-100' 
              : 'text-slate-500 hover:text-primary hover:bg-slate-50'
            }`}
          >
            <span className={`material-symbols-outlined text-[22px] ${isActive ? 'fill-1' : ''}`}>
              {iconMap[item.name]}
            </span>
            <span className="font-sans font-bold text-sm tracking-tight">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
