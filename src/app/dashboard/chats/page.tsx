import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import ChatInboxClient from './components/ChatInboxClient'

export default async function ChatsPage() {
  // Use regular client to get the current user session
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  // 1. Get current user and their role
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id || '')
    .single()

  const isAdmin = profile?.role === 'admin'

  // 2. Fetch ALL leads using admin client (bypasses RLS)
  const { data: leads, error: leadsError } = await adminSupabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  // 3. Fetch ALL messages using admin client (bypasses RLS)
  const { data: messages, error: messagesError } = await adminSupabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })

  console.log('[ChatsPage] leads:', leads?.length, 'messages:', messages?.length, 'leadsError:', leadsError, 'messagesError:', messagesError)

  return (
    <ChatInboxClient 
      initialLeads={leads || []}
      initialMessages={messages || []}
      currentUserId={user?.id || ''}
      isAdmin={isAdmin}
    />
  )
}
