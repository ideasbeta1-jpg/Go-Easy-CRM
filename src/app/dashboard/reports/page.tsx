import { createClient } from '@/utils/supabase/server'
import ReportsClient from './components/ReportsClient'

export const metadata = {
  title: 'Reportes Detallados | Go Easy CRM',
  description: 'Análisis detallado de leads, conversiones e interacciones.',
}

export default async function ReportsPage() {
  const supabase = await createClient()

  // Fetch all required data in parallel
  const [
    leadsRes,
    messagesRes,
    agentsRes,
    categoriesRes,
    providersRes,
    locationsRes
  ] = await Promise.all([
    supabase
      .from('leads')
      .select(`
        id,
        created_at,
        status,
        total_amount,
        agreed_daily_price,
        pickup_date,
        return_date,
        source,
        utm_source,
        utm_medium,
        utm_campaign,
        category_id,
        category:categories(id, name, daily_price, base_daily_cost),
        pickup_location_id,
        location:locations!leads_pickup_location_id_fkey(id, name),
        provider_id,
        provider:providers(id, name),
        assigned_to
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('messages')
      .select('id, lead_id, direction, created_at')
      .order('created_at', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, first_name, last_name, full_name, avatar_url')
      .order('full_name'),
    supabase
      .from('categories')
      .select('id, name')
      .order('name'),
    supabase
      .from('providers')
      .select('id, name')
      .order('name'),
    supabase
      .from('locations')
      .select('id, name')
      .order('name')
  ])

  return (
    <ReportsClient 
      leads={leadsRes.data || []}
      messages={messagesRes.data || []}
      agents={agentsRes.data || []}
      categories={categoriesRes.data || []}
      providers={providersRes.data || []}
      locations={locationsRes.data || []}
    />
  )
}

