import { NextResponse } from 'next/server'
import { buildZadarmaSignature } from '@/lib/zadarma'
import { createClient } from '@/utils/supabase/server'

const USER_KEY = process.env.ZADARMA_USER_KEY!
const BASE_URL = 'https://api.zadarma.com/v1'

/**
 * GET /api/zadarma/webrtc-key
 * Devuelve la clave para el widget WebRTC de Zadarma.
 * Intenta obtener un token dinámico de Zadarma (/v1/webrtc/get_key).
 * Si falla, usa la contraseña SIP del perfil del usuario como fallback.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Obtener SIP del perfil para pasarlo como parámetro a /webrtc/get_key
  const { data: profileForSip } = await supabase
    .from('profiles')
    .select('zadarma_sip, zadarma_sip_password')
    .eq('id', user.id)
    .single()

  const pbxNumber = process.env.ZADARMA_PBX_NUMBER || ''
  const sipExt = profileForSip?.zadarma_sip || ''
  const sip = pbxNumber && sipExt ? `${pbxNumber}-${sipExt}` : sipExt

  // Intentar obtener la key dinámica de Zadarma (requiere sip como parámetro)
  if (sip) {
    try {
      const method = '/webrtc/get_key'
      const params = { sip }
      const sign = buildZadarmaSignature(method, params)
      const qs = new URLSearchParams(params).toString()
      const url = `${BASE_URL}${method}?${qs}`
      const response = await fetch(url, {
        headers: { Authorization: `${USER_KEY}:${sign}` },
      })

      const result = JSON.parse(await response.text())
      if (result.status === 'success' && result.key) {
        return NextResponse.json({ key: result.key, sip })
      }
    } catch {
      // fall through to SIP password fallback
    }
  }

  if (profileForSip?.zadarma_sip_password) {
    return NextResponse.json({ key: profileForSip.zadarma_sip_password, sip })
  }


  return NextResponse.json(
    { error: 'No se pudo obtener la key WebRTC. Configura la contraseña SIP en Ajustes → Usuarios.', sip },
    { status: 400 }
  )
}
