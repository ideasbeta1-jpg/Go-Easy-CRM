'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { MessageSquare, UserPlus, DollarSign, Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface NotificationContextType {
  unreadCount: number
  refreshUnreadCount: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

const TOAST_DURATION = {
  message: 8_000,
  lead: 10_000,
  payment: 12_000,
  assignment: 15_000,
} as const

const BEEP_THROTTLE_MS = 2_000

// Generate a soft two-tone beep via Web Audio API — no external dependency
function playBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)

    const osc = ctx.createOscillator()
    osc.connect(gain)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.2)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.35)
  } catch {
    // Audio not available — ignore silently
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const pushRegistered = useRef(false)
  const lastBeepAt = useRef(0)

  const playBeepThrottled = useCallback(() => {
    const now = Date.now()
    if (now - lastBeepAt.current < BEEP_THROTTLE_MS) return
    lastBeepAt.current = now
    playBeep()
  }, [])

  // ─── Desktop notification helper ─────────────────────────────────────────
  const showDesktopNotification = useCallback((title: string, body: string, url: string) => {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted' &&
      document.hidden
    ) {
      const n = new Notification(title, { body, icon: '/favicon.ico' })
      n.onclick = () => {
        window.focus()
        router.push(url)
        n.close()
      }
    }
  }, [router])

  // ─── Unread count (only from notifications table — RLS filters by user) ──
  const fetchUnreadCount = useCallback(async () => {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
    setUnreadCount(count ?? 0)
  }, [supabase])

  // ─── Phase 1: load user once on mount ────────────────────────────────────
  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      setCurrentUser({ id: user.id, role: profile?.role || 'agent' })
    }
    initUser()
    fetchUnreadCount()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally run once

  // ─── Phase 2: request notification permission + register push ────────────
  useEffect(() => {
    if (!currentUser || pushRegistered.current) return
    pushRegistered.current = true

    const setupPush = async () => {
      if (!('Notification' in window)) return

      const registerSubscription = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
        try {
          const reg = await navigator.serviceWorker.ready
          const existing = await reg.pushManager.getSubscription()
          const subscription = existing ?? await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
            ),
          })
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription.toJSON()),
          })
        } catch (err) {
          console.warn('[Push] Could not register push subscription:', err)
        }
      }

      if (Notification.permission === 'default') {
        toast.message('🔔 Activa las notificaciones', {
          description: 'Recibe alertas de nuevos leads y mensajes en tiempo real, incluso con la pestaña cerrada.',
          action: {
            label: 'Activar',
            onClick: async () => {
              const result = await Notification.requestPermission()
              if (result === 'granted') {
                toast.success('¡Notificaciones activadas!', { duration: 3_000 })
                await registerSubscription()
              } else {
                toast.error('Notificaciones bloqueadas. Actívalas desde la configuración del navegador.', { duration: 6_000 })
              }
            },
          },
          duration: 12_000,
        })
        return
      }

      if (Notification.permission !== 'granted') return
      await registerSubscription()
    }

    setupPush()
  }, [currentUser])

  // ─── Phase 3: realtime subscriptions (only after user is loaded) ─────────
  useEffect(() => {
    if (!currentUser) return

    const isAdmin = currentUser.role === 'admin'

    // Notifications table — scoped to current user via RLS + filter
    const notificationsChannel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${currentUser.id}`,
      }, (payload) => {
        const notif = payload.new as any

        // Resolve icon based on notification type
        const LucideIcon = ({
          new_lead:          UserPlus,
          lead_assigned:     UserPlus,
          payment_confirmed: DollarSign,
          new_message:       MessageSquare,
        } as Record<string, any>)[notif.type] || Bell

        const iconColor = ({
          new_lead:          'text-emerald-500',
          lead_assigned:     'text-blue-500',
          payment_confirmed: 'text-amber-500',
          new_message:       'text-violet-500',
        } as Record<string, string>)[notif.type] || 'text-primary'

        const duration = ({
          new_lead:          TOAST_DURATION.lead,
          lead_assigned:     TOAST_DURATION.assignment,
          payment_confirmed: TOAST_DURATION.payment,
          new_message:       TOAST_DURATION.message,
        } as Record<string, number>)[notif.type] || TOAST_DURATION.message

        playBeepThrottled()
        toast.message(notif.title, {
          description: notif.body || undefined,
          icon: <LucideIcon className={`w-4 h-4 ${iconColor}`} />,
          action: notif.link ? {
            label: 'Ver',
            onClick: () => router.push(notif.link),
          } : undefined,
          duration,
        })

        if (notif.title && notif.body) {
          showDesktopNotification(notif.title, notif.body, notif.link || '/dashboard')
        }

        setUnreadCount(prev => prev + 1)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(notificationsChannel)
    }
  }, [currentUser, supabase, router, showDesktopNotification, playBeepThrottled])

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount: fetchUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider')
  return context
}

// ─── VAPID helper ─────────────────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr.buffer as ArrayBuffer
}
