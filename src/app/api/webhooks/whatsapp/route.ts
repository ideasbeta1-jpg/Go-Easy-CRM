import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'
import { assignLeadWithContact } from '@/utils/assignment'
import { executeStageAutomation } from '@/utils/automation-engine'
import { broadcastNotification } from '@/app/utils/actions/notifications'
import { findOrCreateContact } from '@/lib/contacts/findOrCreate'
import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()

    // Verify Meta WABA signature (X-Hub-Signature-256)
    const appSecret = process.env.WABA_APP_SECRET
    if (appSecret) {
      const signature = req.headers.get('x-hub-signature-256')
      const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`
      if (!signature || signature !== expected) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
      }
    }

    const body = JSON.parse(rawBody)
    const supabase = createAdminClient()

    // --- HANDLE EVOLUTION API ---
    if (body.event === 'messages.upsert' && body.data) {
      const msgData = body.data
      const fromMe = msgData.key?.fromMe
      if (fromMe === false) {
        const remoteJid = msgData.key?.remoteJid
        const phoneNumber = remoteJid?.split('@')[0]
        const content = msgData.message?.conversation ||
                        msgData.message?.extendedTextMessage?.text ||
                        msgData.message?.templateButtonReplyMessage?.selectedDisplayText ||
                        msgData.message?.buttonsResponseMessage?.selectedDisplayText ||
                        msgData.message?.listResponseMessage?.title ||
                        'MMS/Media/Otro'
        const pushName = msgData.pushName || 'WhatsApp Contact'
        const wamid = msgData.key?.id || null

        if (phoneNumber) {
           const leadId = await getOrCreateLead(supabase, phoneNumber, pushName, content)
           if (leadId) await storeMessage(supabase, leadId, content, null, null, wamid)
        }
      }
    }

    // --- HANDLE META WABA (OFFICIAL) ---
    if (body.object === 'whatsapp_business_account' && body.entry) {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.value.messages) {
            for (const message of change.value.messages) {
               const contact = change.value.contacts?.[0]
               await handleWabaMessage(supabase, message, contact)
            }
          }
          if (change.value.statuses) {
            for (const statusUpdate of change.value.statuses) {
              await handleWabaStatus(supabase, statusUpdate)
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

async function handleWabaStatus(supabase: SupabaseClient, statusUpdate: any) {
  const { id: wamid, status } = statusUpdate
  if (!wamid || !status) return

  const statusOrder: Record<string, number> = { sent: 1, delivered: 2, read: 3, failed: 0 }
  const newRank = statusOrder[status] ?? -1
  if (newRank < 0) return

  const { data: existing } = await supabase
    .from('messages')
    .select('id, status')
    .eq('wamid', wamid)
    .maybeSingle()

  if (!existing) return

  const currentRank = statusOrder[existing.status ?? 'sent'] ?? 1
  if (newRank > currentRank) {
    await supabase.from('messages').update({ status }).eq('id', existing.id)
  }
}

async function handleWabaMedia(supabase: SupabaseClient, mediaId: string, leadId: string) {
  try {
    const { downloadWABAMedia } = await import('@/utils/waba')
    const media = await downloadWABAMedia(mediaId)
    if (!media) return null

    const extension = media.mimeType.split('/')[1]?.split(';')[0] || 'bin'
    const fileName = `inbound_${leadId}_${Date.now()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('chat_media')
      .upload(fileName, media.blob, { contentType: media.mimeType })

    if (uploadError) throw uploadError

    const { data: publicUrlData } = supabase.storage.from('chat_media').getPublicUrl(fileName)
    return { url: publicUrlData.publicUrl, type: media.mimeType }
  } catch (error) {
    console.error('[handleWabaMedia] Error:', error)
    return null
  }
}

