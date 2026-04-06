const WABA_ID = '1524524712631949';
const ACCESS_TOKEN = 'EAAm4IAnPdWsBRGPv8rFbZAmpCbE6cDK3EA6dCvzZCdddXlS4k7lbi9uv3LCyeUUo53LwuBZBmagHMcFP2jOnM95fHdJMMdj4gOKCfkQpQtOwcU8ZAm0KWfIPuUoKgwBNh8SwQWZB51WvqZB85OAhwqMyEdRKx0WbVGXs15f607fimxQZBFo5y6wtQXK37byFwZDZD';
const VERSION = 'v19.0';
const url = `https://graph.facebook.com/${VERSION}/${WABA_ID}/message_templates?access_token=${ACCESS_TOKEN}`;

async function testConnection() {
  console.log('Testing Meta WABA connection...');
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (response.ok) {
      console.log('✅ Connection Successful!');
      console.log('Templates found:', data.data?.length || 0);
      if (data.data && data.data.length > 0) {
        console.log('Sample Template Name:', data.data[0].name);
      }
    } else {
      console.log('❌ Connection Failed:', data.error?.message || 'Unknown error');
    }
  } catch (error) {
    console.log('❌ Request Error:', error.message);
  }
}

testConnection();
