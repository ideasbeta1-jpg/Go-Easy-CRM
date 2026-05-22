const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oupphpttipkedntaxizk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91cHBocHR0aXBrZWRudGF4aXprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEwNDY4MiwiZXhwIjoyMDg5NjgwNjgyfQ.0U2J2MumDfpJ6xstL_ptVS6pD2vtniIuXKuZXvsAKDc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('--- Inspecting notifications for Felix Gonzalez lead: 6021989c-70bf-44e0-a83a-897c3fc68b93 ---');
  const { data: notifs, error: err } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, body, created_at')
    .eq('lead_id', '6021989c-70bf-44e0-a83a-897c3fc68b93')
    .order('created_at', { ascending: false });

  if (err) {
    console.error('Error:', err);
  } else {
    console.log(JSON.stringify(notifs, null, 2));
  }
}

inspect();