async function handleWabaMessage(supabase: SupabaseClient, message: any, contact: any) {
  const phoneNumber = message.from
  const pushName = contact?.profile?.name || 'WABA Contact'
  const wamid = message.id || null

  if (wamid) {
    const { data: existing } = await supabase
      .from('messages')
      .select('id')
      .eq('wamid', wamid)
      .maybeSingle()
    if (existing) {
      console.log('[handleWabaMessage] Duplicate wamid, skipping:', wamid)
      return
    }
  }

  let content = message.text?.body ||
                message.interactive?.button_reply?.title ||
                message.interactive?.list_reply?.title ||
                message.button?.text ||
                null
  let mediaUrl = null
  let mediaType = null

  const mediaObj = message.audio || message.image || message.video || message.document
  if (mediaObj?.id) {
    const leadId = await getOrCreateLead(supabase, phoneNumber, pushName, content || '[Media]')
    if (leadId) {
      const mediaResult = await handleWabaMedia(supabase, mediaObj.id, leadId)
      if (mediaResult) {
        mediaUrl = mediaResult.url
        mediaType = mediaResult.type
      }
      if (!content) {
        if (message.image) content = '[Imagen]'
        else if (message.video) content = '[Video]'
        else if (message.audio) content = '[Audio]'
        else if (message.document) content = message.document.filename || '[Documento]'
        else content = '[Multimedia]'
      }
      await storeMessage(supabase, leadId, content, mediaUrl, mediaType, wamid)
    }
    return
  }

  if (!content) content = '[Mensaje]'
  const leadId = await getOrCreateLead(supabase, phoneNumber, pushName, content)
  if (leadId) await storeMessage(supabase, leadId, content, null, null, wamid)
}

async function getOrCreateLead(supabase: SupabaseClient, phoneNumber: string, pushName: string, firstMsg: string) {
  // La conversación es con la PERSONA (contacto). Buscamos/creamos el contacto por teléfono…
  const contact = await findOrCreateContact(supabase, {
    first_name: pushName,
    last_name: '(WhatsApp)',
    phone: phoneNumber,
  })
  if (!contact) return null

  // …y adjuntamos el mensaje a su reserva más reciente (no borrada). Evita inundar el Kanban
  // con una reserva nueva por cada mensaje de un cliente existente.
  const { data: existingLeads } = await supabase
    .from('leads')
    .select('id')
    .eq('contact_id', contact.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)

  if (existingLeads?.[0]?.id) return existingLeads[0].id

  // Sin reservas previas → crear la primera para este contacto.
  const { data: newLead } = await supabase.from('leads').insert({
    contact_id: contact.id,
    first_name: pushName,
    last_name: '(WhatsApp)',
    phone: phoneNumber,
    status: 'lead_nuevo',
    notes: `Lead creado desde WhatsApp. Msg: ${firstMsg}`
  }).select('id').single()

  if (newLead?.id) {
    const assignedAgent = await assignLeadWithContact(newLead.id, contact)
    await executeStageAutomation(newLead.id, 'lead_nuevo', assignedAgent ? { assigned_agent: assignedAgent } : {})
  }

  return newLead?.id || null
}

async function storeMessage(
  supabase: SupabaseClient,
  leadId: string,
  content: string,
  mediaUrl?: string | null,
  mediaType?: string | null,
  wamid?: string | null
) {
  const result = await supabase.from('messages').insert({
    lead_id: leadId,
    content,
    direction: 'inbound',
    media_url: mediaUrl,
    media_type: mediaType,
    wamid: wamid || null,
    status: 'sent',
    created_at: new Date().toISOString()
  })

  try {
    const { data: lead } = await supabase
      .from('leads')
      .select('first_name, last_name, assigned_to')
      .eq('id', leadId)
      .single()

    if (lead) {
      const senderName = `${lead.first_name} ${lead.last_name || ''}`.trim()
      const preview = (content || 'Mensaje multimedia').substring(0, 60)
      await broadcastNotification(
        {
          type: 'new_message',
          title: `💬 Mensaje de ${senderName}`,
          body: preview,
          link: `/dashboard/chats?leadId=${leadId}`,
          lead_id: leadId,
        },
        lead.assigned_to || null
      )
    }
  } catch (notifErr) {
    console.error('[storeMessage] Error broadcasting notification:', notifErr)
  }

  return result
}

// GET handler for Webhook verification
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.WABA_VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED')
      return new Response(challenge, { status: 200 })
    } else {
      return new Response(null, { status: 403 })
    }
  }
}
