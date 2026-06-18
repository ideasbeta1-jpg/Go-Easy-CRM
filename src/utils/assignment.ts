import { createAdminClient } from './supabase/admin'
import { broadcastNotification } from '@/app/utils/actions/notifications'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ContactRef } from '@/lib/contacts/findOrCreate'

type AgentProfile = {
  id: string
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
}

async function notifyAgentOfLead(supabase: SupabaseClient, leadId: string, agentId: string) {
  try {
    const { data: lead } = await supabase
      .from('leads')
      .select('first_name, last_name')
      .eq('id', leadId)
      .single()

    if (lead) {
      const leadName = `${lead.first_name ?? ''} ${lead.last_name || ''}`.trim()
      await broadcastNotification(
        {
          type: 'lead_assigned',
          title: '👤 ¡Nueva Reserva Asignada!',
          body: `Se te ha asignado la reserva de: ${leadName}`,
          link: `/dashboard/leads/${leadId}`,
          lead_id: leadId,
        },
        agentId
      )
    }
  } catch (notifErr) {
    console.error('[Assignment] Error creating notification:', notifErr)
  }
}

/**
 * Lógica centralizada de asignación (Round Robin).
 * Asigna al agente con la asignación más antigua, sin importar si está conectado.
 * Marca el lead como asignado y notifica al agente.
 */
export async function assignLeadToAgent(leadId: string): Promise<AgentProfile | null> {
  const supabase = createAdminClient()

  try {
    const { data: agents, error: agentsError } = await supabase
      .from('profiles')
      .select('id, full_name, first_name, last_name')
      .eq('role', 'agente')
      .eq('disabled', false)
      .order('last_assigned_at', { ascending: true, nullsFirst: true })
      .limit(1)

    if (agentsError) throw agentsError
    if (!agents || agents.length === 0) return null

    const agent = agents[0]
    const now = new Date().toISOString()

    const [{ error: assignError }] = await Promise.all([
      supabase.from('leads').update({ assigned_to: agent.id, updated_at: now }).eq('id', leadId),
      supabase.from('profiles').update({ last_assigned_at: now }).eq('id', agent.id),
    ])

    if (assignError) throw assignError

    await notifyAgentOfLead(supabase, leadId, agent.id)

    return agent
  } catch (error) {
    console.error('[Assignment] Error en el proceso de asignación:', error)
    return null
  }
}

/**
 * Asigna una reserva recién creada respetando el dueño del contacto:
 * - Si el contacto ya tiene agente, la reserva lo hereda (sin Round Robin) y se notifica.
 * - Si el contacto es nuevo (sin agente), se hace Round Robin y se propaga el agente al contacto.
 * Devuelve el perfil del agente (para que el motor de automatización use su nombre real).
 */
export async function assignLeadWithContact(
  leadId: string,
  contact: ContactRef
): Promise<AgentProfile | null> {
  const supabase = createAdminClient()

  // Contacto recurrente con dueño → heredar
  if (contact.assigned_to) {
    try {
      const { data: agent } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name')
        .eq('id', contact.assigned_to)
        .single()

      // Si el agente fue deshabilitado/borrado, caer a Round Robin.
      if (agent) {
        await supabase
          .from('leads')
          .update({ assigned_to: agent.id, updated_at: new Date().toISOString() })
          .eq('id', leadId)
        await notifyAgentOfLead(supabase, leadId, agent.id)
        return agent
      }
    } catch (error) {
      console.error('[Assignment] Error heredando agente del contacto:', error)
    }
  }

  // Contacto nuevo → Round Robin y propagar al contacto
  const agent = await assignLeadToAgent(leadId)
  if (agent) {
    await supabase
      .from('contacts')
      .update({ assigned_to: agent.id, updated_at: new Date().toISOString() })
      .eq('id', contact.id)
  }
  return agent
}
