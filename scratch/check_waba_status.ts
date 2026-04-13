
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkWabaStatus() {
  const token = process.env.WABA_ACCESS_TOKEN;
  const phoneNumberId = process.env.WABA_PHONE_NUMBER_ID;
  const version = process.env.WABA_VERSION || 'v21.0';

  if (!token || !phoneNumberId) {
    console.error('Missing WABA_ACCESS_TOKEN or WABA_PHONE_NUMBER_ID in .env.local');
    return;
  }

  const url = `https://graph.facebook.com/${version}/${phoneNumberId}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    console.log('--- WABO Phone Number Status ---');
    console.log(JSON.stringify(data, null, 2));

    if (data.status === 'PENDING_REGISTRATION') {
      console.log('\n[!] Status is PENDING_REGISTRATION. You need to register the number.');
      console.log('You can do this in the Meta Business Suite (WhatsApp Manager) or via API.');
    }
  } catch (error) {
    console.error('Error fetching status:', error);
  }
}

checkWabaStatus();
