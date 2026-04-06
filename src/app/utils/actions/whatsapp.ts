'use server'

import { sendWhatsAppMessage } from '@/utils/whatsapp'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function sendManualWhatsApp(phoneNumber: string, message: string, leadId: string) {
  const supabase = await createClient()
  
  // Clean phone number (remove +, spaces, etc if needed by API)
  const cleanPhone = phoneNumber.replace(/\D/g, '')
  
  const success = await sendWhatsAppMessage(cleanPhone, message)
  
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
