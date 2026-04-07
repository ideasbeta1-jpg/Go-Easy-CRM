'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useNotifications } from './NotificationProvider'

interface MenuItem {
  name: string;
  href: string;
}

export function SidebarNav({ menuItems }: { menuItems: MenuItem[] }) {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();

  const iconMap: Record<string, string> = {
    'Inicio': 'grid_view',
    'Leads (Kanban)': 'view_kanban',
    'Chats WhatsApp': 'forum',
    'Catálogo Flota': 'directions_car',
    'Proveedores': 'inventory_2',
    'Reportes': 'monitoring',
    'Automa n8n': 'settings_input_component'
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
            <span className="font-sans font-bold text-sm tracking-tight flex-1">{item.name}</span>
            {item.name === 'Chats WhatsApp' && unreadCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-lg shadow-rose-500/20 mr-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
