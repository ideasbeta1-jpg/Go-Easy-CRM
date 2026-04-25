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
  // Track registration to avoid re-registering on every render
  const pushRegistered = useRef(false)

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
      if (Notification.permission === 'default') {
        await Notification.requestPermission()
      }
      if (Notification.permission !== 'granted') return

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

      try {
        const reg = await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()

        // Re-use existing subscription or create a new one
        const subscription = existing ?? await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
          ),
        })

        // Save/refresh the subscription on the server
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription.toJSON()),
        })
      } catch (err) {
        console.warn('[Push] Could not register push subscription:', err)
      }
    }

    setupPush()
  }, [currentUser])

  // ─── Phase 3: realtime subscriptions (only after user is loaded) ─────────
  useEffect(() => {
    if (!currentUser) return

    const isAdmin = currentUser.role === 'admin'

    // 1. Messages channel — only admins or messages for assigned leads
    const messagesChannel = supabase
      .channel('messages-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: 'direction=eq.inbound',
      }, async (payload) => {
        const newMessage = payload.new as any

        const { data: lead } = await supabase
          .from('leads')
          .select('first_name, last_name, assigned_to')
          .eq('id', newMessage.lead_id)
          .single()

        if (!isAdmin && lead?.assigned_to !== currentUser.id) return

        playBeep()
        const senderName = lead ? `${lead.first_name} ${lead.last_name}` : 'Nuevo Cliente'
        const messagePreview = newMessage.content?.substring(0, 50) || 'Mensaje multimedia'

        toast.message(`Mensaje de ${senderName}`, {
          description: messagePreview,
          icon: <MessageSquare className="w-4 h-4 text-primary" />,
          action: {
            label: 'Ver Chat',
            onClick: () => router.push(`/dashboard/chats?leadId=${newMessage.lead_id}`),
          },
          duration: 8000,
        })

        showDesktopNotification(
          `Nuevo mensaje: ${senderName}`,
          messagePreview,
          `/dashboard/chats?leadId=${newMessage.lead_id}`
        )
        setUnreadCount(prev => prev + 1)
      })
      .subscribe()

    // 2. Leads channel — new leads and payment confirmations
    const leadsChannel = supabase
      .channel('leads-notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leads',
      }, async (payload) => {
        const newLead = payload.new as any
        const oldLead = payload.old as any

        if (!isAdmin && newLead.assigned_to !== currentUser.id) return

        const leadName = `${newLead.first_name} ${newLead.last_name}`

        if (payload.eventType === 'INSERT') {
          playBeep()
          toast.message('🟢 ¡Nuevo Lead Registrado!', {
            description: `Se ha creado el lead: ${leadName}`,
            icon: <UserPlus className="w-4 h-4 text-emerald-500" />,
            action: {
              label: 'Ver Pipeline',
              onClick: () => router.push('/dashboard/leads'),
            },
            duration: 10000,
          })
          showDesktopNotification('Nuevo Lead Registrado', leadName, '/dashboard/leads')
        }

        if (payload.eventType === 'UPDATE') {
          if (oldLead?.status !== 'reserva_confirmada' && newLead?.status === 'reserva_confirmada') {
            playBeep()
            toast.success('💰 ¡Reserva Confirmada!', {
              description: `El cliente ${leadName} ha realizado el pago.`,
              icon: <DollarSign className="w-4 h-4 text-amber-500" />,
              action: {
                label: 'Ver Lead',
                onClick: () => router.push(`/dashboard/leads/${newLead.id}`),
              },
              duration: 12000,
            })
            showDesktopNotification('💰 Pago Recibido', `${leadName} confirmó su reserva.`, `/dashboard/leads/${newLead.id}`)
          }

          if (oldLead?.assigned_to !== currentUser.id && newLead?.assigned_to === currentUser.id) {
            playBeep()
            toast.message('👤 ¡Nuevo Lead Asignado!', {
              description: `Se te ha asignado el lead: ${leadName}`,
              icon: <UserPlus className="w-4 h-4 text-blue-500" />,
              action: {
                label: 'Atender Lead',
                onClick: () => router.push(`/dashboard/leads/${newLead.id}`),
              },
              duration: 15000,
            })
            showDesktopNotification('¡Lead Asignado!', `Tienes un nuevo cliente: ${leadName}`, `/dashboard/leads/${newLead.id}`)
          }
        }
      })
      .subscribe()

    // 3. Notifications table — scoped to current user via RLS + filter
    const notificationsChannel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${currentUser.id}`,
      }, (payload) => {
        const notif = payload.new as any

        const typeIcons: Record<string, string> = {
          quote_generated: '📄',
          voucher_sent: '📋',
          lead_closed: '✅',
          new_lead: '🟢',
          payment_confirmed: '💰',
          lead_assigned: '👤',
          new_message: '💬',
          status_changed: '🔄',
        }
        const icon = typeIcons[notif.type] || '🔔'

        playBeep()
        toast.message(`${icon} ${notif.title}`, {
          description: notif.body || undefined,
          icon: <Bell className="w-4 h-4 text-primary" />,
          action: notif.link ? {
            label: 'Ver',
            onClick: () => router.push(notif.link),
          } : undefined,
          duration: 8000,
        })

        if (notif.title && notif.body) {
          showDesktopNotification(notif.title, notif.body, notif.link || '/dashboard')
        }

        setUnreadCount(prev => prev + 1)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(leadsChannel)
      supabase.removeChannel(notificationsChannel)
    }
  }, [currentUser, supabase, router, showDesktopNotification])

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
