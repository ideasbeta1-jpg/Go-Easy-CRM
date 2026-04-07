import { createAdminClient } from './supabase/admin'

/**
 * Lógica centralizada de asignación de leads (Round Robin)
 * 1. Desactiva agentes inactivos (según su inactivity_timeout)
 * 2. Busca al agente activo con la asignación más antigua
 * 3. Asigna el lead y actualiza la marca de tiempo del agente
 */
export async function assignLeadToAgent(leadId: string) {
  const supabase = createAdminClient()

  try {
    // 1. Limpieza de agentes inactivos (Batch update)
    // Desactivamos a cualquiera que haya superado su timeout de inactividad
    await supabase.rpc('cleanup_stale_agents') 
    // Si el RPC no existe aún (lo crearemos en un momento), podemos usar SQL directo
    // Pero por ahora usemos una lógica simple de "sweep" de 1 hora si falla el RPC
    const { error: sweepError } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .match({ is_active: true })
      .filter('last_active_at', 'lt', new Date(Date.now() - 60 * 60 * 1000).toISOString())

    // 2. Selección de agente (Round Robin)
    // Buscamos el agente activo que recibió un lead hace más tiempo
    const { data: agents, error: agentsError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('is_active', true)
      .order('last_assigned_at', { ascending: true })
      .limit(1)

    if (agentsError) throw agentsError

    if (!agents || agents.length === 0) {
      console.log(`[Assignment] No hay agentes activos para asignar el lead ${leadId}`)
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
    return agent

  } catch (error) {
    console.error('[Assignment] Error en el proceso de asignación:', error)
    return null
  }
}
