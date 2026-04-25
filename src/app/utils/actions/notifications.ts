'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendPushToUser } from '@/utils/push-notifications'

export type NotificationType = 
  | 'new_lead'
  | 'lead_assigned'
  | 'payment_confirmed'
  | 'new_message'
  | 'voucher_sent'
  | 'quote_generated'
  | 'lead_closed'
  | 'status_changed'

export interface NotificationPayload {
  user_id: string
  type: NotificationType
  title: string
  body?: string
  link?: string
  lead_id?: string
}

/**
 * Creates a notification for a specific user (uses admin client, called server-side)
 */
export async function createNotification(payload: NotificationPayload) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('notifications').insert({
    user_id: payload.user_id,
    type: payload.type,
    title: payload.title,
    body: payload.body || null,
    link: payload.link || null,
    lead_id: payload.lead_id || null,
    is_read: false,
  })
  if (error) {
    console.error('[Notifications] Error creating notification:', error)
  }
}

/**
 * Broadcast a notification to all admins and optionally an assigned agent
 */
export async function broadcastNotification(
  payload: Omit<NotificationPayload, 'user_id'>,
  assignedUserId?: string | null
) {
  const supabase = createAdminClient()

  // Get all admin user IDs
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')

  const userIds = new Set<string>()

  if (admins) {
    for (const admin of admins) {
      userIds.add(admin.id)
    }
  }

  // Add the assigned agent if different from admin
  if (assignedUserId) {
    userIds.add(assignedUserId)
  }

  // Insert a notification for each target user
  const inserts = Array.from(userIds).map((uid) => ({
    user_id: uid,
    type: payload.type,
    title: payload.title,
    body: payload.body || null,
    link: payload.link || null,
    lead_id: payload.lead_id || null,
    is_read: false,
  }))

  if (inserts.length > 0) {
    const { error } = await supabase.from('notifications').insert(inserts)
    if (error) {
      console.error('[Notifications] Error broadcasting notification:', error)
    }
  }

  // Send Web Push to each target user so mobile devices receive it in background
  const pushPayload = {
    title: payload.title,
    body: payload.body,
    url: payload.link || '/dashboard',
    tag: payload.type,
  }
  await Promise.allSettled(
    Array.from(userIds).map((uid) => sendPushToUser(uid, pushPayload))
  )
}

/**
 * Marks a single notification as read (current user only)
 */
export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  return { error }
}

/**
 * Marks all notifications as read for the current user
 */
export async function markAllNotificationsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return { error }
}

/**
 * Gets notifications for the current user (most recent 30)
 */
export async function getNotifications() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30)

  return { data, error }
}

/**
 * Gets the unread notification count for current user
 */
export async function getUnreadCount() {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false)

  return { count: count || 0, error }
}
