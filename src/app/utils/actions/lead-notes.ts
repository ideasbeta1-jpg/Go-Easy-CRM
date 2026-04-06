'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addLeadNote(leadId: string, content: string) {
  const supabase = await createClient()

  // Get current user to link as agent
  const { data: { user } } = await supabase.auth.getUser()
  const agentId = user?.id

  const { data, error } = await supabase
    .from('lead_notes')
    .insert({
      lead_id: leadId,
      content,
      agent_id: agentId,
    })
    .select()

  if (error) {
    console.error('Error adding note:', error)
    throw new Error('Failed to add note')
  }

  revalidatePath(`/dashboard/leads/${leadId}`)
  return data
}

export async function deleteLeadNote(noteId: string, leadId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('lead_notes')
    .delete()
    .eq('id', noteId)

  if (error) {
    console.error('Error deleting note:', error)
    throw new Error('Failed to delete note')
  }

  revalidatePath(`/dashboard/leads/${leadId}`)
}
