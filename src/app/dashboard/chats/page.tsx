import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import ChatInboxClient from './components/ChatInboxClient'

import { Suspense } from 'react'

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

  return (
    <Suspense fallback={
      <div className="h-[calc(100vh-100px)] flex items-center justify-center bg-slate-50/50 rounded-2xl md:rounded-[3rem] border border-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <ChatInboxClient
        initialLeads={leads || []}
        initialMessages={recentMessages || []}
        currentUserId={user?.id || ''}
        isAdmin={isAdmin}
      />
    </Suspense>
  )
}
