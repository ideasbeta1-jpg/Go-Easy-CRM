import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export const runtime = 'nodejs'

const PHONE_NUMBER_ID = process.env.WABA_PHONE_NUMBER_ID
const ACCESS_TOKEN = process.env.WABA_ACCESS_TOKEN
const VERSION = process.env.WABA_VERSION || 'v21.0'
const BASE_URL = `https://graph.facebook.com/${VERSION}`

const WABA_TYPE: Record<string, string> = {
  'image/': 'image',
  'video/': 'video',
  'audio/': 'audio',
}

function getWabaType(mimeType: string): string {
  for (const [prefix, type] of Object.entries(WABA_TYPE)) {
    if (mimeType.startsWith(prefix)) return type
  }
  return 'document'
}

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/3gpp': '3gp',
    'audio/ogg': 'ogg',
    'audio/mp4': 'mp4',
    'audio/mpeg': 'mp3',
    'application/pdf': 'pdf',
  }
  return map[mimeType] ?? mimeType.split('/')[1] ?? 'bin'
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    return NextResponse.json({ error: 'WABA credentials missing' }, { status: 500 })
  }

  try {
    const formData = await req.formData()
    const mediaFile = formData.get('media') as File | null
    const phone = formData.get('phone') as string | null
    const leadId = formData.get('leadId') as string | null

    if (!mediaFile || !phone || !leadId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const mimeType = mediaFile.type || 'application/octet-stream'
    const wabaType = getWabaType(mimeType)
    const ext = getExtension(mimeType)
    const buffer = await mediaFile.arrayBuffer()

    // 1. Upload to Meta's media API → get media_id
    const metaForm = new FormData()
    metaForm.append('file', new Blob([buffer], { type: mimeType }), `media.${ext}`)
    metaForm.append('type', mimeType)
    metaForm.append('messaging_product', 'whatsapp')

    const uploadRes = await fetch(`${BASE_URL}/${PHONE_NUMBER_ID}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      body: metaForm,
    })

    const uploadData = await uploadRes.json()
    console.log(`[media/send] Meta upload (${uploadRes.status}):`, JSON.stringify(uploadData))

    if (!uploadRes.ok) {
      return NextResponse.json(
        { error: uploadData?.error?.message || 'Media upload to Meta failed' },
        { status: 502 }
      )
    }

    const mediaId = uploadData.id
    if (!mediaId) {
      return NextResponse.json({ error: 'No media ID from Meta' }, { status: 502 })
    }

    // 2. Send WhatsApp message using media_id
    const cleanPhone = (phone.includes(':') || /[a-zA-Z]/.test(phone))
      ? phone
      : phone.replace(/\D/g, '')

    const sendRes = await fetch(`${BASE_URL}/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: wabaType,
        [wabaType]: { id: mediaId },
      }),
    })

    const sendData = await sendRes.json()
    console.log(`[media/send] Meta send (${sendRes.status}):`, JSON.stringify(sendData))

    if (!sendRes.ok) {
      return NextResponse.json(
        { error: sendData?.error?.message || 'Message send failed' },
        { status: 502 }
      )
    }

    // 3. Upload to Supabase storage for CRM display (best-effort)
    const adminSupabase = createAdminClient()
    let mediaUrl: string | null = null
    const timestamp = Date.now()
    const fileName = `${leadId}_${timestamp}.${ext}`

    const { error: storageErr } = await adminSupabase.storage
      .from('chat_media')
      .upload(fileName, buffer, { contentType: mimeType })

    if (!storageErr) {
      const { data } = adminSupabase.storage.from('chat_media').getPublicUrl(fileName)
      mediaUrl = data.publicUrl
    } else {
      console.warn('[media/send] Supabase storage upload failed:', storageErr.message)
    }

    // 4. Save to messages table
    const { data: msgData } = await adminSupabase
      .from('messages')
      .insert({
        lead_id: leadId,
        content: `[${wabaType.charAt(0).toUpperCase() + wabaType.slice(1)}]`,
        direction: 'outbound',
        media_url: mediaUrl,
        media_type: mimeType,
        status: 'sent',
        wamid: sendData.messages?.[0]?.id,
      })
      .select('*')
      .single()

    return NextResponse.json({ ok: true, message: msgData })
  } catch (error: any) {
    console.error('[media/send] Unexpected error:', error?.message || error)
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 })
  }
}
