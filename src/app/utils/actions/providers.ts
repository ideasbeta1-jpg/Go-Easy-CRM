'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function ensureProviderBucket() {
  const supabase = createAdminClient()
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.find(b => b.name === 'provider-logos')
  
  if (!exists) {
    const { error } = await supabase.storage.createBucket('provider-logos', {
      public: true,
      allowedMimeTypes: ['image/webp', 'image/png', 'image/jpeg'],
      fileSizeLimit: 2097152 // 2MB
    })
    
    if (error) {
      console.error('Failed to create bucket:', error)
      throw new Error(`Could not create storage bucket: ${error.message}`)
    }
  }
}

export async function initializeProvidersTable() {
  const supabase = await createClient()
  // Try to add the column if missing
  // We use query if possible, but standard client doesn't support raw sql easily.
  // Instead we'll just return, it's safer for now.
}

export async function createProvider(data: {
  name: string;
  contact_name?: string;
  email?: string;
  whatsapp_group_id?: string;
  logo_url?: string;
}) {
  const supabase = await createClient()

  const { data: newProvider, error } = await supabase
    .from('providers')
    .insert(data)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/providers')
  return newProvider
}

export async function updateProvider(id: string, updates: {
  name?: string;
  contact_name?: string;
  email?: string;
  whatsapp_group_id?: string;
  logo_url?: string;
}) {
  const supabase = await createClient()

  const { data: updatedProvider, error } = await supabase
    .from('providers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/providers')
  return updatedProvider
}

export async function getProviderOffices(providerId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('provider_offices')
    .select(`
      *,
      locations (
        id,
        name,
        code
      )
    `)
    .eq('provider_id', providerId)

  if (error) throw new Error(error.message)
  return data
}

export async function upsertProviderOffice(data: {
  id?: string;
  provider_id: string;
  location_id: string;
  address?: string;
  phone?: string;
  hours?: string;
  notes?: string;
}) {
  const supabase = await createClient()
  
  const { data: result, error } = await supabase
    .from('provider_offices')
    .upsert(data)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return result
}

export async function deleteProviderOffice(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('provider_offices')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  return true
}

export async function deleteProvider(id: string) {
  const supabase = await createClient()

  // 1. Check for reservations (leads)
  const { count, error: countError } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('provider_id', id)

  if (countError) throw new Error(countError.message)

  if (count && count > 0) {
    throw new Error('No se puede eliminar el proveedor porque tiene reservas (Leads) asignadas. Debe reasignar o eliminar los leads primero.')
  }

  // 2. Delete provider
  const { error } = await supabase
    .from('providers')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/providers')
  return true
}
