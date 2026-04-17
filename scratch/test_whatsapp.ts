import { sendTemplateMessage } from '../src/utils/waba';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function test() {
  const recipient = '573152932781';
  const templateName = 'cotizacion_enviada';
  const language = 'en';
  const params = [
    'Test Customer',
    '17 de abril',
    'Miami Intl Airport',
    'https://goeasyflorida.com/q/test'
  ];

  const components = [{
    type: 'body',
    parameters: params.map(p => ({ type: 'text', text: p }))
  }];

  console.log('Sending message to:', recipient);
  console.log('Template:', templateName);
  console.log('Parameters:', params);

  try {
    const success = await sendTemplateMessage(recipient, templateName, language, components);
    console.log('Success:', success);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
