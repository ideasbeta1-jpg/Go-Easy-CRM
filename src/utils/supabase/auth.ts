import { cache } from 'react'
import { createClient } from '@/utils/supabase/server'

/**
 * Obtiene el usuario autenticado deduplicando la llamada dentro de un mismo
 * request/render. `auth.getUser()` hace un round-trip de red al servidor de Auth
 * de Supabase, y antes se llamaba varias veces por página (layout + acciones).
 * Con React `cache()` todas esas llamadas comparten un único round-trip.
 */
export const getCachedUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

/**
 * Exige que el usuario actual sea admin. Defensa en profundidad para las
 * mutaciones cuyas tablas (categories, locations, system_settings) no tienen
 * políticas RLS por rol: sin esto, cualquier sesión autenticada podría
 * modificarlas. Lanza si no hay sesión o el rol no es admin. Devuelve el user.
 */
export async function requireAdmin() {
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) throw new Error('No authenticated user')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error('Only admins can perform this action')
  }
  return user
}
