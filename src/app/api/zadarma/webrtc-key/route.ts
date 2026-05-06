import { NextResponse } from 'next/server'
import { buildZadarmaSignature } from '@/lib/zadarma'
import { createClient } from '@/utils/supabase/server'

const USER_KEY = process.env.ZADARMA_USER_KEY!
const BASE_URL = 'https://api.zadarma.com/v1'

/**
 * GET /api/zadarma/webrtc-key
 * Genera la clave temporal para el widget WebRTC de Zadarma.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const method = '/webrtc/get_key'
    const sign = buildZadarmaSignature(method, {})
    const url = `${BASE_URL}${method}`

    const response = await fetch(url, {
      headers: {
        Authorization: `${USER_KEY}:${sign}`,
      },
    })

    const text = await response.text()
    console.log('[webrtc-key] Zadarma status:', response.status, 'body:', text)

    let result: Record<string, unknown>
    try {
      result = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: 'Respuesta inválida de Zadarma', raw: text }, { status: 502 })
    }

    if (result.status !== 'success') {
      console.error('[webrtc-key] Zadarma error:', result)
      // Fallback: usar el API user key directamente como widget key
      // (funciona en cuentas donde /webrtc/get_key no está habilitado)
      const fallbackKey = process.env.ZADARMA_USER_KEY
      if (fallbackKey) {
        console.warn('[webrtc-key] Usando user key como fallback')
        return NextResponse.json({ key: fallbackKey })
      }
      return NextResponse.json({ error: result.message || 'Error de Zadarma', detail: result }, { status: 400 })
    }

    return NextResponse.json({ key: result.key })
  } catch (err) {
    console.error('[webrtc-key] Exception:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
