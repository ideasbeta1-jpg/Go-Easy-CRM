import { createClient } from '@/utils/supabase/server'
import ChatInboxClient from './components/ChatInboxClient'

export default async function ChatsPage() {
  const supabase = await createClient()

  // 1. Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // 2. Fetch leads with their last messages
  // We'll fetch all leads and then the list component will filter them
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('*, profiles:assigned_to(full_name, avatar_url)')
    .order('created_at', { ascending: false })

  // 3. Fetch latest messages for each lead to show in the list
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <ChatInboxClient 
      initialLeads={leads || []}
      initialMessages={messages || []}
      currentUserId={user?.id || ''}
    />
  )
}
