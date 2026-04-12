import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'
import { assignLeadToAgent } from '@/utils/assignment'
import { executeStageAutomation } from '@/utils/automation-engine'
import { broadcastNotification } from '@/app/utils/actions/notifications'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log('--- WhatsApp Webhook received ---', JSON.stringify(body, null, 2))

    // --- HANDLE EVOLUTION API ---
    if (body.event === 'messages.upsert' && body.data) {
      const msgData = body.data
      const fromMe = msgData.key?.fromMe
      if (fromMe === false) {
        const remoteJid = msgData.key?.remoteJid
        const phoneNumber = remoteJid?.split('@')[0]
        const content = msgData.message?.conversation || msgData.message?.extendedTextMessage?.text || 'MMS/Media/Otro'
        const pushName = msgData.pushName || 'WhatsApp Contact'
        
        if (phoneNumber) {
           const leadId = await getOrCreateLead(phoneNumber, pushName, content)
           if (leadId) await storeMessage(leadId, content)
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
               await handleWabaMessage(message, contact)
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

async function handleWabaMedia(mediaId: string, leadId: string) {
  try {
    const { downloadWABAMedia } = await import('@/utils/waba')
    const media = await downloadWABAMedia(mediaId)
    if (!media) return null

    const supabase = createAdminClient()
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

// Meta WABA Loop helper
async function handleWabaMessage(message: any, contact: any) {
  const phoneNumber = message.from
  const pushName = contact?.profile?.name || 'WABA Contact'
  let content = message.text?.body || '[Multimedia]'
  let mediaUrl = null
  let mediaType = null

  // Handle Media
  const mediaObj = message.audio || message.image || message.video || message.document
  if (mediaObj?.id) {
    const leadId = await getOrCreateLead(phoneNumber, pushName, content)
    if (leadId) {
      const mediaResult = await handleWabaMedia(mediaObj.id, leadId)
      if (mediaResult) {
        mediaUrl = mediaResult.url
        mediaType = mediaResult.type
        content = `Media: ${mediaType}`
      }
      await storeMessage(leadId, content, mediaUrl, mediaType)
    }
    return
  }

  // Handle Text
  const leadId = await getOrCreateLead(phoneNumber, pushName, content)
  if (leadId) await storeMessage(leadId, content)
}

async function getOrCreateLead(phoneNumber: string, pushName: string, firstMsg: string) {
  const supabase = createAdminClient()
  const isBSUID = phoneNumber.includes(':') || /[a-z]/i.test(phoneNumber)
  const last10 = phoneNumber.slice(-10)
  const query = isBSUID ? `phone.eq.${phoneNumber}` : `phone.like.%${phoneNumber}%,phone.like.%${last10}%`

  const { data: leads } = await supabase.from('leads').select('id').or(query).limit(1)
  if (leads?.[0]?.id) return leads[0].id

  const { data: newLead } = await supabase.from('leads').insert({
    first_name: pushName,
    last_name: '(WhatsApp)',
    phone: phoneNumber,
    status: 'lead_nuevo',
    notes: `Lead creado desde WhatsApp. Msg: ${firstMsg}`
  }).select('id').single()

  if (newLead?.id) {
    // Intentar asignación automática
    await assignLeadToAgent(newLead.id)
    // Disparar automatización de lead nuevo
    await executeStageAutomation(newLead.id, 'lead_nuevo')
  }

  return newLead?.id || null
}

async function storeMessage(leadId: string, content: string, mediaUrl?: string | null, mediaType?: string | null) {
  const supabase = createAdminClient()
  const result = await supabase.from('messages').insert({
    lead_id: leadId,
    content,
    direction: 'inbound',
    media_url: mediaUrl,
    media_type: mediaType,
    created_at: new Date().toISOString()
  })

  // Broadcast in-app notification for new inbound message
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

// GET handler for Webhook verification (some providers like Meta require this)
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
