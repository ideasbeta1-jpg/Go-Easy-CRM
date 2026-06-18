import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import LeadDetailClient from './components/LeadDetailClient'
import ContactReservationsBanner from './components/ContactReservationsBanner'
import { ZadarmaWidget } from '@/components/ZadarmaWidget'
import { getTasksForLead } from '@/app/utils/actions/tasks'
import { getCachedCategories, getCachedLocations } from '@/app/utils/actions/cached-data'

export default async function LeadDetailPage({
  params: paramsPromise
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await paramsPromise
  const supabase = await createClient()

  // 0. Usuario autenticado actual
  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentUserProfile } = user
    ? await supabase.from('profiles').select('id, role, zadarma_sip, full_name, avatar_url').eq('id', user.id).single()
    : { data: null }
  
  // 1. Fetch lead first
  const { data: leadRaw, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (leadError || !leadRaw) {
     return notFound()
  }

  // 2. Fetch related and auxiliary data in parallel.
  // categories y locations son datos casi-estáticos: se sirven desde caché
  // (getCachedCategories/getCachedLocations) en lugar de consultarse en cada apertura.
  const [
    categoryRes,
    providerRes,
    profileRes,
    categoriesData,
    allProvidersRes,
    allAgentsRes,
    quotesRes,
    vouchersRes,
    locationsData,
    providerOfficesRes,
    messagesRes,
    notesRes,
    eventsRes,
    tasksRes
  ] = await Promise.all([
    leadRaw.category_id ? supabase.from('categories').select('*').eq('id', leadRaw.category_id).single() : Promise.resolve({ data: null, error: null }),
    leadRaw.provider_id ? supabase.from('providers').select('*').eq('id', leadRaw.provider_id).single() : Promise.resolve({ data: null, error: null }),
    leadRaw.assigned_to ? supabase.from('profiles').select('*').eq('id', leadRaw.assigned_to).single() : Promise.resolve({ data: null, error: null }),
    getCachedCategories(),
    supabase.from('providers').select('*').order('name'),
    supabase.from('profiles').select('*').order('full_name'),
    supabase.from('quotes').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('vouchers').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    getCachedLocations(),
    supabase.from('provider_offices').select('*'),
    // Chat unificado por contacto: hilo completo de la persona a través de sus reservas.
    leadRaw.contact_id
      ? supabase.from('messages').select('*', { count: 'exact' }).eq('contact_id', leadRaw.contact_id).order('created_at', { ascending: false }).limit(50)
      : supabase.from('messages').select('*', { count: 'exact' }).eq('lead_id', id).order('created_at', { ascending: false }).limit(50),
    supabase.from('lead_notes').select('*, profiles(full_name)').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('lead_events').select('*, actor:profiles(full_name, avatar_url)').eq('lead_id', id).order('created_at', { ascending: false }),
    getTasksForLead(id)
  ])

  const lead = {
    ...leadRaw,
    category: categoryRes.data,
    provider: providerRes.data,
    assigned_to_profile: profileRes.data
  }

  // Contacto (persona) y sus otras reservas → historial unificado del cliente
  const [contactRes, siblingsRes] = leadRaw.contact_id
    ? await Promise.all([
        supabase.from('contacts').select('id, first_name, last_name').eq('id', leadRaw.contact_id).single(),
        supabase
          .from('leads')
          .select('id, status, pickup_date, total_amount, created_at')
          .eq('contact_id', leadRaw.contact_id)
          .is('deleted_at', null)
          .neq('id', id)
          .order('created_at', { ascending: false }),
      ])
    : [{ data: null }, { data: [] }]

  // The active quote is the one with is_active=true, falling back to the most recent
  const activeQuote = quotesRes.data?.find((q: any) => q.is_active) ?? quotesRes.data?.[0] ?? null

  return (
    <>
      <ContactReservationsBanner contact={contactRes.data} siblings={siblingsRes.data || []} />
      <LeadDetailClient
        lead={lead}
        notesError={notesRes.error}
        activeQuote={activeQuote}
        allQuotes={quotesRes.data || []}
        activeVoucher={vouchersRes.data?.[0]}
        categories={categoriesData || []}
        providers={allProvidersRes.data || []}
        agents={allAgentsRes.data || []}
        locations={locationsData || []}
        providerOffices={providerOfficesRes.data || []}
        messages={(messagesRes.data || []).reverse()}
        totalMessages={messagesRes.count ?? 0}
        leadNotes={notesRes.data || []}
        leadEvents={eventsRes.data || []}
        allVouchers={vouchersRes.data || []}
        tasks={tasksRes.tasks || []}
        currentUser={currentUserProfile}
      />
      {currentUserProfile?.zadarma_sip && (
        <ZadarmaWidget
          sipExtension={currentUserProfile.zadarma_sip}
          pbxNumber={process.env.ZADARMA_PBX_NUMBER || ''}
        />
      )}
    </>
  )
}
