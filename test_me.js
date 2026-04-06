const ACCESS_TOKEN = 'EAAm4IAnPdWsBRGPv8rFbZAmpCbE6cDK3EA6dCvzZCdddXlS4k7lbi9uv3LCyeUUo53LwuBZBmagHMcFP2jOnM95fHdJMMdj4gOKCfkQpQtOwcU8ZAm0KWfIPuUoKgwBNh8SwQWZB51WvqZB85OAhwqMyEdRKx0WbVGXs15f607fimxQZBFo5y6wtQXK37byFwZDZD';
async function testMe() {
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${ACCESS_TOKEN}`);
    const data = await res.json();
    console.log('Result for /me:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.log('Error:', err.message);
  }
}
testMe();
