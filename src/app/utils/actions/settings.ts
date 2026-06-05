'use server'

import { createClient } from '@/utils/supabase/server'
import { requireAdmin } from '@/utils/supabase/auth'
import { updateTag } from 'next/cache'
import { getCachedSystemSettings, CACHE_TAGS } from './cached-data'

export async function getSystemSettings() {
  // Servido desde la caché de datos de Next; se revalida al guardar ajustes.
  return getCachedSystemSettings()
}

export async function updateSystemSettings(data: any) {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('system_settings')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', 1)

  if (error) throw new Error(error.message)

  // updateTag ya expira y refresca la lectura cacheada (read-your-own-writes);
  // no hace falta revalidar el layout completo del dashboard.
  updateTag(CACHE_TAGS.systemSettings)
  return { success: true }
}
