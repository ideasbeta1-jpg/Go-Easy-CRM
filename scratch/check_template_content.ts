import { getTemplates } from '../src/utils/waba';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function check() {
  const templates = await getTemplates();
  const target = templates.find(t => t.name === 'cotizacion_enviada');
  if (target) {
    console.log('Template:', target.name);
    console.log('Language:', target.language);
    console.log('Components:', JSON.stringify(target.components, null, 2));
  } else {
    console.log('Template not found');
  }
}

check();
