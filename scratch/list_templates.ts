import { getTemplates } from '../src/utils/waba';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function check() {
  const templates = await getTemplates();
  console.log('Total templates found:', templates.length);
  templates.forEach(t => {
    console.log(`- ${t.name} (${t.language}) [${t.status}]`);
  });
}

check();
