import { NextResponse } from 'next/server'
import { buildZadarmaSignature } from '@/lib/zadarma'
import { createClient } from '@/utils/supabase/server'

const USER_KEY = process.env.ZADARMA_USER_KEY
const SECRET_KEY = process.env.ZADARMA_SECRET_KEY
const BASE_URL = 'https://api.zadarma.com/v1'

// GET /api/zadarma/test — diagnóstico temporal, eliminar después
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const method = '/info/balance/'
  const sign = buildZadarmaSignature(method, {})
  const authHeader = `${USER_KEY}:${sign}`

  const response = await fetch(`${BASE_URL}${method}`, {
    headers: { Authorization: authHeader },
  })

  const text = await response.text()

  return NextResponse.json({
    status: response.status,
    body: text,
    authHeader,
    envVarsPresent: {
      USER_KEY: !!USER_KEY,
      SECRET_KEY: !!SECRET_KEY,
      USER_KEY_length: USER_KEY?.length,
      SECRET_KEY_length: SECRET_KEY?.length,
    },
  })
}
