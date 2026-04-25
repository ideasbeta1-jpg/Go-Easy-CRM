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
      .order('last_assigned_at', { ascending: true, nullsFirst: true })
      .limit(1)

    if (agentsError) throw agentsError

    if (!agents || agents.length === 0) {
      console.log(`[Assignment] No hay asesores registrados para asignar el lead ${leadId}`)
      return null
    }

    const agent = agents[0]

    // 3. Asignación del lead
    const { error: assignError } = await supabase
      .from('leads')
      .update({ 
        assigned_to: agent.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)

    if (assignError) throw assignError

    // 4. Actualizar marca de tiempo del agente para Round Robin
    await supabase
      .from('profiles')
      .update({ last_assigned_at: new Date().toISOString() })
      .eq('id', agent.id)

    console.log(`[Assignment] Lead ${leadId} asignado exitosamente a ${agent.full_name}`)

    // Create in-app notification for the assigned agent
    try {
      const { data: lead } = await supabase
        .from('leads')
        .select('first_name, last_name')
        .eq('id', leadId)
        .single()

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
