'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateLead(id: string, updates: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) throw new Error(error.message)

  if (data?.length === 0) {
    throw new Error('No se actualizó ningún registro. Verifica permisos o el ID del lead.')
  }

  revalidatePath(`/dashboard/leads/${id}`)
  revalidatePath('/dashboard/leads')
}

export async function updateLeadStatus(id: string, status: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('leads')
    .update({ status })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/leads/${id}`)
  revalidatePath('/dashboard/leads')
}

export async function deleteLead(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('leads')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/leads')
}
