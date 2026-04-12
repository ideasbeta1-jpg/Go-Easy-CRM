'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { markNotificationRead, markAllNotificationsRead } from '@/app/utils/actions/notifications'

interface Notification {
  id: string
  type: string
  title: string
  body?: string
  link?: string
  lead_id?: string
  is_read: boolean
  created_at: string
}

const typeConfig: Record<string, { emoji: string; color: string; bg: string }> = {
  new_lead:          { emoji: '🟢', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  lead_assigned:     { emoji: '👤', color: 'text-blue-600',    bg: 'bg-blue-50'    },
  payment_confirmed: { emoji: '💰', color: 'text-amber-600',   bg: 'bg-amber-50'   },
  new_message:       { emoji: '💬', color: 'text-violet-600',  bg: 'bg-violet-50'  },
  voucher_sent:      { emoji: '📋', color: 'text-teal-600',    bg: 'bg-teal-50'    },
  quote_generated:   { emoji: '📄', color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
  lead_closed:       { emoji: '✅', color: 'text-slate-600',   bg: 'bg-slate-50'   },
  status_changed:    { emoji: '🔄', color: 'text-orange-600',  bg: 'bg-orange-50'  },
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60)        return 'Ahora'
  if (diff < 3600)      return `${Math.floor(diff / 60)}m`
  if (diff < 86400)     return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)

    if (!error && data) {
      setNotifications(data)
      setUnreadCount(data.filter((n: Notification) => !n.is_read).length)
    }
    setLoading(false)
  }, [supabase])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('notifications-bell')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      }, (payload) => {
        const newNotif = payload.new as Notification
        setNotifications(prev => [newNotif, ...prev.slice(0, 29)])
        setUnreadCount(prev => prev + 1)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
      }, (payload) => {
        const updated = payload.new as Notification
        setNotifications(prev =>
          prev.map(n => n.id === updated.id ? updated : n)
        )
        setUnreadCount(prev => updated.is_read ? Math.max(0, prev - 1) : prev)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const handleOpen = () => setOpen(v => !v)

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      // Optimistic update
      setNotifications(prev =>
        prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
      await markNotificationRead(notif.id)
    }
    if (notif.link) {
      router.push(notif.link)
      setOpen(false)
    }
  }

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
    await markAllNotificationsRead()
  }

  const cfg = (type: string) => typeConfig[type] || typeConfig['status_changed']

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className={`relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200 ${
          open
            ? 'bg-primary/10 text-primary shadow-sm'
            : 'text-slate-400 hover:text-primary hover:bg-slate-50'
        }`}
        aria-label="Notificaciones"
      >
        <span
          className={`material-symbols-outlined text-[22px] transition-transform duration-200 ${
            open ? 'scale-110' : unreadCount > 0 ? 'animate-[wiggle_1s_ease-in-out_3]' : ''
          }`}
        >
          notifications
        </span>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-black leading-none px-1 shadow-lg animate-in zoom-in-50 duration-200">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+12px)] w-[380px] bg-white rounded-3xl shadow-2xl shadow-slate-300/50 border border-slate-100/80 z-[200] overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h3 className="font-black text-sm text-slate-900 uppercase tracking-wide">Notificaciones</h3>
              {unreadCount > 0 && (
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">{unreadCount} sin leer</p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] font-black text-primary uppercase tracking-wider hover:opacity-70 transition-opacity"
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <span className="text-3xl">🔔</span>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No hay notificaciones</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const c = cfg(notif.type)
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full flex items-start gap-3 px-5 py-4 text-left transition-all duration-150 group ${
                      notif.is_read
                        ? 'bg-white hover:bg-slate-50/80'
                        : 'bg-primary/[0.03] hover:bg-primary/[0.06]'
                    }`}
                  >
                    {/* Icon */}
                    <span className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-2xl text-base ${c.bg}`}>
                      {c.emoji}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-black leading-snug truncate ${
                        notif.is_read ? 'text-slate-600' : 'text-slate-900'
                      }`}>
                        {notif.title}
                      </p>
                      {notif.body && (
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                          {notif.body}
                        </p>
                      )}
                    </div>

                    {/* Time + unread dot */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-[10px] font-bold text-slate-300">
                        {timeAgo(notif.created_at)}
                      </span>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <p className="text-[10px] text-slate-400 font-bold text-center uppercase tracking-wider">
                Mostrando las últimas {notifications.length} notificaciones
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
