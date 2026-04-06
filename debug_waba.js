const ACCESS_TOKEN = 'EAAm4IAnPdWsBRGPv8rFbZAmpCbE6cDK3EA6dCvzZCdddXlS4k7lbi9uv3LCyeUUo53LwuBZBmagHMcFP2jOnM95fHdJMMdj4gOKCfkQpQtOwcU8ZAm0KWfIPuUoKgwBNh8SwQWZB51WvqZB85OAhwqMyEdRKx0WbVGXs15f607fimxQZBFo5y6wtQXK37byFwZDZD';
const VERSION = 'v19.0';
const PHONE_ID = '1081763288343916';

async function debug() {
  console.log('Debugging IDs...');
  try {
    // Try to get info about the phone number
    const resPhone = await fetch(`https://graph.facebook.com/${VERSION}/${PHONE_ID}?access_token=${ACCESS_TOKEN}`);
    const dataPhone = await resPhone.json();
    console.log('Phone ID Info:', JSON.stringify(dataPhone, null, 2));

    // Try to get WABA accounts associated with the user/system user
    const resMe = await fetch(`https://graph.facebook.com/${VERSION}/me/whatsapp_business_accounts?access_token=${ACCESS_TOKEN}`);
    const dataMe = await resMe.json();
    console.log('WABA Accounts for this token:', JSON.stringify(dataMe, null, 2));

  } catch (err) {
    console.log('Error:', err.message);
  }
}

debug();
