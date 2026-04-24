'use server'

import { sendWhatsAppMessage } from '@/utils/whatsapp'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function sendManualWhatsApp(phoneNumber: string, message: string, leadId: string) {
  const supabase = await createClient()

  const cleanPhone = phoneNumber.includes(':') || /[a-zA-Z]/.test(phoneNumber)
    ? phoneNumber
    : phoneNumber.replace(/\D/g, '')

  const success = await sendWhatsAppMessage(cleanPhone, message)

  if (success) {
    await supabase.from('messages').insert({
      lead_id: leadId,
      content: message,
      direction: 'outbound',
      status: 'sent'
    })
    revalidatePath(`/dashboard/leads/${leadId}`)
    revalidatePath('/dashboard/reports')
  }

  return success
}

export async function sendManualWhatsAppMedia(phoneNumber: string, mediaUrl: string, mediaType: string, leadId: string) {
  const supabase = await createClient()

  const cleanPhone = phoneNumber.includes(':') || /[a-zA-Z]/.test(phoneNumber)
    ? phoneNumber
    : phoneNumber.replace(/\D/g, '')

  const { sendWABAMediaMessage } = await import('@/utils/waba')
  const success = await sendWABAMediaMessage(cleanPhone, mediaUrl, mediaType)

  if (success) {
    await supabase.from('messages').insert({
      lead_id: leadId,
      content: `Media: ${mediaType}`,
      direction: 'outbound',
      media_url: mediaUrl,
      media_type: mediaType,
      status: 'sent'
    })
    revalidatePath(`/dashboard/leads/${leadId}`)
    revalidatePath('/dashboard/reports')
  }

  return success
}

/** Loads paginated messages for a specific conversation */
export async function getLeadMessages(leadId: string, page = 0, pageSize = 50) {
  const adminSupabase = createAdminClient()
  const { data, error } = await adminSupabase
    .from('messages')
    .select('id, lead_id, content, direction, media_url, media_type, is_read, status, wamid, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (error) return { messages: [], hasMore: false }
  const messages = (data || []).reverse()
  return { messages, hasMore: data?.length === pageSize }
}

/** Send a WhatsApp template from the chat with lead variable substitution */
export async function sendTemplateFromChat(
  leadId: string,
  phoneNumber: string,
  templateName: string,
  languageCode: string,
  components: any[]
) {
  const supabase = await createClient()
  const cleanPhone = phoneNumber.includes(':') || /[a-zA-Z]/.test(phoneNumber)
    ? phoneNumber
    : phoneNumber.replace(/\D/g, '')

  const { sendTemplateMessageWithError } = await import('@/utils/waba')
  const result = await sendTemplateMessageWithError(cleanPhone, templateName, languageCode, components)

  if (result.ok) {
    await supabase.from('messages').insert({
      lead_id: leadId,
      content: `[Plantilla: ${templateName}]`,
      direction: 'outbound',
      status: 'sent'
    })
    revalidatePath(`/dashboard/leads/${leadId}`)
  }

  return result
}
