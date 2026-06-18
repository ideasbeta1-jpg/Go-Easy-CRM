import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Normaliza un teléfono a sus últimos 10 dígitos (clave de deduplicación de contactos).
 * Debe coincidir con la lógica usada en la migración `add_contacts_table_and_link_leads`.
 */
export function normalizePhone10(phone?: string | null): string {
  return (phone || '').replace(/\D/g, '').slice(-10)
}

export interface ContactInput {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone: string
  source?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_term?: string | null
  utm_content?: string | null
}

export interface ContactRef {
  id: string
  assigned_to: string | null
  created: boolean
}

/**
 * Busca un contacto por teléfono normalizado; si no existe lo crea.
 * Es la fuente de verdad de la persona detrás de una o varias reservas (leads).
 */
export async function findOrCreateContact(
  supabase: SupabaseClient,
  input: ContactInput
): Promise<ContactRef | null> {
  const phone_normalized = normalizePhone10(input.phone)
  const hasValidPhone = phone_normalized.length >= 7

  // Teléfono numérico normal → dedup por últimos 10 dígitos.
  // Teléfono atípico (p.ej. BSUID de WhatsApp con letras/`:`) → dedup por teléfono exacto.
  let existing: { id: string; assigned_to: string | null } | null = null
  if (hasValidPhone) {
    const { data } = await supabase
      .from('contacts')
      .select('id, assigned_to')
      .eq('phone_normalized', phone_normalized)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle()
    existing = data
  } else if (input.phone) {
    const { data } = await supabase
      .from('contacts')
      .select('id, assigned_to')
      .eq('phone', input.phone)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle()
    existing = data
  }

  if (existing) {
    // Rellena datos faltantes del contacto sin pisar lo existente (un lead de
    // WhatsApp pudo crearlo sin email; una reserva web puede completarlo).
    const patch: Record<string, any> = {}
    if (input.email && input.email.trim()) patch.email = input.email.trim()
    if (Object.keys(patch).length > 0) {
      patch.updated_at = new Date().toISOString()
      await supabase.from('contacts').update(patch).eq('id', existing.id).is('email', null)
    }
    return { id: existing.id, assigned_to: existing.assigned_to ?? null, created: false }
  }

  const { data: created, error } = await supabase
    .from('contacts')
    .insert({
      first_name: input.first_name ?? null,
      last_name: input.last_name ?? null,
      email: input.email?.trim() || null,
      phone: input.phone,
      phone_normalized: hasValidPhone ? phone_normalized : null,
      source: input.source ?? null,
      utm_source: input.utm_source ?? null,
      utm_medium: input.utm_medium ?? null,
      utm_campaign: input.utm_campaign ?? null,
      utm_term: input.utm_term ?? null,
      utm_content: input.utm_content ?? null,
    })
    .select('id, assigned_to')
    .single()

  if (error || !created) {
    // Carrera: otro request creó el contacto en paralelo (violación de índice único).
    if (error?.code === '23505' && hasValidPhone) {
      const { data: again } = await supabase
        .from('contacts')
        .select('id, assigned_to')
        .eq('phone_normalized', phone_normalized)
        .maybeSingle()
      if (again) return { id: again.id, assigned_to: again.assigned_to ?? null, created: false }
    }
    console.error('[findOrCreateContact] Error creando contacto:', error)
    return null
  }

  return { id: created.id, assigned_to: created.assigned_to ?? null, created: true }
}
