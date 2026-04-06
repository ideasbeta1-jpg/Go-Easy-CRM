import { createClient } from '@/utils/supabase/server'
import ProvidersContent from './components/ProvidersContent'

export default async function ProvidersPage() {
  const supabase = await createClient()
  const { data: providers } = await supabase
    .from('providers')
    .select('*')
    .order('name', { ascending: true })

  return <ProvidersContent initialProviders={providers || []} />
}

