import { createClient } from '@supabase/supabase-js'

export const createAdminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('Missing env var NEXT_PUBLIC_SUPABASE_URL')
  }
  if (!serviceRoleKey) {
    throw new Error('Missing env var SUPABASE_SERVICE_ROLE_KEY (set it in .env.local and restart the dev server)')
  }

  return createClient(url, serviceRoleKey.trim())
}
