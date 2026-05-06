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
      console.log('[webrtc-key] Llamando:', url)
      const response = await fetch(url, {
        headers: { Authorization: `${USER_KEY}:${sign}` },
      })

      const text = await response.text()
      console.log('[webrtc-key] Zadarma status:', response.status, 'body:', text)

      const result = JSON.parse(text)
      if (result.status === 'success' && result.key) {
        return NextResponse.json({ key: result.key, sip })
      }
      console.warn('[webrtc-key] Zadarma dynamic key failed:', result.message)
    } catch (err) {
      console.warn('[webrtc-key] Zadarma request error:', err)
    }
  }

  // Fallback: usar contraseña SIP del perfil del usuario
  if (profileForSip?.zadarma_sip_password) {
    console.log('[webrtc-key] Usando contraseña SIP del perfil como fallback')
    return NextResponse.json({ key: profileForSip.zadarma_sip_password, sip })
  }


  return NextResponse.json(
    { error: 'No se pudo obtener la key WebRTC. Configura la contraseña SIP en Ajustes → Usuarios.', sip },
    { status: 400 }
  )
}
