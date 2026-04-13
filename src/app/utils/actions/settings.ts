'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getSystemSettings() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('id', 1)
    .single()

  if (error) {
    console.error('Error fetching system settings:', error)
    return null
  }
  
  return data
}

export async function updateSystemSettings(data: any) {
  const supabase = await createClient()
  
  // Verify admin role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No authenticated user')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error('Only admins can update system settings')
  }

  const { error } = await supabase
    .from('system_settings')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', 1)

  if (error) throw new Error(error.message)
  
  revalidatePath('/dashboard', 'layout')
  revalidatePath('/dashboard/settings/system')
  return { success: true }
}
