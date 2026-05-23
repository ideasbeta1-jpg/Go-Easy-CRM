import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { writeFile, readFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { promisify } from 'util'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

const execAsync = promisify(exec)
export const runtime = 'nodejs'

const PHONE_NUMBER_ID = process.env.WABA_PHONE_NUMBER_ID
const ACCESS_TOKEN = process.env.WABA_ACCESS_TOKEN
const VERSION = process.env.WABA_VERSION || 'v21.0'
const BASE_URL = `https://graph.facebook.com/${VERSION}`

function getFfmpegPath(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const installer = require('@ffmpeg-installer/ffmpeg')
    return installer.path
  } catch {
    return 'ffmpeg' // fall back to system PATH
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    return NextResponse.json({ error: 'WABA credentials missing' }, { status: 500 })
  }

  let inputPath: string | null = null
  let outputPath: string | null = null

  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File | null
    const phone = formData.get('phone') as string | null
    const leadId = formData.get('leadId') as string | null

    if (!audioFile || !phone || !leadId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const mimeType = audioFile.type || 'audio/webm'
    const timestamp = Date.now()
    let finalBuffer: Buffer
    const finalMime = 'audio/ogg'

    // Always convert to OGG Opus via ffmpeg — Meta reliably accepts this format
    // regardless of what the browser recorded (webm, mp4/AAC, ogg, etc.)
    const rawBuffer = Buffer.from(await audioFile.arrayBuffer())
    const ext_in = mimeType.includes('mp4') ? 'mp4'
      : mimeType.includes('ogg') ? 'ogg'
      : mimeType.includes('mpeg') ? 'mp3'
      : 'webm'
    inputPath = path.join(tmpdir(), `audio_in_${timestamp}.${ext_in}`)
    outputPath = path.join(tmpdir(), `audio_out_${timestamp}.ogg`)
    await writeFile(inputPath, rawBuffer)

    const ffmpegPath = getFfmpegPath()
    try {
      await execAsync(`"${ffmpegPath}" -y -i "${inputPath}" -c:a libopus -b:a 64k "${outputPath}"`)
      finalBuffer = await readFile(outputPath)
    } catch (convErr: any) {
      console.error('[audio/send] ffmpeg conversion failed:', convErr?.message)
      return NextResponse.json(
        { error: 'No se pudo convertir el audio. Verifica que ffmpeg esté instalado en el servidor.' },
        { status: 500 }
      )
    }

    const ext = 'ogg'

    // 1. Upload to Meta's media API → get media_id
    const metaForm = new FormData()
    metaForm.append('file', new Blob([new Uint8Array(finalBuffer)], { type: finalMime }), `audio.${ext}`)
    metaForm.append('type', finalMime)
    metaForm.append('messaging_product', 'whatsapp')

    const uploadRes = await fetch(`${BASE_URL}/${PHONE_NUMBER_ID}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      body: metaForm,
    })

    const uploadData = await uploadRes.json()

    if (!uploadRes.ok) {
      const errMsg = uploadData?.error?.message || JSON.stringify(uploadData)
      return NextResponse.json({ error: errMsg }, { status: 502 })
    }

    const mediaId = uploadData.id
    if (!mediaId) {
      return NextResponse.json({ error: 'No media ID returned from Meta' }, { status: 502 })
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
        type: 'audio',
        audio: { id: mediaId },
      }),
    })

    const sendData = await sendRes.json()

    if (!sendRes.ok) {
      const errMsg = sendData?.error?.message || JSON.stringify(sendData)
      return NextResponse.json({ error: errMsg }, { status: 502 })
    }

    // 3. Upload to Supabase storage for CRM playback (best-effort)
    const adminSupabase = createAdminClient()
    let mediaUrl: string | null = null
    const fileName = `${leadId}_${timestamp}.${ext}`

    const { error: storageErr } = await adminSupabase.storage
      .from('chat_media')
      .upload(fileName, finalBuffer, { contentType: finalMime })

    if (!storageErr) {
      const { data } = adminSupabase.storage.from('chat_media').getPublicUrl(fileName)
      mediaUrl = data.publicUrl
    } else {
      console.warn('[audio/send] Supabase storage upload failed:', storageErr.message)
    }

    // 4. Save message to DB
    const { data: msgData } = await adminSupabase
      .from('messages')
      .insert({
        lead_id: leadId,
        content: '[Audio]',
        direction: 'outbound',
        media_url: mediaUrl,
        media_type: finalMime,
        status: 'sent',
        wamid: sendData.messages?.[0]?.id,
      })
      .select('*')
      .single()

    return NextResponse.json({ ok: true, message: msgData })
  } catch (error: any) {
    console.error('[audio/send] Unexpected error:', error?.message || error)
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 })
  } finally {
    for (const p of [inputPath, outputPath]) {
      if (p) unlink(p).catch(() => {})
    }
  }
}
