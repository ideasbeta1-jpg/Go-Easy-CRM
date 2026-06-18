'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { executeStageAutomation } from '@/utils/automation-engine'
import { assignLeadWithContact } from '@/utils/assignment'
import { VALID_TRANSITIONS } from '@/lib/leads/transitions'
import { scheduleDateRulesForLead } from '@/utils/automation-scheduler'
import { findOrCreateContact } from '@/lib/contacts/findOrCreate'

export async function createLead(formData: FormData) {
  const supabase = await createClient()

  const pickupDate = formData.get('pickup_date') as string
  const pickupTime = formData.get('pickup_time') as string
  const returnDate = formData.get('return_date') as string
  const returnTime = formData.get('return_time') as string

  const phone = formData.get('phone') as string
  const email = formData.get('email') as string
  const first_name = formData.get('first_name') as string
  const last_name = formData.get('last_name') as string

  // Contacto (persona) único por teléfono; la reserva siempre se crea (puede haber varias por contacto).
  const contact = await findOrCreateContact(supabase, { first_name, last_name, phone, email })
  if (!contact) {
    throw new Error('No se pudo registrar el contacto.')
  }

  const data = {
    contact_id: contact.id,
    first_name,
    last_name,
    phone,
    email,
    pickup_date: pickupDate && pickupTime ? `${pickupDate}T${pickupTime}` : pickupDate,
    return_date: returnDate && returnTime ? `${returnDate}T${returnTime}` : returnDate,
    pickup_location: formData.get('pickup_location') as string,
    return_location: formData.get('return_location') as string,
    category_id: formData.get('category_id') as string || null,
    total_amount: parseFloat(formData.get('total_amount') as string || '0'),
    status: 'lead_nuevo'
  }

  const { data: newLead, error } = await supabase.from('leads').insert(data).select('id').single()

  if (error) {
    throw new Error(error.message)
  }

  if (newLead) {
    // Hereda el agente del contacto (recurrente) o hace Round Robin (contacto nuevo).
    const assignedAgent = await assignLeadWithContact(newLead.id, contact)
    await executeStageAutomation(newLead.id, 'lead_nuevo', assignedAgent ? { assigned_agent: assignedAgent } : {})
    // Programar reglas de fecha (pickup_date, return_date) — fire-and-forget
    scheduleDateRulesForLead(newLead.id).catch(err =>
      console.error('[leads/actions] Error scheduling date rules:', err)
    )
  }

  revalidatePath('/dashboard/leads')
}


export async function updateLeadStatus(id: string, status: string, lostReason?: string) {
  const supabase = await createClient()

  // Fetch current status to check if transition is valid
  const { data: current, error: fetchError } = await supabase
    .from('leads')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchError || !current) {
    throw new Error(fetchError?.message || 'Lead no encontrado')
  }

  // Skip update + automation if status didn't change
  if (current.status === status) return

  const updateData: Record<string, any> = {
    status,
    status_changed_at: new Date().toISOString(),
  }

  if (status === 'cerrado_perdido' && lostReason) {
    updateData.lost_reason = lostReason
  }

  const { error } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  // Only fire automation for allowed transitions to prevent accidental re-triggers
  const allowedNext = VALID_TRANSITIONS[current.status] ?? []
  if (allowedNext.includes(status)) {
    await executeStageAutomation(id, status)
  }

  revalidatePath('/dashboard/leads')
}

// En un módulo 'use server' solo se pueden exportar funciones async, por eso
// esta constante es local (no exportada).
const TERMINAL_PAGE_SIZE = 30

/**
 * Carga incremental de leads de una etapa (pensado para las columnas cerradas,
 * que crecen sin límite). Devuelve los leads ya enriquecidos con su agente,
 * con el mismo shape que usa el Kanban.
 */
