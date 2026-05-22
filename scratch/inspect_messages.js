const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oupphpttipkedntaxizk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91cHBocHR0aXBrZWRudGF4aXprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEwNDY4MiwiZXhwIjoyMDg5NjgwNjgyfQ.0U2J2MumDfpJ6xstL_ptVS6pD2vtniIuXKuZXvsAKDc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('--- Inspecting last 20 messages ---');
  const { data: messages, error: err } = await supabase
    .from('messages')
    .select('id, lead_id, content, direction, wamid, status, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (err) {
    console.error('Error:', err);
  } else {
    console.log(JSON.stringify(messages, null, 2));
  }
}

inspect();
