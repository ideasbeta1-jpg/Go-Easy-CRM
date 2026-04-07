const WABA_ID = process.env.WABA_ID;
const PHONE_NUMBER_ID = process.env.WABA_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WABA_ACCESS_TOKEN;
const VERSION = process.env.WABA_VERSION || 'v21.0';
const BASE_URL = `https://graph.facebook.com/${VERSION}`;

export interface WABATemplate {
  name: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  category: string;
  language: string;
  components: any[];
  id: string;
}

/**
 * Fetch all message templates from WABA
 */
export async function getTemplates(): Promise<WABATemplate[]> {
  if (!WABA_ID || !ACCESS_TOKEN) {
    console.error('WABA credentials missing');
    return [];
  }

  try {
    const response = await fetch(
      `${BASE_URL}/${WABA_ID}/message_templates?access_token=${ACCESS_TOKEN}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch templates');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching WABA templates:', error);
    return [];
  }
}

/**
 * Send a template message
 */
export async function sendTemplateMessage(
  recipient: string,
  templateName: string,
  languageCode: string = 'es',
  components: any[] = []
) {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.error('WABA credentials missing');
    return false;
  }

  const cleanRecipient = (recipient.includes(':') || /[a-zA-Z]/.test(recipient))
    ? recipient
    : recipient.replace(/\D/g, '');

  try {
    const response = await fetch(
      `${BASE_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanRecipient,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components: components
          }
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error('WABA Template Error:', data);
    }
    return response.ok;
  } catch (error) {
    console.error('Error sending WABA message:', error);
    return false;
  }
}

/**
 * Send a simple text message via WABA (requires an open 24h window)
 */
export async function sendWABATextMessage(recipient: string, message: string) {
  console.log('[sendWABATextMessage] Starting with recipient:', recipient);
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.error('[sendWABATextMessage] WABA credentials missing');
    return false;
  }

  // Clean recipient — only strip non-digits if it looks like a standard phone (not BSUID)
  const cleanRecipient = (recipient.includes(':') || /[a-zA-Z]/.test(recipient))
    ? recipient
    : recipient.replace(/\D/g, '');

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanRecipient,
    type: 'text',
    text: {
      preview_url: false,
      body: message
    }
  };

  console.log('[sendWABATextMessage] Sending payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(
      `${BASE_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();
    console.log('[sendWABATextMessage] Response status:', response.status, 'data:', data);
    
    if (!response.ok) {
       console.error('[sendWABATextMessage] Error from WABA text message:', data);
    }
    return response.ok;
  } catch (error) {
    console.error('[sendWABATextMessage] Error sending WABA text message:', error);
    return false;
  }
}

/**
 * Create a new message template
 */
export async function createTemplate(templateData: {
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  components: any[];
}) {
  if (!WABA_ID || !ACCESS_TOKEN) {
    console.error('WABA credentials missing');
    return null;
  }

  try {
    const response = await fetch(
      `${BASE_URL}/${WABA_ID}/message_templates`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating WABA template:', error);
    return null;
  }
}

/**
 * Downloads a media file from Meta using its ID and returns a Blob
 */
export async function downloadWABAMedia(mediaId: string): Promise<{ blob: Blob, mimeType: string } | null> {
  console.log('[downloadWABAMedia] Starting for mediaId:', mediaId);
  if (!ACCESS_TOKEN) {
    console.error('[downloadWABAMedia] WABA credentials missing');
    return null;
  }

  try {
    // 1. Get the media URL from Meta
    const metaResponse = await fetch(`${BASE_URL}/${mediaId}`, {
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
    });

    if (!metaResponse.ok) {
      const err = await metaResponse.json();
      console.error('[downloadWABAMedia] Meta metadata error:', err);
      return null;
    }

    const { url, mime_type } = await metaResponse.json();
    console.log('[downloadWABAMedia] Downloading from:', url);

    // 2. Download the actual binary data
    const fileResponse = await fetch(url, {
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
    });

    if (!fileResponse.ok) {
      console.error('[downloadWABAMedia] Meta file download error:', fileResponse.statusText);
      return null;
    }

    const blob = await fileResponse.blob();
    return { blob, mimeType: mime_type };
  } catch (error) {
    console.error('[downloadWABAMedia] Exception:', error);
    return null;
  }
}

/**
 * Send an audio/media message via WABA using a public URL
 */
export async function sendWABAMediaMessage(recipient: string, mediaUrl: string, mediaType: string) {
  console.log('[sendWABAMediaMessage] Starting with recipient:', recipient, 'media:', mediaUrl);
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.error('[sendWABAMediaMessage] WABA credentials missing');
    return false;
  }

  // Determine media type for WABA (e.g. 'audio', 'image', 'document')
  let wabaType = 'document';
  if (mediaType.startsWith('audio/')) wabaType = 'audio';
  if (mediaType.startsWith('image/')) wabaType = 'image';
  if (mediaType.startsWith('video/')) wabaType = 'video';

  // Clean recipient — only strip non-digits if it looks like a standard phone (not BSUID)
  const cleanRecipient = (recipient.includes(':') || /[a-zA-Z]/.test(recipient))
    ? recipient
    : recipient.replace(/\D/g, '');

  // For non-audio media, we use the standard link object
  // For audio, we strictly use the audio object per Meta's specs
  const payload: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanRecipient,
    type: wabaType,
    [wabaType]: {
      link: mediaUrl
    }
  };

  console.log('[sendWABAMediaMessage] Final Payload for Meta:', JSON.stringify(payload));

  try {
    const url = `${BASE_URL}/${PHONE_NUMBER_ID}/messages`;
    const response = await fetch(
      url,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();
    console.log(`[sendWABAMediaMessage] Meta response (${response.status}):`, JSON.stringify(data));
    
    if (!response.ok) {
       console.error('[sendWABAMediaMessage] FAILED payload was:', JSON.stringify(payload));
       console.error('[sendWABAMediaMessage] Endpoint used was:', url);
    }
    return response.ok;
  } catch (error) {
    console.error('[sendWABAMediaMessage] Exception in fetch:', error);
    return false;
  }
}
