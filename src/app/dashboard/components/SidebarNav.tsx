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
    'Leads Kanban': 'view_kanban',
    'Leads (Kanban)': 'view_kanban',
    'Chats WhatsApp': 'forum',
    'Catálogo Flota': 'directions_car',
    'Proveedores': 'inventory_2',
    'Reportes': 'monitoring',
    'Mensajes': 'forum',
    'Tareas': 'task_alt',
    'Automatizaciones': 'bolt'
  };

  return (
    <nav className="flex flex-col gap-0.5">
      {menuItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
              isActive
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] shrink-0 ${isActive ? 'fill-1' : ''}`}>
              {iconMap[item.name]}
            </span>
            <span className="font-semibold text-sm flex-1">{item.name}</span>
            {item.name === 'Chats WhatsApp' && unreadCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-lg shadow-rose-500/20 leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
