import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import ChatInboxClient from './components/ChatInboxClient'

export default async function ChatsPage() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id || '')
    .single()

  const isAdmin = profile?.role === 'admin'

  const { data: leads } = await adminSupabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  // Only load the last 50 messages per lead for sidebar preview — NOT all messages
  // Full conversation is loaded on-demand when a lead is selected
  const { data: recentMessages } = await adminSupabase
    .from('messages')
    .select('id, lead_id, content, direction, media_url, media_type, is_read, status, created_at')
    .order('created_at', { ascending: false })
    .limit(500)

  console.log('[ChatsPage] leads:', leads?.length, 'preview messages:', recentMessages?.length)

  return (
    <ChatInboxClient
      initialLeads={leads || []}
      initialMessages={recentMessages || []}
      currentUserId={user?.id || ''}
      isAdmin={isAdmin}
    />
  )
}
