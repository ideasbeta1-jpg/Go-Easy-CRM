'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateCategory(id: string, updates: { 
  name?: string; 
  daily_price?: number;
  base_daily_cost?: number;
  description?: string; 
  image_url?: string;
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/catalog')
  return data
}

export async function createCategory(data: {
  name: string;
  daily_price: number;
  base_daily_cost?: number;
  description?: string;
  image_url?: string;
}) {
  const supabase = await createClient()

  const { data: newCat, error } = await supabase
    .from('categories')
    .insert(data)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/catalog')
  return newCat
}
