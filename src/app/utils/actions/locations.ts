'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Location {
  id: string
  name: string
  code: string | null
  type: string | null
  created_at?: string
}

export async function getLocations() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

/**
 * Returns only locations that have at least one provider associated
 */
export async function getPublicLocations() {
  const supabase = await createClient()
  
  // Using a join to ensure there's at least one office for the location
  // Supabase distinct can be tricky, so we'll use a specific query
  const { data, error } = await supabase
    .from('locations')
    .select(`
      id,
      name,
      code,
      type,
      provider_offices!inner (id)
    `)
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  
  // Since we use !inner join, it only returns locations with at least one office
  // But we might get duplicates if multiple providers have offices in the same location
  // We filter to ensure uniqueness by ID
  const uniqueLocations = Array.from(new Map(data.map(item => [item.id, item])).values())
  
  return uniqueLocations.map(loc => ({
    id: loc.id,
    name: loc.name,
    code: loc.code,
    type: loc.type
  }))
}

export async function createLocation(data: {
  name: string
  code?: string
  type?: string
}) {
  const supabase = await createClient()

  const { data: newLocation, error } = await supabase
    .from('locations')
    .insert(data)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/settings/locations')
  return newLocation
}

export async function updateLocation(id: string, updates: {
  name?: string
  code?: string
  type?: string
}) {
  const supabase = await createClient()

  const { data: updatedLocation, error } = await supabase
    .from('locations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/settings/locations')
  return updatedLocation
}

export async function deleteLocation(id: string) {
  const supabase = await createClient()

  // Check if it's being used by provider_offices or leads first
  const { count: officeCount, error: officeError } = await supabase
    .from('provider_offices')
    .select('*', { count: 'exact', head: true })
    .eq('location_id', id)

  if (officeError) throw new Error(officeError.message)
  if (officeCount && officeCount > 0) {
    throw new Error('No se puede eliminar la ubicación porque está asignada a oficinas de proveedores.')
  }

  const { count: leadCount, error: leadError } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .or(`pickup_location_id.eq.${id},return_location_id.eq.${id}`)

  if (leadError) throw new Error(leadError.message)
  if (leadCount && leadCount > 0) {
    throw new Error('No se puede eliminar la ubicación porque está asignada a reservas (Leads).')
  }

  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/settings/locations')
  return true
}
