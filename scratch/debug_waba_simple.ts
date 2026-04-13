
const WABA_ID = "950631641226021";
const ACCESS_TOKEN = "EAAm4IAnPdWsBRGksC5v8ZAlfH2l69a04aDMjoWoykjIaWiuulDLcBnWRlfZC7ijvjFZBpoRKgSyNLscEZCuXW2WPnngoJTZAxZCBcfb8PYsc5auzDrERcvmEFT01tXqG2JZB3bWUxCX2HEg3FFBbOCZCFeTdaSGA7dDKJKutFnm6IswZBajLGKrGZBmwvNKmdTNQZDZD";
const VERSION = 'v21.0';
const BASE_URL = `https://graph.facebook.com/${VERSION}`;

async function checkTemplates() {
  console.log('Using WABA_ID:', WABA_ID);
  
  try {
    const url = `${BASE_URL}/${WABA_ID}/message_templates?access_token=${ACCESS_TOKEN}`;
    console.log('Fetching from URL:', url.replace(ACCESS_TOKEN, '[REDACTED]'));
    
    const response = await fetch(url);
    const data: any = await response.json();
    
    if (!response.ok) {
      console.error('API Error:', JSON.stringify(data, null, 2));
      return;
    }
    
    console.log('Success! Found', data.data.length, 'templates:');
    data.data.forEach((t: any) => {
      console.log(`- ${t.name} (${t.status}) [${t.category}]`);
    });

  } catch (error) {
    console.error('Fetch error:', error);
  }
}

checkTemplates();

export {};
