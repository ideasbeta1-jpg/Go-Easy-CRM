const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oupphpttipkedntaxizk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91cHBocHR0aXBrZWRudGF4aXprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEwNDY4MiwiZXhwIjoyMDg5NjgwNjgyfQ.0U2J2MumDfpJ6xstL_ptVS6pD2vtniIuXKuZXvsAKDc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('--- Inspecting automation_logs for reserva_confirmada ---');
  const { data: logs, error: err } = await supabase
    .from('automation_logs')
    .select('id, lead_id, stage, channel, template_name, status, created_at')
    .eq('stage', 'reserva_confirmada')
    .order('created_at', { ascending: false })
    .limit(30);

  if (err) {
    console.error('Error:', err);
  } else {
    console.log(JSON.stringify(logs, null, 2));
  }
}

inspect();
