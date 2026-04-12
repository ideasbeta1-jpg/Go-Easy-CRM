import crypto from 'crypto';

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
const TEST_CODE = process.env.FB_TEST_EVENT_CODE;
const API_VERSION = 'v21.0';

/**
 * Hash data using SHA256 (Meta Requirement)
 */
function hash(value: string | undefined): string | null {
  if (!value) return null;
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

export interface MetaUserData {
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  client_ip_address?: string;
  client_user_agent?: string;
  fbp?: string;
  fbc?: string;
}

export interface MetaEventParams {
  eventName: string;
  eventID: string;
  eventSourceUrl?: string;
  userData: MetaUserData;
  customData?: Record<string, any>;
}

/**
 * Sends a server-side event to Meta Conversions API
 */
export async function sendMetaEvent({
  eventName,
  eventID,
  eventSourceUrl,
  userData,
  customData = {}
}: MetaEventParams) {
  if (!FB_ACCESS_TOKEN || !PIXEL_ID) {
    console.warn('[MetaCAPI] Missing FB_ACCESS_TOKEN or NEXT_PUBLIC_FB_PIXEL_ID');
    return null;
  }

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventID,
        event_source_url: eventSourceUrl || 'https://goeasyflorida.com',
        action_source: 'website',
        user_data: {
          em: [hash(userData.email)],
          ph: [hash(userData.phone)],
          fn: [hash(userData.first_name)],
          ln: [hash(userData.last_name)],
          client_ip_address: userData.client_ip_address,
          client_user_agent: userData.client_user_agent,
          fbp: userData.fbp,
          fbc: userData.fbc,
        },
        custom_data: {
          ...customData
        },
      },
    ],
    ...(TEST_CODE ? { test_event_code: TEST_CODE } : {})
  };

  try {
    const response = await fetch(`https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${FB_ACCESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    
    if (result.error) {
      console.error('[MetaCAPI] Error from Meta API:', result.error);
    } else {
      console.log(`[MetaCAPI] Event '${eventName}' sent successfully. Trace ID: ${result.fbtrace_id}`);
    }
    
    return result;
  } catch (error) {
    console.error('[MetaCAPI] Unexpected error:', error);
    return null;
  }
}
