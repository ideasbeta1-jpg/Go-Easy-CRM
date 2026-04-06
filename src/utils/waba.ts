const WABA_ID = process.env.WABA_ID;
const PHONE_NUMBER_ID = process.env.WABA_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WABA_ACCESS_TOKEN;
const VERSION = process.env.WABA_VERSION || 'v19.0';
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
          to: recipient.replace(/\D/g, ''), // Clean non-digits
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
    return response.ok;
  } catch (error) {
    console.error('Error sending WABA message:', error);
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