export async function loadMoreLeads(status: string, offset: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { leads: [] as any[] }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isAdmin = !profile || profile.role === 'admin'

  let query = supabase
    .from('leads')
    .select(`*, category:categories(name, image_url, daily_price)`)
    .is('deleted_at', null)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(offset, offset + TERMINAL_PAGE_SIZE - 1)

  if (!isAdmin) query = query.eq('assigned_to', user.id)

  const { data: leads, error } = await query
  if (error) throw new Error(error.message)

  const assignedToIds = Array.from(new Set((leads || []).map(l => l.assigned_to).filter(Boolean)))
  let profiles: any[] = []
  if (assignedToIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, first_name, last_name, avatar_url')
      .in('id', assignedToIds as string[])
    profiles = data || []
  }
  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))

  const processed = (leads || []).map(l => {
    const p = profileMap[l.assigned_to]
    return {
      ...l,
      assigned_to_profile: p
        ? { ...p, full_name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Agente' }
        : null,
    }
  })

  return { leads: processed }
}

export async function searchCustomerByContact(query: string) {
  if (!query || query.length < 3) return null

  const supabase = await createClient()

  // Busca el contacto (persona) por email o teléfono exacto para autocompletar el alta.
  const { data, error } = await supabase
    .from('contacts')
    .select('first_name, last_name, email, phone')
    .or(`email.eq.${query},phone.eq.${query}`)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data
}

const STATUS_LABELS: Record<string, string> = {
  lead_nuevo: 'Lead Nuevo',
  en_cotizacion: 'En Cotización',
  reserva_confirmada: 'Reserva Confirmada',
  voucher_enviado: 'Voucher Enviado',
  cerrado_ganado: 'Cerrado Ganado',
  cerrado_perdido: 'Cerrado Perdido',
}

/**
 * Genera un CSV con todos los leads visibles para el usuario (admin: todos;
 * asesor: solo los suyos). No está acotado por la paginación del Kanban, así
 * que incluye el histórico completo de cerrados. Devuelve el contenido del CSV
 * como string para que el cliente lo descargue como blob.
 */
export async function exportLeadsToCsv() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isAdmin = !profile || profile.role === 'admin'

  let query = supabase
    .from('leads')
    .select(`*, category:categories(name)`)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (!isAdmin) query = query.eq('assigned_to', user.id)

  const { data: leads, error } = await query
  if (error) throw new Error(error.message)

  // Nombres de asesor para la columna "Asesor"
  const assignedToIds = Array.from(new Set((leads || []).map(l => l.assigned_to).filter(Boolean)))
  let profileMap: Record<string, string> = {}
  if (assignedToIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, first_name, last_name')
      .in('id', assignedToIds as string[])
    profileMap = Object.fromEntries(
      (profiles || []).map(p => [
        p.id,
        p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || '',
      ])
    )
  }

  const headers = [
    'Nombre', 'Apellido', 'Teléfono', 'Email', 'Estado', 'Categoría',
    'Monto Total', 'Fecha Recogida', 'Fecha Devolución', 'Lugar Recogida',
    'Lugar Devolución', 'Asesor', 'Razón Pérdida', 'Fecha Creación',
  ]

  const escape = (value: any): string => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }

  const rows = (leads || []).map((l: any) => [
    l.first_name,
    l.last_name,
    l.phone,
    l.email,
    STATUS_LABELS[l.status] || l.status,
    l.category?.name,
    l.total_amount,
    l.pickup_date,
    l.return_date,
    l.pickup_location,
    l.return_location,
    profileMap[l.assigned_to] || '',
    l.lost_reason,
    l.created_at,
  ].map(escape).join(','))

  // BOM para que Excel reconozca UTF-8 (acentos)
  const csv = '﻿' + [headers.join(','), ...rows].join('\r\n')
  return { csv, count: leads?.length || 0 }
}

export async function deleteLead(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('leads')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/leads')
}

export async function restoreLead(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('leads')
    .update({ deleted_at: null })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/leads')
}
