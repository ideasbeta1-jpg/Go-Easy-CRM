import { createAdminClient } from './supabase/admin'
import { broadcastNotification } from '@/app/utils/actions/notifications'

/**
 * Lógica centralizada de asignación de leads (Round Robin)
 * Asigna al agente con la asignación más antigua, sin importar si está conectado.
 */
export async function assignLeadToAgent(leadId: string) {
  const supabase = createAdminClient()

  try {
    // Selección de agente (Round Robin) — todos los asesores, conectados o no
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

    // 3 & 4. Assign lead + update agent Round Robin timestamp in parallel
    const [{ error: assignError }, , { data: lead }] = await Promise.all([
      supabase.from('leads').update({ assigned_to: agent.id, updated_at: now }).eq('id', leadId),
      supabase.from('profiles').update({ last_assigned_at: now }).eq('id', agent.id),
      supabase.from('leads').select('first_name, last_name').eq('id', leadId).single(),
    ])

    if (assignError) throw assignError

    // Create in-app notification for the assigned agent
    try {

      if (lead) {
        const leadName = `${lead.first_name} ${lead.last_name || ''}`.trim()
        await broadcastNotification(
          {
            type: 'lead_assigned',
            title: '👤 ¡Nuevo Lead Asignado!',
            body: `Se te ha asignado el lead: ${leadName}`,
            link: `/dashboard/leads/${leadId}`,
            lead_id: leadId,
          },
          agent.id
        )
      }
    } catch (notifErr) {
      console.error('[Assignment] Error creating notification:', notifErr)
    }

    return agent

  } catch (error) {
    console.error('[Assignment] Error en el proceso de asignación:', error)
    return null
  }
}
