'use server'

import { createClient } from '@/utils/supabase/server'

const PAGE_SIZE = 50

export async function fetchMoreMessages(leadId: string, offset: number) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) throw new Error(error.message)

  return (data || []).reverse()
}
