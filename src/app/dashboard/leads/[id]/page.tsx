import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import LeadDetailClient from './components/LeadDetailClient'
import { ZadarmaWidget } from '@/components/ZadarmaWidget'

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

  // 2. Fetch related and auxiliary data in parallel
  const [
    categoryRes, 
    providerRes, 
    profileRes,
    categoriesRes,
    allProvidersRes,
    allAgentsRes,
    quotesRes,
    vouchersRes,
    locationsRes,
    providerOfficesRes,
    messagesRes,
    notesRes
  ] = await Promise.all([
    leadRaw.category_id ? supabase.from('categories').select('*').eq('id', leadRaw.category_id).single() : Promise.resolve({ data: null, error: null }),
    leadRaw.provider_id ? supabase.from('providers').select('*').eq('id', leadRaw.provider_id).single() : Promise.resolve({ data: null, error: null }),
    leadRaw.assigned_to ? supabase.from('profiles').select('*').eq('id', leadRaw.assigned_to).single() : Promise.resolve({ data: null, error: null }),
    supabase.from('categories').select('*').order('name'),
    supabase.from('providers').select('*').order('name'),
    supabase.from('profiles').select('*').order('full_name'),
    supabase.from('quotes').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('vouchers').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('locations').select('*').order('name'),
    supabase.from('provider_offices').select('*'),
    supabase.from('messages').select('*', { count: 'exact' }).eq('lead_id', id).order('created_at', { ascending: false }).limit(50),
    supabase.from('lead_notes').select('*, profiles(full_name)').eq('lead_id', id).order('created_at', { ascending: false })
  ])

  const lead = {
    ...leadRaw,
    category: categoryRes.data,
    provider: providerRes.data,
    assigned_to_profile: profileRes.data
  }

  return (
    <>
      <LeadDetailClient
        lead={lead}
        notesError={notesRes.error}
        activeQuote={quotesRes.data?.[0]}
        activeVoucher={vouchersRes.data?.[0]}
        categories={categoriesRes.data || []}
        providers={allProvidersRes.data || []}
        agents={allAgentsRes.data || []}
        locations={locationsRes.data || []}
        providerOffices={providerOfficesRes.data || []}
        messages={(messagesRes.data || []).reverse()}
        totalMessages={messagesRes.count ?? 0}
        leadNotes={notesRes.data || []}
        currentUser={currentUserProfile}
      />
      {currentUserProfile?.zadarma_sip && process.env.ZADARMA_PBX_NUMBER && (
        <ZadarmaWidget
          sipExtension={`${process.env.ZADARMA_PBX_NUMBER}-${currentUserProfile.zadarma_sip}`}
        />
      )}
    </>
  )
}
