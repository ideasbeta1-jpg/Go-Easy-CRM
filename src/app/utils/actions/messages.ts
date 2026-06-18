'use server'

import { createClient } from '@/utils/supabase/server'

const PAGE_SIZE = 50

export async function fetchMoreMessages(leadId: string, offset: number) {
  const supabase = await createClient()

  // El chat es por CONTACTO: muestra todo el hilo de la persona a través de sus reservas.
  const { data: lead } = await supabase.from('leads').select('contact_id').eq('id', leadId).single()
  const col = lead?.contact_id ? 'contact_id' : 'lead_id'
  const val = lead?.contact_id ?? leadId

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq(col, val)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) throw new Error(error.message)

  return (data || []).reverse()
}
