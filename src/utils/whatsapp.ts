import { sendTemplateMessage, sendWABATextMessage } from './waba'

export async function sendWhatsAppMessage(recipient: string, message: string, templateData?: { name: string, language?: string, components?: any[] }) {
  const evolutionUrl = process.env.WHATSAPP_EVOLUTION_URL
  const apiKey = process.env.WHATSAPP_EVOLUTION_KEY
  const instance = process.env.WHATSAPP_EVOLUTION_INSTANCE

  if (templateData) {
    return await sendTemplateMessage(recipient, templateData.name, templateData.language || 'es', templateData.components || [])
  }

  // If they want to use WABA for all text messages:
  if (process.env.WABA_ID) {
    return await sendWABATextMessage(recipient, message)
  }

  // Fallback to Evolution API (if WABA not fully set up)
  if (!evolutionUrl || !apiKey || !instance) {
    console.error('WhatsApp configuration missing')
    return false
  }

  try {
    const response = await fetch(`${evolutionUrl}/message/sendText/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({
        number: recipient,
        options: {
          delay: 1200,
          presence: 'composing',
          linkPreview: false
        },
        textMessage: {
          text: message
        }
      })
    })

    const data = await response.json()
    return response.ok
  } catch (err) {
    console.error('Evolution API Error:', err)
    return false
  }
}
