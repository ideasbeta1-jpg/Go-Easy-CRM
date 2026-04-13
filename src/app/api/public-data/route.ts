import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()

    const [categoriesRes, locationsRes, settingsRes] = await Promise.all([
      supabase.from('categories').select('id, name, daily_price, image_url, description').order('daily_price'),
      // Only get locations that have at least one provider associated (via provider_offices)
      supabase
        .from('locations')
        .select(`
          id,
          name,
          code,
          type,
          provider_offices!inner (id)
        `)
        .order('name', { ascending: true }),
      supabase.from('system_settings').select('*').eq('id', 1).single(),
    ])

    if (categoriesRes.error) throw categoriesRes.error
    if (locationsRes.error) throw locationsRes.error
    // settings might be null if not configured, but we shouldn't throw if it's just missing
    
    // Since we use !inner join, only locations with at least one provider_office are returned.
    // We deduplicate by ID just in case.
    const uniqueLocations = Array.from(new Map(locationsRes.data.map(item => [item.id, item])).values())
      .map(loc => ({
        id: loc.id,
        name: loc.name,
        code: loc.code,
        type: loc.type
      }))

    return NextResponse.json({
      categories: categoriesRes.data,
      locations: uniqueLocations,
      settings: settingsRes.data || null,
    })
  } catch (err) {
    console.error('Error fetching public data:', err)
    return NextResponse.json({ error: 'Error cargando datos.' }, { status: 500 })
  }
}
