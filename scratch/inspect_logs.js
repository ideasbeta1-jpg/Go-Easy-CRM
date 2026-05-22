const { createClient } = require('@supabase/supabase-js');

// Load env variables manually
const supabaseUrl = 'https://oupphpttipkedntaxizk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91cHBocHR0aXBrZWRudGF4aXprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEwNDY4MiwiZXhwIjoyMDg5NjgwNjgyfQ.0U2J2MumDfpJ6xstL_ptVS6pD2vtniIuXKuZXvsAKDc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('--- Inspecting automation_logs ---');
  const { data: logs, error: logsErr } = await supabase
    .from('automation_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (logsErr) {
    console.error('Error fetching logs:', logsErr);
  } else {
    console.log(JSON.stringify(logs, null, 2));
  }

  console.log('\n--- Inspecting notifications ---');
  const { data: notifs, error: notifsErr } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (notifsErr) {
    console.error('Error fetching notifications:', notifsErr);
  } else {
    console.log(JSON.stringify(notifs, null, 2));
  }
}

inspect();
