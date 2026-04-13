
const PHONE_ID = "1107555149101833";
const ACCESS_TOKEN = "EAAm4IAnPdWsBRGksC5v8ZAlfH2l69a04aDMjoWoykjIaWiuulDLcBnWRlfZC7ijvjFZBpoRKgSyNLscEZCuXW2WPnngoJTZAxZCBcfb8PYsc5auzDrERcvmEFT01tXqG2JZB3bWUxCX2HEg3FFBbOCZCFeTdaSGA7dDKJKutFnm6IswZBajLGKrGZBmwvNKmdTNQZDZD";
const VERSION = 'v21.0';
const BASE_URL = `https://graph.facebook.com/${VERSION}`;

async function checkPhoneWABA() {
  try {
    const url = `${BASE_URL}/${PHONE_ID}?fields=whatsapp_business_account&access_token=${ACCESS_TOKEN}`;
    
    const response = await fetch(url);
    const data: any = await response.json();
    
    if (!response.ok) {
      console.error('API Error:', JSON.stringify(data, null, 2));
      return;
    }
    
    console.log('Phone WABA Info:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('Fetch error:', error);
  }
}

checkPhoneWABA();

export {};
