'use server'

import { sendWhatsAppMessage } from '@/utils/whatsapp'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function sendManualWhatsApp(phoneNumber: string, message: string, leadId: string) {
  console.log('[WhatsApp Action] sendManualWhatsApp called:', { phoneNumber, leadId, messagePreview: message.substring(0, 20) })
  const supabase = await createClient()
  
  // Clean phone number (remove +, spaces, etc if needed by API)
  const cleanPhone = phoneNumber.includes(':') || /[a-zA-Z]/.test(phoneNumber)
    ? phoneNumber
    : phoneNumber.replace(/\D/g, '') // Only clean if it looks like a standard phone number
  
  console.log('[WhatsApp Action] Clean phone:', cleanPhone)

  const success = await sendWhatsAppMessage(cleanPhone, message)
  
  console.log('[WhatsApp Action] sendWhatsAppMessage result:', success)
  
  if (success) {
      // Save message in DB for reports
      await supabase.from('messages').insert({
        lead_id: leadId,
        content: message,
        direction: 'outbound'
      })

      revalidatePath(`/dashboard/leads/${leadId}`)
      revalidatePath('/dashboard/reports')
  }
  
  return success
}

export async function sendManualWhatsAppMedia(phoneNumber: string, mediaUrl: string, mediaType: string, leadId: string) {
  console.log('[WhatsApp Action] sendManualWhatsAppMedia called:', { phoneNumber, leadId, mediaUrl, mediaType })
  const supabase = await createClient()
  
  const cleanPhone = phoneNumber.includes(':') || /[a-zA-Z]/.test(phoneNumber)
    ? phoneNumber
    : phoneNumber.replace(/\D/g, '')
  
  // Implemented specifically for WABA. (Evolution fallback for media not included here for brevity)
  const { sendWABAMediaMessage } = await import('@/utils/waba')
  const success = await sendWABAMediaMessage(cleanPhone, mediaUrl, mediaType)
  
  if (success) {
      await supabase.from('messages').insert({
        lead_id: leadId,
        content: `Media: ${mediaType}`, // Text fallback/indicator
        direction: 'outbound',
        media_url: mediaUrl,
        media_type: mediaType
      })

      revalidatePath(`/dashboard/leads/${leadId}`)
      revalidatePath('/dashboard/reports')
  }
  
  return success
}
