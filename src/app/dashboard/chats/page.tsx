import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import ChatInboxClient from './components/ChatInboxClient'

import { Suspense } from 'react'

export default async function ChatsPage() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id || '')
    .single()

  const isAdmin = profile?.role === 'admin'

  // Solo los leads más recientes para la barra lateral (alineado con el límite de
  // mensajes de abajo). Antes traía TODOS los leads sin límite en cada carga.
  const { data: leads } = await adminSupabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  // Preview de cada conversación: UN mensaje por lead (el último) vía RPC. Antes
  // se traían los 500 mensajes más recientes y se derivaba el preview en memoria,
  // lo que es ineficiente y se rompe a escala (los 500 más recientes pueden ser
  // todos de unos pocos chats activos, dejando el resto sin preview).
  // La conversación completa se sigue cargando on-demand al seleccionar un lead.
  const leadIds = (leads || []).map(l => l.id)
  const [{ data: recentMessages }, { data: unreadRows }] = await Promise.all([
    leadIds.length > 0
      ? adminSupabase.rpc('get_conversation_previews', { p_lead_ids: leadIds })
      : Promise.resolve({ data: [] as any[] }),
    // Conteo real de no-leídos por conversación (solo filas no leídas → barato).
    adminSupabase.from('messages').select('lead_id').eq('direction', 'inbound').eq('is_read', false),
  ])

  const initialUnreadByLead: Record<string, number> = {}
  ;(unreadRows || []).forEach((m: any) => {
    if (m.lead_id) initialUnreadByLead[m.lead_id] = (initialUnreadByLead[m.lead_id] || 0) + 1
  })

  return (
    <Suspense fallback={
      <div className="h-[calc(100vh-100px)] flex items-center justify-center bg-slate-50/50 rounded-2xl md:rounded-[3rem] border border-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <ChatInboxClient
        initialLeads={leads || []}
        initialMessages={recentMessages || []}
        initialUnreadByLead={initialUnreadByLead}
        currentUserId={user?.id || ''}
        isAdmin={isAdmin}
      />
    </Suspense>
  )
}
