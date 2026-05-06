import { NextResponse } from 'next/server'
import { zadarmaRequest } from '@/lib/zadarma'
import { createClient } from '@/utils/supabase/server'

/**
 * GET /api/zadarma/webrtc-key
 * Genera la clave temporal para el widget WebRTC de Zadarma.
 * Debe llamarse server-side en cada carga de página según las instrucciones de Zadarma.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await zadarmaRequest('/webrtc/get_key')
    if ((result as { status?: string }).status !== 'success') {
      return NextResponse.json(
        { error: (result as { message?: string }).message || 'Error obteniendo key' },
        { status: 400 }
      )
    }

    const key = (result as { key?: string }).key
    return NextResponse.json({ key })
  } catch (err) {
    console.error('[webrtc-key]', err)
    return NextResponse.json({ error: 'Error de conexión con Zadarma' }, { status: 500 })
  }
}
