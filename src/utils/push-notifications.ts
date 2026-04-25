import webpush from 'web-push'
import { createAdminClient } from './supabase/admin'

let vapidInitialized = false
function ensureVapid() {
  if (vapidInitialized) return
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  vapidInitialized = true
}

export interface PushPayload {
  title: string
  body?: string
  url?: string
  tag?: string
}

/**
 * Send a Web Push notification to all registered devices of a user.
 * Stale/invalid subscriptions are automatically removed from the database.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  ensureVapid()
  const supabase = createAdminClient()

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (error || !subscriptions || subscriptions.length === 0) return

  const message = JSON.stringify(payload)
  const staleIds: string[] = []

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message
        )
      } catch (err: any) {
        // 410 Gone or 404 = subscription no longer valid, clean it up
        if (err.statusCode === 410 || err.statusCode === 404) {
          staleIds.push(sub.id)
        } else {
          console.error('[Push] Error sending to subscription:', err.message)
        }
      }
    })
  )

  if (staleIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', staleIds)
  }
}

/**
 * Send a Web Push notification to all registered devices of multiple users.
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  await Promise.allSettled(userIds.map((id) => sendPushToUser(id, payload)))
}
