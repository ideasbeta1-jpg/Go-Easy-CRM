import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/utils/supabase/admin'

/**
 * Lecturas cacheadas de datos de configuración casi-estáticos.
 *
 * Antes estas tablas se consultaban en CADA navegación (system_settings incluso
 * dos veces: en el root layout y en el dashboard layout). Ahora se sirven desde
 * la caché de datos de Next y solo se revalidan cuando cambian (ver tags).
 *
 * Se usa el cliente admin (sin cookies) porque `unstable_cache` no puede acceder
 * a datos por-request como cookies/headers. Son datos globales, no por usuario.
 */

export const CACHE_TAGS = {
  systemSettings: 'system-settings',
  categories: 'categories',
  locations: 'locations',
} as const

export const getCachedSystemSettings = unstable_cache(
  async () => {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', 1)
      .single()
    return data
  },
  ['system-settings'],
  { tags: [CACHE_TAGS.systemSettings], revalidate: 3600 }
)

export const getCachedCategories = unstable_cache(
  async () => {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    return data || []
  },
  ['categories'],
  { tags: [CACHE_TAGS.categories], revalidate: 3600 }
)

export const getCachedLocations = unstable_cache(
  async () => {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('locations')
      .select('*')
      .order('name')
    return data || []
  },
  ['locations'],
  { tags: [CACHE_TAGS.locations], revalidate: 3600 }
)
