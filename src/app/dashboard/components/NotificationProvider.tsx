'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { MessageSquare, UserPlus, DollarSign } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface NotificationContextType {
  unreadCount: number
  refreshUnreadCount: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [currentUser, setCurrentUser] = useState<{ id: string, role: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Sonido de notificación (Ping suave)
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
      audio.volume = 0.5
      audio.play().catch(e => console.log('[NotificationSound] Audio play blocked by browser:', e))
    } catch (err) {
      console.error('[NotificationSound] Error playing sound:', err)
    }
  }, [])

  // Solicitar permisos de notificación de escritorio
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
  }, [])

  const showDesktopNotification = useCallback((title: string, body: string, url: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
      const n = new Notification(title, {
        body,
        icon: '/favicon.ico'
      })
      n.onclick = () => {
        window.focus()
        router.push(url)
        n.close()
      }
    }
  }, [router])

  const fetchUnreadCount = useCallback(async () => {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('direction', 'inbound')
      .eq('is_read', false)
    
    if (!error && count !== null) {
      setUnreadCount(count)
    }
  }, [supabase])

  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        setCurrentUser({ id: user.id, role: profile?.role || 'agent' })
      }
    }

    initUser()
    fetchUnreadCount()

    // 1. Messages Subscription (Chat Notifications)
    const messagesChannel = supabase
      .channel('messages-notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: 'direction=eq.inbound'
      }, async (payload) => {
        const newMessage = payload.new as any
        
        // Fetch lead info to check assignment
        const { data: lead } = await supabase
          .from('leads')
          .select('first_name, last_name, assigned_to')
          .eq('id', newMessage.lead_id)
          .single()

        // Only notify if admin OR assigned to current user
        const isAssigned = !currentUser || currentUser.role === 'admin' || lead?.assigned_to === currentUser.id
        if (!isAssigned) return

        playNotificationSound()

        const senderName = lead ? `${lead.first_name} ${lead.last_name}` : 'Nuevo Cliente'
        const messagePreview = newMessage.content?.substring(0, 50) || 'Mensaje multimedia'

        toast.message(`Mensaje de ${senderName}`, {
          description: messagePreview,
          icon: <MessageSquare className="w-4 h-4 text-primary" />,
          action: {
            label: 'Ver Chat',
            onClick: () => router.push(`/dashboard/chats?leadId=${newMessage.lead_id}`)
          },
          duration: 8000,
        })

        showDesktopNotification(`Nuevo mensaje: ${senderName}`, messagePreview, `/dashboard/chats?leadId=${newMessage.lead_id}`)
        setUnreadCount(prev => prev + 1)
      })
      .subscribe()

    // 2. Leads Subscription (New Leads & Payment Confirmations)
    const leadsChannel = supabase
      .channel('leads-notifications')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'leads' 
      }, async (payload) => {
        const newLead = payload.new as any
        const oldLead = payload.old as any
        
        const isAssigned = !currentUser || currentUser.role === 'admin' || newLead.assigned_to === currentUser.id
        if (!isAssigned) return

        const leadName = `${newLead.first_name} ${newLead.last_name}`

        // A. NEW LEAD
        if (payload.eventType === 'INSERT') {
          playNotificationSound()
          toast.message('🟢 ¡Nuevo Lead Registrado!', {
            description: `Se ha creado el lead: ${leadName}`,
            icon: <UserPlus className="w-4 h-4 text-emerald-500" />,
            action: {
              label: 'Ver Pipeline',
              onClick: () => router.push('/dashboard/leads')
            },
            duration: 10000,
          })
          showDesktopNotification('Nuevo Lead Registrado', leadName, '/dashboard/leads')
        }

        // B. PAYMENT CONFIRMED (Status change to reserva_confirmada)
        if (payload.eventType === 'UPDATE') {
          const oldStatus = oldLead?.status
          const newStatus = newLead?.status
          
          if (oldStatus !== 'reserva_confirmada' && newStatus === 'reserva_confirmada') {
            playNotificationSound()
            toast.success('💰 ¡Reserva Confirmada!', {
              description: `El cliente ${leadName} ha realizado el pago.`,
              icon: <DollarSign className="w-4 h-4 text-amber-500" />,
              action: {
                label: 'Ver Lead',
                onClick: () => router.push(`/dashboard/leads/${newLead.id}`)
              },
              duration: 12000,
            })
            showDesktopNotification('💰 Pago Recibido', `${leadName} ha confirmado su reserva.`, `/dashboard/leads/${newLead.id}`)
          }

          // C. LEAD ASSIGNED TO CURRENT USER (Specifically when it changes to them)
          const oldAssignedTo = oldLead?.assigned_to
          const newAssignedTo = newLead?.assigned_to
          
          if (currentUser && oldAssignedTo !== currentUser.id && newAssignedTo === currentUser.id) {
            playNotificationSound()
            toast.message('👤 ¡Nuevo Lead Asignado!', {
              description: `Se te ha asignado el lead: ${leadName}`,
              icon: <UserPlus className="w-4 h-4 text-blue-500" />,
              action: {
                label: 'Atender Lead',
                onClick: () => router.push(`/dashboard/leads/${newLead.id}`)
              },
              duration: 15000,
            })
            showDesktopNotification('¡Lead Asignado!', `Tienes un nuevo cliente: ${leadName}`, `/dashboard/leads/${newLead.id}`)
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(leadsChannel)
    }
  }, [supabase, playNotificationSound, router, showDesktopNotification, fetchUnreadCount, currentUser])

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
