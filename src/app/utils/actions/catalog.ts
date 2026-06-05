'use server'

import { createClient } from '@/utils/supabase/server'
import { requireAdmin } from '@/utils/supabase/auth'
import { revalidatePath, updateTag } from 'next/cache'
import { CACHE_TAGS } from './cached-data'

export async function updateCategory(id: string, updates: {
  name?: string;
  daily_price?: number;
  base_daily_cost?: number;
  description?: string;
  image_url?: string;
}) {
  await requireAdmin()
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

  updateTag(CACHE_TAGS.categories)
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
  await requireAdmin()
  const supabase = await createClient()

  const { data: newCat, error } = await supabase
    .from('categories')
    .insert(data)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  updateTag(CACHE_TAGS.categories)
  revalidatePath('/dashboard/catalog')
  return newCat
}
