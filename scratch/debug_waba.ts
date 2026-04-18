import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getTemplates } from '../src/utils/waba';
import { createAdminClient } from '../src/utils/supabase/admin';

async function debug() {
  console.log('--- Checking WABA Templates ---');
  const templates = await getTemplates();
  const voucherTemplate = templates.find(t => t.name === 'voucher_disponible');
  
  if (voucherTemplate) {
    console.log('Template found:', JSON.stringify(voucherTemplate, null, 2));
  } else {
    console.log('CRITICAL: Template "voucher_disponible" NOT found in WABA.');
    console.log('Available templates:', templates.map(t => t.name).join(', '));
  }

  console.log('\n--- Checking Automation Logs for last voucher_enviado ---');
  const supabase = createAdminClient();
  const { data: logs, error } = await supabase
    .from('automation_logs')
    .select('*')
    .eq('stage', 'voucher_enviado')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching logs:', error);
  } else {
    console.log('Recent logs:', JSON.stringify(logs, null, 2));
  }
}

debug().catch(console.error);
