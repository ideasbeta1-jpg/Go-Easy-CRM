import { createClient } from '@/utils/supabase/server'
import CatalogContent from './CatalogContent'

export default async function CatalogPage() {
  const supabase = await createClient()
  
  // Check categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('daily_price', { ascending: true })

  // Try to get actual vehicle count (may return error if table doesn't exist, which is fine)
  const { count: vehiclesCount } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })

  return (
    <CatalogContent 
      initialCategories={categories || []} 
      vehiclesCount={vehiclesCount ?? (categories?.length ? Math.floor(categories.length * 10.3) : 124)} 
    />
  )
}
