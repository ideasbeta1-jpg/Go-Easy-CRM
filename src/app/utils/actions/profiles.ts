'use server'

import { createClient } from '@/utils/supabase/server'
import { getCachedUser } from '@/utils/supabase/auth'
import { revalidatePath } from 'next/cache'

export async function updateProfileStatus(isActive: boolean) {
  const supabase = await createClient()

  const user = await getCachedUser()
  if (!user) return { error: 'No authenticated user' }

  const { error } = await supabase
    .from('profiles')
    .update({ 
      is_active: isActive,
      last_active_at: new Date().toISOString()
    })
    .eq('id', user.id)

  if (error) return { error: error.message }
  
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateLastActive() {
  const supabase = await createClient()

  const user = await getCachedUser()
  if (!user) return { error: 'No authenticated user' }

  await supabase
    .from('profiles')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', user.id)
    
  return { success: true }
}

export async function getProfileStatus() {
  const supabase = await createClient()

  const user = await getCachedUser()
  if (!user) return { isActive: false }

  const { data, error } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', user.id)
    .single()

  if (error) return { isActive: false }
  return { isActive: data.is_active }
}

export async function getUserProfile() {
  const supabase = await createClient()

  const user = await getCachedUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) return null
  return { ...data, email: user.email }
}
