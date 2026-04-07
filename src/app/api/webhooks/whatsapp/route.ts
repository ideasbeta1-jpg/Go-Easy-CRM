import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

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
        if (phoneNumber && content) await processInboundMessage(phoneNumber, content, pushName)
      }
    }

    // --- HANDLE META WABA (OFFICIAL) ---
    if (body.object === 'whatsapp_business_account' && body.entry) {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.value.messages) {
            for (const message of change.value.messages) {
              const phoneNumber = message.from
              const content = message.text?.body || '[Multimedia/Template]'
              const pushName = change.value.contacts?.[0]?.profile?.name || 'WABA Contact'
              if (phoneNumber && content) await processInboundMessage(phoneNumber, content, pushName)
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

async function processInboundMessage(phoneNumber: string, content: string, pushName: string) {
  const supabase = createAdminClient()

  // 1. Try to find an existing lead
  // We check for exact match (best for BSUIDs) or last 10 digits (for flexible phone matching)
  const isBSUID = phoneNumber.includes(':') || /[a-z]/i.test(phoneNumber)
  const last10 = phoneNumber.slice(-10)
  
  const query = isBSUID 
    ? `phone.eq.${phoneNumber}` 
    : `phone.like.%${phoneNumber}%,phone.like.%${last10}%`

  const { data: leads } = await supabase
    .from('leads')
    .select('id, phone')
    .or(query)
    .limit(1)

  let leadId = leads?.[0]?.id

  // 2. If no lead exists, create a new one automatically
  if (!leadId) {
    const { data: newLead, error: createError } = await supabase
      .from('leads')
      .insert({
        first_name: pushName,
        last_name: '(WhatsApp)',
        phone: phoneNumber, // Store the BSUID or standard phone here
        status: 'lead_nuevo',
        notes: `[Sistema] Lead creado desde WhatsApp (${isBSUID ? 'BSUID' : 'Teléfono'}). Primero msg: ${content}`
      })
      .select('id')
      .single()

    if (createError) {
      console.error('Error creating lead from WhatsApp:', createError)
    } else {
      leadId = newLead.id
    }
  }

  // 3. Store the message
  if (leadId) {
    await supabase.from('messages').insert({
      lead_id: leadId,
      content: content,
      direction: 'inbound',
      created_at: new Date().toISOString()
    })
  }
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
