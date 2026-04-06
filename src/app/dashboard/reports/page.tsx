import { createClient } from '@/utils/supabase/server'
import ReportsClient from './components/ReportsClient'

export const metadata = {
  title: 'Reportes Detallados | Go Easy CRM',
  description: 'Análisis detallado de leads, conversiones e interacciones.',
}

export default async function ReportsPage() {
  const supabase = await createClient()

  // 1. Fetch Status Distribution
  const { data: statusStats } = await supabase
    .from('leads')
    .select('status')

  // 2. Fetch Leads over time (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const { data: leadsOverTime } = await supabase
    .from('leads')
    .select('id, created_at, status, total_amount')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: true })

  // 3. Fetch Category Distribution
  const { data: categoryData } = await supabase
    .from('leads')
    .select('category:categories(name)')
  
  // 4. Fetch Location Distribution
  const { data: locationData } = await supabase
    .from('leads')
    .select('location:locations(name)')

  // 5. Fetch Provider Performance
  const { data: providerData } = await supabase
    .from('leads')
    .select('provider:providers(name), total_amount')
    .not('provider_id', 'is', null)

  // 6. Fetch Message Statistics
  const { data: messageData } = await supabase
    .from('messages')
    .select('direction, created_at')

  return (
    <ReportsClient 
      statusStats={statusStats || []}
      leadsOverTime={leadsOverTime || []}
      categoryData={categoryData || []}
      locationData={locationData || []}
      providerData={providerData || []}
      messageData={messageData || []}
    />
  )
}
