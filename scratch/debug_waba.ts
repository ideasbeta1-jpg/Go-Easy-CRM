
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const WABA_ID = process.env.WABA_ID;
const ACCESS_TOKEN = process.env.WABA_ACCESS_TOKEN;
const VERSION = process.env.WABA_VERSION || 'v21.0';
const BASE_URL = `https://graph.facebook.com/${VERSION}`;

async function checkTemplates() {
  console.log('Using WABA_ID:', WABA_ID);
  console.log('Using VERSION:', VERSION);
  
  if (!WABA_ID || !ACCESS_TOKEN) {
    console.error('Credentials missing');
    return;
  }

  try {
    const url = `${BASE_URL}/${WABA_ID}/message_templates?access_token=${ACCESS_TOKEN}`;
    console.log('Fetching from URL:', url.replace(ACCESS_TOKEN, '[REDACTED]'));
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('API Error:', JSON.stringify(data, null, 2));
      return;
    }
    
    console.log('Success! Found', data.data.length, 'templates:');
    data.data.forEach((t: any) => {
      console.log(`- ${t.name} (${t.status}) [${t.category}]`);
    });

    // Also check the WABA metadata to see if it's the right account
    const metaUrl = `${BASE_URL}/${WABA_ID}?access_token=${ACCESS_TOKEN}`;
    const metaResponse = await fetch(metaUrl);
    const metaData = await metaResponse.json();
    console.log('\nWABA Account Metadata:', JSON.stringify(metaData, null, 2));

  } catch (error) {
    console.error('Fetch error:', error);
  }
}

checkTemplates();

export {};
